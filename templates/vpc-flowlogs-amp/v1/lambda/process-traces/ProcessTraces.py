"""Copies what X-Ray knows about each edge between services into an Amazon Managed
Service for Prometheus workspace: one sample per edge, per metric and per closed
block of time.

Sibling of ProcessFlowLogs, with the same conventions: configuration from environment
variables with built-in defaults, wired resources arriving through the names the
generator exports, plain print() for logging, and remote write encoded by hand, so
the directory zips as it is with no dependency outside the runtime.

WHY COPY INSTEAD OF READING X-RAY WHEN THE DIAGRAM DRAWS. Three limits of the X-Ray
read APIs, measured on 2026-09-25 and absent from the API reference:
GetServiceGraph refuses a window longer than 6 hours; GetTimeSeriesServiceStatistics
refuses one longer than 24 hours and any period other than 60 or 300 seconds; and the
numbers of each edge take a call of their own. The diagram offers ranges up to a week
and reads again every minute. Read once per block here and kept in the workspace, a
week becomes one PromQL query -- the kind the Traffic layer already makes, through
the same agent call.

WHAT ONE RUN DOES, for each X-Ray group it is given:

  1. GetServiceGraph over the block, to learn WHICH edges exist. Never for their
     numbers: two adjacent graph windows count the same request in both. Three
     traces at 22:59:48-50Z were counted in [22:59:52, 23:00) and again in
     [23:00, 23:01).
  2. GetTimeSeriesServiceStatistics per edge with Period equal to the block, for
     the numbers. Its points partition time, and each is stamped with the END of
     its period: four traces between 22:59:05 and 22:59:50Z came back as one point
     at 23:00:00, at both periods.
  3. The Name tag of the resource behind each end, read from the ARN that the X-Ray
     name, type, region and account spell out.
  4. remote_write, each sample at the end of its block.

A run covers one block, chosen from the time the schedule FIRED rather than the time
the run started. That is what makes this the only writer of each block, the property
ProcessFlowLogs lacks.

WHAT IT LEAVES OUT. It reads no individual trace, and it keeps no state between runs:
a block whose run failed three times is not written, and the next run does not go
back for it. An event with `blocks` reads several at once, for catching up by hand.
"""

import datetime
import json
import os
import re
import struct
import time
import urllib.error
import urllib.request
from collections import defaultdict

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.config import Config

# --- configuration ---------------------------------------------------------------

WORKSPACE_ENDPOINT = (
    os.environ.get('AWS_PROMETHEUS_WORKSPACE_ENDPOINT_0')
    or os.environ.get('AWS_PROMETHEUS_WORKSPACE_TARGET_ENDPOINT_0')
    or os.environ.get('PROMETHEUS_ENDPOINT', '')
)

# Where this function runs. Groups named without a region are read here.
REGION = os.environ.get('AWS_REGION', 'us-east-1')

# The account every series belongs to, for the reason ProcessFlowLogs gives: a
# workspace accepts remote_write from any account, and without this label two
# accounts naming a box the same way would add up in one series. When the generator
# does not set it, the run takes it from its own ARN (see `own_account`).
ACCOUNT = os.environ.get('ACCOUNT', '')

# The block, in seconds. Only 300 or 60: they are the only two periods
# GetTimeSeriesServiceStatistics accepts. The schedule must fire once per block.
#
# 300 is the default because the workspace bills per sample, and an edge busy every
# minute writes five times as many samples at 60. The reader steps its queries by the
# block the aggregator declares (`struct8_trace_bucket_seconds`), so the diagram draws
# one point per block at any range.
BUCKET_SECONDS = int(os.environ.get('BUCKET_SECONDS', '300'))
if BUCKET_SECONDS not in (60, 300):
    print('BUCKET_SECONDS=' + str(BUCKET_SECONDS) + ' is not 60 or 300; using 300')
    BUCKET_SECONDS = 300

# How long after a block closes it is read. X-Ray takes a while to place a segment in
# the graph, and a block read too early is written short and never corrected: no
# run reads it again.
#
# 120 IS NOT MEASURED. Measure how long a block's numbers keep changing, by reading
# the same block at +1, +2, +5 and +10 minutes, and set this past that.
#
# A LONGER WAIT DOES NOT RUN INTO THE TEN-MINUTE LIMIT ProcessFlowLogs documents. That
# limit applies to a sample older than the newest sample of its OWN series. Each
# block here is newer than the one before, so every sample arrives in order, and the
# bound is the workspace's `timestamp too old` check instead: a sample 59 minutes old
# was refused on 2026-09-23.
SETTLE_SECONDS = int(os.environ.get('SETTLE_SECONDS', '120'))

# How close to a block boundary the schedule may fire before the run says so. See
# `blocks_to_read`.
EDGE_MARGIN_SECONDS = 20

# The most edges read per group and block. Each edge is one X-Ray call and about 15
# samples, so this caps both. The busiest edges of the graph are the ones kept.
MAX_EDGES_PER_GROUP = int(os.environ.get('MAX_EDGES_PER_GROUP', '300'))

# How long a resource's Name tag, and the id of a REST API, are trusted before being
# read again. A warm container keeps both between runs; a box renamed on the diagram
# shows under its new name within this time.
NAME_TTL_SECONDS = int(os.environ.get('NAME_TTL_SECONDS', '600'))

# GetServiceGraph refuses a window longer than 6 hours, and one graph call covers
# every block a run reads.
MAX_CATCH_UP_BLOCKS = 6 * 3600 // BUCKET_SECONDS

# Time kept back from the Lambda timeout: an edge is not started with less than this.
TIME_RESERVE_MS = 15000

# Series per remote_write request.
SERIES_PER_REQUEST = 500

# The group read when the function is given none: every trace of the region.
DEFAULT_GROUP = 'Default'

METRIC_REQUESTS = 'struct8_trace_requests'
METRIC_ERRORS = 'struct8_trace_errors'        # 4xx: the caller's fault
METRIC_FAULTS = 'struct8_trace_faults'        # 5xx: the callee's fault
METRIC_THROTTLES = 'struct8_trace_throttles'  # 429, also counted in errors
METRIC_SECONDS_SUM = 'struct8_trace_response_seconds_sum'
METRIC_SECONDS_COUNT = 'struct8_trace_response_seconds_count'
METRIC_SECONDS_BUCKET = 'struct8_trace_response_seconds_bucket'
# The block the metrics above were written with. See `diagnostic_series`.
METRIC_BUCKET_SECONDS = 'struct8_trace_bucket_seconds'

# Upper bounds of the response time histogram, in seconds. Fixed, so blocks add up:
# `histogram_quantile` over `sum_over_time` of these gives a correct p95 at any
# step, and a p95 computed per block could not be combined across blocks.
LE_BOUNDS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

# Retries with backoff on throttling. AWS publishes no call rate for these reads; 750
# calls in 4 minutes went through without a refusal on 2026-09-26.
RETRIES = Config(retries={'mode': 'standard', 'max_attempts': 5},
                 connect_timeout=5, read_timeout=20)

_clients = {}


def client(service, region):
    """One client per service and region, kept for the life of the container."""
    key = (service, region)
    if key not in _clients:
        _clients[key] = boto3.client(service, region_name=region, config=RETRIES)
    return _clients[key]


# --- which groups, in which regions -----------------------------------------------

_REGION_NAME = re.compile(r'^[a-z]{2}(-[a-z]+)+-\d+$')
# What the generator writes for a wire from this function to an X-Ray group:
# <TARGET_TYPE>_NAME_<label>, holding the group's name.
_GROUP_WIRE = re.compile(r'^AWS_XRAY_GROUP(?:_TARGET)?_NAME_\w+$')


def groups_to_read(environ=None, home=None):
    """[(region, group)], in order and without repeats.

    Two sources, both optional:

    - `XRAY_GROUPS`: entries separated by commas or spaces, each `region/group`, or
      just `group` for this function's region. It is how a group in another region
      is named.
    - Any `AWS_XRAY_GROUP_NAME_<label>`: a group in this function's region.

    With neither, the run reads `Default` in its own region: every trace there.
    """
    environ = os.environ if environ is None else environ
    home = home or REGION
    found = []
    for entry in re.split(r'[\s,]+', environ.get('XRAY_GROUPS', '').strip()):
        if not entry:
            continue
        region, _, group = entry.rpartition('/')
        region = region or home
        if not group or not _REGION_NAME.match(region):
            print('XRAY_GROUPS entry skipped, not region/group: ' + entry)
            continue
        found.append((region, group))
    for name in sorted(environ):
        if _GROUP_WIRE.match(name) and environ[name].strip():
            found.append((home, environ[name].strip()))
    if not found:
        found.append((home, DEFAULT_GROUP))

    out = []
    for pair in found:
        if pair not in out:
            out.append(pair)
    return out


# --- which block ------------------------------------------------------------------

def parse_instant(raw):
    """Seconds since the epoch, from an ISO 8601 string or a number. None otherwise.

    A number above 10^12 is taken as milliseconds.
    """
    if raw is None or isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        return raw / 1000.0 if raw > 1e12 else float(raw)
    if isinstance(raw, str):
        try:
            parsed = datetime.datetime.fromisoformat(raw.strip().replace('Z', '+00:00'))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=datetime.timezone.utc)
        return parsed.timestamp()
    return None


def floor_to_block(moment):
    return int(moment // BUCKET_SECONDS) * BUCKET_SECONDS


def blocks_to_read(event, now, diagnostics):
    """(end of the newest block to read, how many blocks), in epoch seconds.

    THE BLOCK COMES FROM THE TIME THE SCHEDULE FIRED, NOT THE TIME THE RUN STARTED.
    An EventBridge rule puts that time in the event's `time`, and an EventBridge
    Scheduler target can put `<aws.scheduler.scheduled-time>` there. Two firings one
    block apart then map to two consecutive blocks, whatever delay each run had
    before starting. A retry of the same event reads the same block and writes the
    same instants.

    Without `time` the clock is used. That is right as long as the schedule fires
    away from a block boundary, minus `SETTLE_SECONDS`: a run that fires at the
    boundary can read the same block twice, or skip one, depending on a few seconds
    of delay. A `cron(0/5 * * * ? *)` schedule with the default settle fires two
    minutes or more away from any boundary. A firing closer than `EDGE_MARGIN_SECONDS` is
    counted as `schedule_near_block_edge`.

    By hand: `block_end` names the block (rounded down to a boundary), and `blocks`
    reads that many, up to the 6 hours one graph call can cover.
    """
    blocks = 1
    if event.get('blocks') is not None:
        try:
            blocks = int(event['blocks'])
        except (TypeError, ValueError):
            blocks = 1
        blocks = max(1, min(blocks, MAX_CATCH_UP_BLOCKS))

    newest_closed = floor_to_block(now - SETTLE_SECONDS)

    explicit = parse_instant(event.get('block_end'))
    if explicit is not None:
        # Never a block that has not settled yet: it would be written short.
        return min(floor_to_block(explicit), newest_closed), blocks

    fired = parse_instant(event.get('time'))
    moment = (fired if fired is not None else now) - SETTLE_SECONDS
    into = moment % BUCKET_SECONDS
    if into < EDGE_MARGIN_SECONDS or into > BUCKET_SECONDS - EDGE_MARGIN_SECONDS:
        diagnostics['schedule_near_block_edge'] += 1
        print('The schedule fires ' + str(int(into)) + ' s from a block boundary, after the '
              + str(SETTLE_SECONDS) + ' s settle: a delayed run may read the wrong block.')
    return floor_to_block(moment), blocks


# --- naming each end --------------------------------------------------------------

# The type an X-Ray node carries -> the `src_type`/`dst_type` written. The same words
# ProcessFlowLogs uses where the two overlap (`lambda`). A type not listed is written
# as its own name in lower case, `AWS::` removed: `AWS::DynamoDB` -> `dynamodb`.
KIND_BY_XRAY_TYPE = {
    'AWS::Lambda': 'lambda',
    'AWS::Lambda::Function': 'lambda',
    'AWS::ApiGateway::Stage': 'api_gateway_stage',
    'AWS::DynamoDB::Table': 'dynamodb_table',
    'AWS::S3::Bucket': 's3_bucket',
    'AWS::SQS::Queue': 'sqs_queue',
    'AWS::SNS::Topic': 'sns_topic',
    'AWS::StepFunctions::StateMachine': 'state_machine',
    'AWS::EC2::Instance': 'instance',
    'AWS::ECS::Container': 'ecs_container',
    'client': 'client',
    'remote': 'remote',
}


def kind_of(xray_type):
    if xray_type in KIND_BY_XRAY_TYPE:
        return KIND_BY_XRAY_TYPE[xray_type]
    slug = re.sub(r'[^a-z0-9]+', '_', (xray_type or '').lower()).strip('_')
    if slug.startswith('aws_'):
        slug = slug[4:]
    return slug or 'unknown'


def partition_of(region):
    if region.startswith('cn-'):
        return 'aws-cn'
    if region.startswith('us-gov-'):
        return 'aws-us-gov'
    return 'aws'


_rest_apis = {}


def rest_api_ids(region, diagnostics):
    """{REST API name: [ids]} for a region. Cached for `NAME_TTL_SECONDS`.

    An API Gateway stage reaches the graph as `<API name>/<stage name>`, and its ARN
    needs the API's id, which the name does not carry. Two APIs can share a name; the
    caller then gives up on the ARN rather than pick one.
    """
    cached = _rest_apis.get(region)
    if cached and cached[1] > time.time():
        return cached[0]
    ids = defaultdict(list)
    try:
        paginator = client('apigateway', region).get_paginator('get_rest_apis')
        for page in paginator.paginate():
            for item in page.get('items', []):
                ids[item.get('name', '')].append(item.get('id', ''))
    except Exception as error:  # noqa: BLE001 -- the name is still written without it
        diagnostics['api_reads_failed'] += 1
        print('apigateway:GetRestApis failed in ' + region + ': ' + str(error))
        return {}
    _rest_apis[region] = (dict(ids), time.time() + NAME_TTL_SECONDS)
    return dict(ids)


def arn_of(service, region, account, diagnostics):
    """The ARN of the resource an X-Ray node stands for, or '' when it cannot be
    spelled out from the node alone.

    Built only for the types whose X-Ray name is the resource's own name. A node of
    another type keeps its X-Ray name and no ARN.
    """
    xray_type = service.get('Type', '')
    name = service.get('Name', '')
    owner = service.get('AccountId') or account
    partition = partition_of(region)
    if not name:
        return ''
    if xray_type == 'AWS::S3::Bucket':
        return 'arn:%s:s3:::%s' % (partition, name)
    if not owner:
        return ''
    if xray_type in ('AWS::Lambda', 'AWS::Lambda::Function'):
        return 'arn:%s:lambda:%s:%s:function:%s' % (partition, region, owner, name)
    if xray_type == 'AWS::DynamoDB::Table':
        return 'arn:%s:dynamodb:%s:%s:table/%s' % (partition, region, owner, name)
    if xray_type == 'AWS::SQS::Queue':
        return 'arn:%s:sqs:%s:%s:%s' % (partition, region, owner, name)
    if xray_type == 'AWS::SNS::Topic':
        return 'arn:%s:sns:%s:%s:%s' % (partition, region, owner, name)
    if xray_type == 'AWS::StepFunctions::StateMachine':
        return 'arn:%s:states:%s:%s:stateMachine:%s' % (partition, region, owner, name)
    if xray_type == 'AWS::ApiGateway::Stage':
        api, _, stage = name.rpartition('/')
        # Another account's APIs are not listed from this one.
        ids = rest_api_ids(region, diagnostics).get(api, []) if owner == account else []
        if len(ids) == 1 and stage:
            return 'arn:%s:apigateway:%s::/restapis/%s/stages/%s' % (partition, region, ids[0], stage)
        diagnostics['stages_without_arn'] += 1
        return ''
    return ''


def own_name(service):
    """The resource's own name, the fallback when it carries no Name tag. For a stage
    that is the part after the slash; the API's name is on another box."""
    name = service.get('Name', '')
    if service.get('Type') == 'AWS::ApiGateway::Stage':
        return name.rpartition('/')[2] or name
    return name


def _name_tag(tags):
    for tag in tags or []:
        if tag.get('Key') == 'Name' and tag.get('Value'):
            return tag['Value']
    return None


_name_by_arn = {}


def name_tags(region, arns, diagnostics):
    """{ARN: Name tag} for the ARNs that carry one, through `tag:GetResources`.

    The Name tag is the box's logical name, and it is what identifies an end, for the
    reason ProcessFlowLogs gives: it survives the resource being replaced. It also
    differs from the resource's name wherever the generator adds to it, like a bucket
    in an account-regional namespace.

    An ARN the call does not return is cached as nameless: that is the call's answer
    for a resource that has no tags or does not exist. A call that FAILED is not
    cached, so the next run asks again.
    """
    now = time.time()
    wanted = [arn for arn in arns if arn not in _name_by_arn or _name_by_arn[arn][1] <= now]
    for i in range(0, len(wanted), 100):
        chunk = wanted[i:i + 100]
        try:
            answer = client('resourcegroupstaggingapi', region).get_resources(ResourceARNList=chunk)
        except Exception as error:  # noqa: BLE001 -- the end keeps its own name
            diagnostics['tag_reads_failed'] += 1
            print('tag:GetResources failed in ' + region + ': ' + str(error))
            continue
        found = {}
        for mapping in answer.get('ResourceTagMappingList', []):
            found[mapping.get('ResourceARN')] = _name_tag(mapping.get('Tags'))
        for arn in chunk:
            _name_by_arn[arn] = (found.get(arn), now + NAME_TTL_SECONDS)
    return {arn: _name_by_arn[arn][0] for arn in arns
            if arn in _name_by_arn and _name_by_arn[arn][0]}


def describe_ends(services, region, account, diagnostics):
    """{ReferenceId: {'name', 'type', 'arn'}} for every node of a graph.

    `client` is the caller from outside, and X-Ray gives it the SAME name as the
    node it calls (measured: `xray-demo-api/prod`, type `client`). Written with that
    name it would land on the stage's box, so it is written as `client`.
    """
    arns = {}
    for service in services:
        arns[service['ReferenceId']] = arn_of(service, region, account, diagnostics)
    readable = [arn for ref, arn in arns.items() if arn]
    tags = name_tags(region, sorted(set(readable)), diagnostics)

    ends = {}
    for service in services:
        ref = service['ReferenceId']
        xray_type = service.get('Type', '')
        if xray_type == 'client':
            ends[ref] = {'name': 'client', 'type': 'client', 'arn': ''}
            continue
        if xray_type == 'remote':
            ends[ref] = {'name': service.get('Name', 'remote'), 'type': 'remote', 'arn': ''}
            continue
        arn = arns[ref]
        tagged = tags.get(arn) if arn else None
        diagnostics['ends_named_by_tag' if tagged else 'ends_named_by_resource'] += 1
        ends[ref] = {'name': tagged or own_name(service), 'type': kind_of(xray_type), 'arn': arn}
    return ends


# --- reading X-Ray ----------------------------------------------------------------

def _window(start, end, group):
    kwargs = {
        'StartTime': datetime.datetime.fromtimestamp(start, datetime.timezone.utc),
        'EndTime': datetime.datetime.fromtimestamp(end, datetime.timezone.utc),
    }
    # `Default` is every trace, which is what leaving the group out asks for.
    if group != DEFAULT_GROUP:
        kwargs['GroupName'] = group
    return kwargs


def _pages(call, kwargs, key):
    """Every page of a NextToken-paginated X-Ray read. Returns (items, whether any
    page said the group's filter changed inside the window)."""
    items, old_versions, token = [], False, None
    for _ in range(100):
        answer = call(**dict(kwargs, NextToken=token)) if token else call(**kwargs)
        items.extend(answer.get(key, []))
        old_versions = old_versions or bool(answer.get('ContainsOldGroupVersions'))
        token = answer.get('NextToken')
        if not token:
            break
    return items, old_versions


def service_graph(xray, group, start, end):
    """The graph's nodes, pages merged by ReferenceId."""
    services, old_versions = _pages(xray.get_service_graph, _window(start, end, group), 'Services')
    merged = {}
    for service in services:
        ref = service.get('ReferenceId')
        if ref in merged:
            merged[ref].setdefault('Edges', []).extend(service.get('Edges', []))
        else:
            merged[ref] = dict(service, Edges=list(service.get('Edges', [])))
    return list(merged.values()), old_versions


def edges_of(services):
    """[(source node, target node, edge)], busiest first by the graph's count.

    The graph's count only orders the edges; the number written comes from the
    series (see the module docstring).
    """
    by_ref = {service['ReferenceId']: service for service in services}
    edges = []
    for source in services:
        for edge in source.get('Edges', []):
            target = by_ref.get(edge.get('ReferenceId'))
            if target is not None:
                edges.append((source, target, edge))
    edges.sort(key=lambda item: -((item[2].get('SummaryStatistics') or {}).get('TotalCount') or 0))
    return edges


def selector(source, target):
    """The EntitySelectorExpression of one edge, or None when a name cannot be quoted."""
    parts = []
    for node in (source, target):
        name, xray_type = node.get('Name', ''), node.get('Type', '')
        if not name or not xray_type or any(c in name + xray_type for c in '"\\'):
            return None
        parts.append('id(name: "%s", type: "%s")' % (name, xray_type))
    return 'edge(%s, %s)' % (parts[0], parts[1])


def edge_points(xray, group, start, end, expression):
    kwargs = dict(_window(start, end, group), EntitySelectorExpression=expression, Period=BUCKET_SECONDS)
    return _pages(xray.get_time_series_service_statistics, kwargs, 'TimeSeriesServiceStatistics')


def point_instant(point):
    """The epoch second a point is stamped with: the END of its period."""
    stamp = point.get('Timestamp')
    if isinstance(stamp, datetime.datetime):
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=datetime.timezone.utc)
        return int(stamp.timestamp())
    if isinstance(stamp, (int, float)) and not isinstance(stamp, bool):
        return int(stamp)
    return None


def values_of_point(point):
    """({metric: value}, [(le, cumulative count)] or None) for one series point.

    A REQUEST COUNTED WITHOUT A TIME IS NOT A REQUEST THAT TOOK ZERO SECONDS. An edge
    into a resource that records no segment of its own comes back with a count, a
    `TotalResponseTime` of 0.0 and its whole histogram at -0.0 (measured on the
    stage -> Lambda edge, 2026-09-25). Only histogram entries above zero are
    measurements. With none, the three time series are left out and the count is
    written alone, so the reader has nothing to draw as "0 ms".

    Errors, faults and throttles go out only when above zero: the workspace bills per
    sample, and a reader treats a missing sample as zero anyway.
    """
    stats = point.get('EdgeSummaryStatistics') or {}
    total = stats.get('TotalCount') or 0
    if total <= 0:
        return {}, None
    errors = stats.get('ErrorStatistics') or {}
    faults = stats.get('FaultStatistics') or {}
    values = {METRIC_REQUESTS: total}
    for metric, value in ((METRIC_ERRORS, errors.get('TotalCount')),
                          (METRIC_FAULTS, faults.get('TotalCount')),
                          (METRIC_THROTTLES, errors.get('ThrottleCount'))):
        if value:
            values[metric] = value

    timed = [(entry['Value'], entry['Count']) for entry in point.get('ResponseTimeHistogram') or []
             if (entry.get('Value') or 0) > 0 and (entry.get('Count') or 0) > 0]
    if not timed:
        return values, None
    count = sum(c for _, c in timed)
    seconds = stats.get('TotalResponseTime') or 0
    if seconds <= 0:
        seconds = sum(v * c for v, c in timed)
    values[METRIC_SECONDS_SUM] = seconds
    values[METRIC_SECONDS_COUNT] = count
    buckets = [(repr(float(le)), sum(c for v, c in timed if v <= le)) for le in LE_BOUNDS]
    buckets.append(('+Inf', count))
    return values, buckets


def edge_labels(region, group, source, target, edge_type, account):
    """The labels of one edge, sorted, empty values left out.

    `src_name`/`dst_name` identify the series; `src_arn`/`dst_arn` let the canvas
    land an end on the box whose status carries that ARN. `edge_type` is X-Ray's:
    `request`, or `link` for an asynchronous edge such as a queue and its consumer.
    """
    labels = {
        'account': account,
        'region': region,
        'xray_group': group,
        'src_name': source['name'], 'src_type': source['type'], 'src_arn': source['arn'],
        'dst_name': target['name'], 'dst_type': target['type'], 'dst_arn': target['arn'],
        'edge_type': edge_type or 'request',
    }
    return tuple(sorted((name, value) for name, value in labels.items() if value))


def add_point(totals, labels, instant, point, diagnostics):
    """Adds one point to `totals`, keyed by (labels, metric) and instant in ms.

    Added, not set: two X-Ray edges that name the same two boxes in one block write
    one series with their sum.
    """
    values, buckets = values_of_point(point)
    if not values:
        return
    timestamp_ms = instant * 1000
    for metric, value in values.items():
        totals[(labels, metric)][timestamp_ms] += value
    if buckets is None:
        diagnostics['points_without_time'] += 1
        return
    for le, count in buckets:
        totals[(tuple(sorted(labels + (('le', le),))), METRIC_SECONDS_BUCKET)][timestamp_ms] += count


def read_group(region, group, start, end, account, totals, diagnostics, remaining_ms):
    """Reads one group over (start, end] into `totals`. Returns the number of points."""
    xray = client('xray', region)
    services, old_versions = service_graph(xray, group, start, end)
    if old_versions:
        diagnostics['groups_with_changed_filter'] += 1
        print('Group ' + region + '/' + group + ' changed its filter inside the window; '
              'the graph mixes the old expression and the new one.')

    edges = edges_of(services)
    diagnostics['edges_in_graph'] += len(edges)
    if not edges:
        return 0

    ends = describe_ends(services, region, account, diagnostics)
    between = []
    for source, target, edge in edges:
        # `AWS::Lambda` -> `AWS::Lambda::Function` with one name is the Lambda service
        # handing the request to the function: one box, not a conversation.
        if ends[source['ReferenceId']] == ends[target['ReferenceId']]:
            diagnostics['edges_inside_one_resource'] += 1
        else:
            between.append((source, target, edge))
    if len(between) > MAX_EDGES_PER_GROUP:
        diagnostics['edges_over_limit'] += len(between) - MAX_EDGES_PER_GROUP
        print('Group ' + region + '/' + group + ' has ' + str(len(between)) + ' edges; reading the '
              + str(MAX_EDGES_PER_GROUP) + ' busiest.')
        between = between[:MAX_EDGES_PER_GROUP]

    points_added = 0
    for source, target, edge in between:
        a, b = ends[source['ReferenceId']], ends[target['ReferenceId']]
        expression = selector(source, target)
        if expression is None:
            diagnostics['edges_unselectable'] += 1
            continue
        if remaining_ms() < TIME_RESERVE_MS:
            diagnostics['edges_skipped_for_time'] += 1
            continue
        try:
            points, _ = edge_points(xray, group, start, end, expression)
        except Exception as error:  # noqa: BLE001 -- one edge must not stop the group
            diagnostics['edges_failed'] += 1
            print(json.dumps({'metric': 'struct8_trace_edge_failed', 'region': region,
                              'group': group, 'edge': expression, 'error': str(error)[:300]}))
            continue
        diagnostics['edges_read'] += 1

        labels = edge_labels(region, group, a, b, edge.get('EdgeType'), account)
        for point in points:
            instant = point_instant(point)
            if instant is None or not start < instant <= end:
                diagnostics['points_outside_window'] += 1
                continue
            add_point(totals, labels, instant, point, diagnostics)
            points_added += 1
    return points_added


# --- protobuf, by hand ------------------------------------------------------------
#
# Copied from ProcessFlowLogs, not imported: a folder shared between templates, or
# between the two functions of this one, would be a dependency no published version
# can pin (rule 4 of the repository README), and each Lambda directory is zipped on
# its own.
#
#   WriteRequest { repeated TimeSeries timeseries = 1 }
#   TimeSeries   { repeated Label labels = 1; repeated Sample samples = 2 }
#   Label        { string name = 1; string value = 2 }
#   Sample       { double value = 1; int64 timestamp = 2 }

def _varint(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def _key(field, wire):
    return _varint((field << 3) | wire)


def _len_delimited(field, payload):
    return _key(field, 2) + _varint(len(payload)) + payload


def _string_field(field, value):
    return _len_delimited(field, value.encode('utf-8'))


def _double_field(field, value):
    # Wire type 1: eight bytes, little-endian IEEE 754.
    return _key(field, 1) + struct.pack('<d', float(value))


def _int64_field(field, value):
    return _key(field, 0) + _varint(int(value))


def encode_write_request(series):
    """`series` is a list of (labels dict, list of (timestamp_ms, value))."""
    out = bytearray()
    for labels, samples in series:
        ts = bytearray()
        for name, value in labels.items():
            label = _string_field(1, name) + _string_field(2, value)
            ts += _len_delimited(1, label)
        for timestamp_ms, value in samples:
            sample = _double_field(1, value) + _int64_field(2, timestamp_ms)
            ts += _len_delimited(2, sample)
        out += _len_delimited(1, bytes(ts))
    return bytes(out)


# --- snappy, without compressing --------------------------------------------------

def snappy_literal_only(data):
    """A valid snappy block that stores `data` verbatim: the uncompressed length as
    a varint, then one literal element holding everything. See ProcessFlowLogs."""
    n = len(data)
    out = bytearray(_varint(n))
    if n == 0:
        return bytes(out)
    if n <= 60:
        out.append((n - 1) << 2)
    elif n <= 1 << 8:
        out.append(60 << 2)
        out += (n - 1).to_bytes(1, 'little')
    elif n <= 1 << 16:
        out.append(61 << 2)
        out += (n - 1).to_bytes(2, 'little')
    elif n <= 1 << 24:
        out.append(62 << 2)
        out += (n - 1).to_bytes(3, 'little')
    else:
        out.append(63 << 2)
        out += (n - 1).to_bytes(4, 'little')
    out += data
    return bytes(out)


# --- remote write -----------------------------------------------------------------

_WORKSPACE_HOST = re.compile(r'aps-workspaces\.([a-z0-9-]+)\.amazonaws\.com')


def workspace_region(endpoint):
    """The region to sign remote_write with: the WORKSPACE's, read from its address.

    Not AWS_REGION, which is where this function runs. A workspace in another region
    refuses a request signed for this one with 403, which reads as a credentials
    problem and is not one. One aggregator per diagram reads X-Ray in every region
    the diagram has groups in, and the workspace is in one of them.
    """
    match = _WORKSPACE_HOST.search(endpoint or '')
    return match.group(1) if match else REGION


class RemoteWriteRefused(Exception):
    """AMP answered with a status other than 2xx, and the body says why."""

    def __init__(self, status, detail):
        super().__init__('remote_write refused with ' + str(status) + ': ' + detail)
        self.status = status
        self.detail = detail


def remote_write(series):
    """Sends one batch. Returns the HTTP status, or raises with what AMP said. A 400
    carries the reason in its body; see ProcessFlowLogs for why it is read."""
    if not WORKSPACE_ENDPOINT:
        raise RuntimeError('No workspace endpoint: wire the Lambda to the workspace.')

    url = WORKSPACE_ENDPOINT.rstrip('/') + '/api/v1/remote_write'
    body = snappy_literal_only(encode_write_request(series))
    headers = {
        'Content-Encoding': 'snappy',
        'Content-Type': 'application/x-protobuf',
        'X-Prometheus-Remote-Write-Version': '0.1.0',
    }

    credentials = boto3.Session().get_credentials().get_frozen_credentials()
    request = AWSRequest(method='POST', url=url, data=body, headers=headers)
    # `aps` is the signing name of Amazon Managed Service for Prometheus.
    SigV4Auth(credentials, 'aps', workspace_region(WORKSPACE_ENDPOINT)).add_auth(request)

    sent = urllib.request.Request(url, data=body, headers=dict(request.headers), method='POST')
    try:
        with urllib.request.urlopen(sent, timeout=30) as response:
            return response.status
    except urllib.error.HTTPError as error:
        raise RemoteWriteRefused(error.code,
                                 error.read().decode('utf-8', 'replace')[:500]) from None


def write_series(series, diagnostics):
    """Writes in batches of `SERIES_PER_REQUEST`, and a refused batch one series at a
    time, so one refused sample does not take the rest of the batch with it.

    Here a refusal is rarer than in ProcessFlowLogs, which has several writers per
    minute. It happens when a block is written twice with different numbers: a
    retry after X-Ray changed, or a catch-up over blocks already written. A 5xx is
    re-raised, so the invocation fails and Lambda retries it.
    """
    for i in range(0, len(series), SERIES_PER_REQUEST):
        batch = series[i:i + SERIES_PER_REQUEST]
        try:
            status = remote_write(batch)
            print('remote_write status ' + str(status) + ', series ' + str(len(batch)))
            continue
        except RemoteWriteRefused as refusal:
            if refusal.status >= 500:
                raise
            print('Batch of ' + str(len(batch)) + ' refused: ' + str(refusal))
            diagnostics['batches_refused'] += 1

        for labels, samples in batch:
            try:
                remote_write([(labels, samples)])
                diagnostics['series_written_singly'] += 1
            except RemoteWriteRefused as single:
                diagnostics['series_refused'] += 1
                print(json.dumps({'metric': 'struct8_series_refused',
                                  'labels': labels, 'detail': single.detail[:200]}))


def to_series(totals):
    """One Prometheus series per (labels, metric), labels sorted, samples in order."""
    series = []
    for (labels, metric), samples in sorted(totals.items()):
        full = {'__name__': metric}
        full.update(labels)
        series.append((full, sorted(samples.items())))
    return series


def diagnostic_series(diagnostics, timestamp_ms):
    """The run's counts, as `struct8_trace_aggregator_<name>_total`, and the block.

    The block goes out as a gauge so the reader steps its queries by it instead of
    assuming one: a 300-second block read at 60 draws four empty minutes and one
    fivefold.
    """
    out = []
    for name, value in sorted(diagnostics.items()):
        out.append(({'__name__': 'struct8_trace_aggregator_' + name + '_total'},
                    [(timestamp_ms, value)]))
    out.append(({'__name__': METRIC_BUCKET_SECONDS}, [(timestamp_ms, BUCKET_SECONDS)]))
    return out


# --- handler ----------------------------------------------------------------------

def own_account(context):
    """ACCOUNT, else the account in this function's ARN, else STS (the bench)."""
    if ACCOUNT:
        return ACCOUNT
    arn = getattr(context, 'invoked_function_arn', '') or ''
    parts = arn.split(':')
    if len(parts) > 4 and parts[4]:
        return parts[4]
    try:
        return boto3.client('sts').get_caller_identity()['Account']
    except Exception:  # noqa: BLE001 -- ARNs that need the account are left out
        return ''


def lambda_handler(event, context):
    event = event if isinstance(event, dict) else {}
    print('Lambda execution started. Received event: ' + json.dumps(event, default=str)[:500])

    dry_run = bool(event.get('dry_run'))
    if not WORKSPACE_ENDPOINT and not dry_run:
        # Before reading X-Ray: a read nothing can be written from is paid for nothing.
        return {'statusCode': 500, 'body': 'Configuration Error: no workspace endpoint.'}

    diagnostics = defaultdict(int)
    end, blocks = blocks_to_read(event, time.time(), diagnostics)
    start = end - blocks * BUCKET_SECONDS
    account = own_account(context)
    groups = groups_to_read()
    print('Blocks ' + str(blocks) + ' of ' + str(BUCKET_SECONDS) + ' s ending '
          + datetime.datetime.fromtimestamp(end, datetime.timezone.utc).isoformat()
          + '; groups ' + json.dumps(groups))

    if context is not None and hasattr(context, 'get_remaining_time_in_millis'):
        remaining_ms = context.get_remaining_time_in_millis
    else:
        def remaining_ms():
            return float('inf')

    totals = defaultdict(lambda: defaultdict(float))
    for region, group in groups:
        began = time.time()
        try:
            points = read_group(region, group, start, end, account, totals, diagnostics, remaining_ms)
            diagnostics['groups_read'] += 1
            print(json.dumps({'metric': 'struct8_trace_group', 'region': region, 'group': group,
                              'points': points, 'seconds': round(time.time() - began, 2)}))
        except Exception as error:  # noqa: BLE001 -- one region must not stop the others
            diagnostics['groups_failed'] += 1
            print(json.dumps({'metric': 'struct8_trace_group_failed', 'region': region,
                              'group': group, 'error': str(error)[:300]}))

    series = to_series(totals)
    if dry_run:
        for labels, samples in series[:50]:
            print(json.dumps({'labels': labels, 'samples': samples}))
        print('Dry run: ' + str(len(series)) + ' series, nothing written. Diagnostics: '
              + json.dumps(dict(diagnostics)))
        return {'statusCode': 200,
                'body': json.dumps({'series': len(series), 'diagnostics': dict(diagnostics)})}

    write_series(series, diagnostics)
    # The run's counts in a request of their own, AFTER the edges, so a refused edge
    # batch does not take with it the numbers that explain the refusal.
    write_series(diagnostic_series(diagnostics, int(time.time() * 1000)), diagnostics)

    print('Diagnostics: ' + json.dumps(dict(diagnostics)))
    return {
        'statusCode': 200,
        'body': json.dumps({'series': len(series), 'block_end': end, 'blocks': blocks,
                            'diagnostics': dict(diagnostics)}),
    }


# --- bench ------------------------------------------------------------------------
#
# Reads X-Ray with the local credentials and prints what a run would write. Writes
# nothing. Every read may be billed as traces accessed.
#
#   XRAY_GROUPS=us-east-1/my-group AWS_REGION=us-east-1 \
#     python ProcessTraces.py --profile <profile> [--blocks 12] [--block-end 2026-09-26T12:00:00Z]

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Print what one run would write. Writes nothing.')
    parser.add_argument('--profile')
    parser.add_argument('--blocks', type=int, default=1)
    parser.add_argument('--block-end')
    arguments = parser.parse_args()
    if arguments.profile:
        boto3.setup_default_session(profile_name=arguments.profile, region_name=REGION)
    bench_event = {'dry_run': True, 'blocks': arguments.blocks}
    if arguments.block_end:
        bench_event['block_end'] = arguments.block_end
    print(json.dumps(lambda_handler(bench_event, None), indent=1))
