"""Aggregates VPC Flow Log records into Prometheus series and writes them to an
Amazon Managed Service for Prometheus workspace.

Sibling of ProcessCUR: same repository, same conventions -- configuration from
environment variables with built-in defaults, wired resources arriving through the
names the generator exports, plain print() for logging, and a handler that accepts
either an S3 event or an explicit key.

WHAT THIS SLICE DOES, AND WHAT IT LEAVES OUT. It reads plain-text flow log objects,
derives the field map from each file's own header, keeps only the egress direction,
names both ends, collapses everything outside the known CIDRs, accumulates into
60-second buckets and writes the result once. It does NOT yet write partials, run a
compactor, or read Parquet -- those come after the first run proves the path.

NO NEW DEPENDENCIES. Remote write is protobuf framed in snappy, and neither needs a
package here: the WriteRequest message is small enough to encode by hand, and the
snappy format permits an all-literal block, so a valid payload can be produced without
compressing anything. Signing uses botocore, which the runtime already carries.
"""

import gzip
import hashlib
import io
import ipaddress
import json
import os
import random
import re
import socket
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# --- configuration ---------------------------------------------------------------
#
# The wired resources arrive under the names the generator builds from each type's
# `exportEnvVar` plus the wire label: <TYPE>_<KEY>_<LABEL>. ProcessCUR reads its
# bucket the same way, and falls back the same way, because the label depends on
# which wire was drawn first.

WORKSPACE_ENDPOINT = (
    os.environ.get('AWS_PROMETHEUS_WORKSPACE_ENDPOINT_0')
    or os.environ.get('AWS_PROMETHEUS_WORKSPACE_TARGET_ENDPOINT_0')
    or os.environ.get('PROMETHEUS_ENDPOINT', '')
)

# `FLOW_LOG_BUCKET` comes FIRST, and the order is the point. A wire writes
# <TYPE>_NAME_<LABEL> holding the target's LOGICAL NAME -- the label on the canvas
# -- while a bucket whose namespace is account-regional is called
# `<logical>-<account>-<region>-an` in the cloud. Taking the wire's value as a
# bucket name asks S3 for a bucket that does not exist, and the two agree only
# when the bucket has no namespace. The endpoint above does not share the
# problem: the workspace declares `prometheus_endpoint` in its `exportEnvVar`, so
# what arrives there is the real address.
#
# The diagram therefore writes this one by hand, carrying a Terraform reference
# (`aws_s3_bucket.<label>.id`). The wire-built names stay as the fallback.
FLOW_BUCKET_NAME = (
    os.environ.get('FLOW_LOG_BUCKET')
    or os.environ.get('AWS_S3_BUCKET_NAME_0')
    or os.environ.get('AWS_S3_BUCKET_TARGET_NAME_0', '')
)

REGION = os.environ.get('AWS_REGION', 'us-east-1')

# The account every series belongs to. A workspace accepts remote_write from any
# account, and centralising on one is a reason the workspace was chosen at all --
# so without this label two accounts that happen to name a box the same way write
# to the SAME series and their traffic silently adds up. The generator already
# puts the value in the environment; nothing read it until now.
ACCOUNT = os.environ.get('ACCOUNT', '')

# How long a described fact is trusted before being read again.
#
# WHY A TIMER AND NOT JUST THE CONTAINER'S LIFETIME. A warm Lambda keeps its
# module globals between invocations, which is what makes the cache worth having
# -- but a function invoked every few minutes never goes cold, so a map read once
# would be trusted forever. A box renamed in the diagram would keep reporting the
# old name for as long as the container lived, which can be hours.
#
# TEN MINUTES IS THE SAME ORDER AS THE DATA IT LABELS. The flow log arrives 63 to
# 68 s late in a window's first object and 333 to 338 s in its second (measured
# 2026-09-22), so what is being written is already minutes old. A cache fresher
# than the data it names buys nothing, and costs a describe per invocation.
DESCRIBE_TTL_SECONDS = int(os.environ.get('DESCRIBE_TTL_SECONDS', '600'))

# Where the AWS delivery lands. The notification listens to this prefix only, and
# step 1 refuses anything else -- the trap that survives someone editing the
# notification by hand.
DELIVERY_PREFIX = os.environ.get('DELIVERY_PREFIX', 'AWSLogs/')
OUTPUT_PREFIX = os.environ.get('OUTPUT_PREFIX', 'struct8/')

# The time bucket, in seconds. 60 matches the finest aggregation the flow log can
# deliver, so a coarser value here only loses resolution.
BUCKET_SECONDS = int(os.environ.get('BUCKET_SECONDS', '60'))

# 🔴 THERE IS NO WAIT FOR A BUCKET TO CLOSE, and there used to be one.
# `CUTOFF_SECONDS` skipped every bucket that started less than that long ago, on
# the theory that a later object would complete the minute and it should be
# written once. Nothing ever re-read the object, so what was skipped was simply
# gone. Measured on 2026-09-23, with the laboratory's generators running without
# a pause: the minute straddling each delivery kept 4.4 MB and 0.66 MB, against
# 7.5 to 16 MB for every other minute -- one minute lost per delivery.
#
# Each object now writes every bucket it holds. The two shares of a split minute
# land on different instants (`write_offset_ms`), and the query sums the bucket
# back together. The share that arrives second is usually older than the newest
# sample of its series, so it relies on the workspace accepting out-of-order
# samples -- as every late record already did.
#
# HOW LATE IT MAY ARRIVE, measured on 2026-09-23 against the laboratory's
# workspace. A sample older than the newest of ITS OWN series goes in while it is
# at most 10 minutes older than the newest sample the workspace holds from ANY
# series: 10.0 minutes in, 10.1 refused with `too old sample`, and the refusal
# names that newest sample `tsdbHeadMaxTimestamp`. It is not the series' own: a
# sample 5 minutes older than its series' newest was refused, because it was 25
# minutes older than what other series had written. Every invocation moves that
# point to about now -- the diagnostic series carry the wall clock -- so a late
# share has about ten minutes from the start of its minute. Over the laboratory's
# first 17 objects, the oldest record of each arrived 4.4 to 6.4 minutes after its
# minute began.
#
# A sample NOT older than its own series' newest is held to no such window: one
# 11 minutes old went into a new series. At 59 minutes a different check refused
# it (`timestamp too old`).
#
# A refusal is not silent: `write_series` counts it as `series_refused` and prints
# which series it was.
#
# An environment that still sets `CUTOFF_SECONDS` changes nothing; nothing reads it.

# The highest number of pairs kept per bucket. What falls outside is summed into one
# `rest` row, so the total still closes.
TOP_N_PAIRS = int(os.environ.get('TOP_N_PAIRS', '200'))

# Only consulted when a file carries no header line. Never inferred from position:
# a file read with the wrong map does not fail, it attributes bytes to the wrong pair
# with a plausible number, which is the worst defect available here.
FALLBACK_FIELD_ORDER = os.environ.get('FALLBACK_FIELD_ORDER', '').split()

METRIC_BYTES = 'struct8_edge_bytes'
METRIC_PACKETS = 'struct8_edge_packets'

s3 = boto3.client('s3')
ec2 = boto3.client('ec2')
# Read only when an address belongs to a load balancer, a database or a Lambda
# function, to find that resource's Name tag. See `owners_for_addresses`.
elbv2 = boto3.client('elbv2')
rds = boto3.client('rds')
lambda_client = boto3.client('lambda')


# --- protobuf, by hand ------------------------------------------------------------
#
# Only four messages are needed, and they are all length-delimited or scalar:
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
        # __name__ has to come first only by convention; Prometheus sorts on receipt.
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
    """A valid snappy block that stores `data` verbatim.

    The format is a varint of the uncompressed length followed by elements, and a
    literal is an element. Emitting one literal for the whole payload is legal and
    decompresses to the input, which is all remote write asks for. It costs
    bandwidth on a payload that is already small, and saves a compiled dependency.
    """
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

class RemoteWriteRefused(Exception):
    """AMP answered with a status other than 2xx, and the body says why."""

    def __init__(self, status, detail):
        super().__init__('remote_write refused with ' + str(status) + ': ' + detail)
        self.status = status
        self.detail = detail


def remote_write(series):
    """Sends one batch. Returns the HTTP status, or raises with what AMP said.

    A 400 here is not a transport failure, and reading it as one throws away the
    only thing that explains the run. Prometheus answers 400 for a sample it
    REFUSES -- a repeated instant carrying a different value, or one older than
    the out-of-order window -- and the reason is in the response body. `urlopen`
    raises before anyone reads that body, so a refusal used to reach the log as a
    traceback with nothing in it about the cause.
    """
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
    SigV4Auth(credentials, 'aps', REGION).add_auth(request)

    sent = urllib.request.Request(url, data=body, headers=dict(request.headers), method='POST')
    try:
        with urllib.request.urlopen(sent, timeout=30) as response:
            return response.status
    except urllib.error.HTTPError as error:
        raise RemoteWriteRefused(error.code,
                                 error.read().decode('utf-8', 'replace')[:500]) from None


def write_series(series, diagnostics):
    """Writes a batch, and on a refusal falls back to one request per series.

    AMP refuses the WHOLE request over one bad sample. Without this fallback a
    single conflicting instant loses every other series in the batch, and the
    object goes with them -- the two asynchronous retries send identical bytes
    and are refused identically.

    THE CONFLICT IS REAL AND IT IS NOT RARE. Measured on 2026-09-22, ten minutes
    into the first run, with ONE network interface: two objects of the same
    delivery both carried bucket 1790117040 for the same pair, one saying 2778
    bytes and the other 1401, because AWS had split that capture window across
    two files. Whichever arrives second is refused.

    One request per series costs N requests on a bad batch and nothing on a good
    one, and it names the series that conflicted instead of losing the evidence.
    A 5xx is re-raised: there the bytes are fine and a retry is what helps.
    """
    if not series:
        return
    try:
        status = remote_write(series)
        print('remote_write status ' + str(status) + ', series ' + str(len(series)))
        return
    except RemoteWriteRefused as refusal:
        if refusal.status >= 500:
            raise
        print('Batch of ' + str(len(series)) + ' refused: ' + str(refusal))
        diagnostics['batches_refused'] += 1

    for labels, samples in series:
        try:
            remote_write([(labels, samples)])
            diagnostics['series_written_singly'] += 1
        except RemoteWriteRefused as single:
            diagnostics['series_refused'] += 1
            print(json.dumps({'metric': 'struct8_series_refused',
                              'labels': labels, 'detail': single.detail[:200]}))


# --- reading the flow log ---------------------------------------------------------

# Without these four a record cannot be used at all. Everything else missing removes
# one specific capability, and only that one.
REQUIRED_FIELDS = ('srcaddr', 'dstaddr', 'bytes', 'start')


def field_map_from_header(first_line):
    """The map comes from the file, never from a position we assumed."""
    names = first_line.strip().split()
    if not names or 'srcaddr' not in names:
        return None
    return {name: index for index, name in enumerate(names)}


def read_text_object(bucket, key):
    """Yields dicts of field name to raw string. Gzipped plain text only."""
    body = s3.get_object(Bucket=bucket, Key=key)['Body'].read()
    if key.endswith('.gz'):
        body = gzip.decompress(body)
    text = io.StringIO(body.decode('utf-8', errors='replace'))

    first = text.readline()
    mapping = field_map_from_header(first)
    if mapping is None:
        if not FALLBACK_FIELD_ORDER:
            raise ValueError('no header line and no FALLBACK_FIELD_ORDER declared')
        mapping = {name: i for i, name in enumerate(FALLBACK_FIELD_ORDER)}
        text.seek(0)

    for line in text:
        parts = line.split()
        if len(parts) < len(mapping):
            continue
        yield {name: parts[index] for name, index in mapping.items()}


def value_of(record, name):
    """`-` is how the flow log writes an absent field."""
    raw = record.get(name, '-')
    return None if raw in ('-', '') else raw


# --- naming the two ends ----------------------------------------------------------

# Facts described from the account, kept between invocations of a warm container.
# Module level on purpose: this is the only state that survives, and the whole
# point is not to ask EC2 the same question once per delivered object.
_cidrs_cache = {'expires_at': 0.0, 'blocks': []}
_vpc_name_by_id = {}
_owner_by_address = {}
_rds_cache = {'expires_at': 0.0, 'by_address': {}}


def _expiry():
    """When a freshly read fact stops being trusted.

    THE SPREAD IS NOT DECORATION. Containers that started together expire
    together, and twenty of them re-reading in the same instant is a burst
    against the CUSTOMER's EC2 request quota -- shared with everything else they
    run, so the symptom lands somewhere else entirely.

    Random here, unlike `write_offset_ms`, which derives its value from the keys
    so a retry lands on the same instant. There the point is to reproduce; here
    it is to scatter.
    """
    return time.time() + DESCRIBE_TTL_SECONDS * random.uniform(0.85, 1.15)


# Conservative chunk for a filter's value list -- not a measured ceiling. EC2
# refuses an over-long filter outright, and a refusal here would cost the names
# of a whole batch.
ADDRESS_CHUNK = 100

# What an end is called when nothing it belongs to carries a Name tag. One value
# per VPC (the `_vpc` label keeps them apart), so the volume still adds up in the
# totals while landing on no box.
UNNAMED = 'unnamed'

# The resource id inside an interface's description, for the owners whose id
# is only written there.
_NAT_ID = re.compile(r'\b(nat-[0-9a-f]+)\b')
_ENDPOINT_ID = re.compile(r'\b(vpce-[0-9a-f]+)\b')
# `ELB app/<name>/<id>` or `ELB net/<name>/<id>`; a Classic one is `ELB <name>`.
_LOAD_BALANCER = re.compile(r'^ELB (?:(app|net|gwy)/([^/]+)/([0-9a-f]+)|([^\s/]+))$')
# `AWS Lambda VPC ENI-<function>-<uuid>`: the function name may hold hyphens, the
# trailing uuid is what separates it.
_LAMBDA_ENI = re.compile(
    r'^AWS Lambda VPC ENI-(.+?)(?:-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$')


def _name_tag(tags):
    """The Name tag from a list of `{Key, Value}` pairs, or ''."""
    for tag in tags or []:
        if tag.get('Key') == 'Name':
            return tag.get('Value', '')
    return ''


def owner_of_interface(interface):
    """What an interface belongs to: `(kind, id to read the Name tag by, fallback name)`.

    AN INTERFACE IS NOT A RESOURCE, and its own Name tag is almost never set: the
    instance, the NAT gateway or the load balancer that owns it is what the
    diagram draws, and what carries the tag the generator wrote. Each kind of
    owner leaves its mark in a different field, so each is read where AWS puts it.

    The fallback is the owner's own name where it has one (a load balancer, a
    function): the generator names those after the box, so without permission
    to read the tag the answer is usually the same.
    """
    attachment = interface.get('Attachment') or {}
    kind = interface.get('InterfaceType') or ''
    description = interface.get('Description') or ''
    account = interface.get('OwnerId') or ACCOUNT

    if attachment.get('InstanceId'):
        return 'instance', attachment['InstanceId'], ''
    if kind == 'nat_gateway':
        match = _NAT_ID.search(description)
        return 'nat_gateway', match.group(1) if match else None, ''
    if kind in ('vpc_endpoint', 'gateway_load_balancer_endpoint'):
        match = _ENDPOINT_ID.search(description)
        return 'vpc_endpoint', match.group(1) if match else None, ''
    balancer = _LOAD_BALANCER.match(description)
    if balancer:
        if balancer.group(1):
            arn = ('arn:aws:elasticloadbalancing:' + REGION + ':' + account + ':loadbalancer/'
                   + balancer.group(1) + '/' + balancer.group(2) + '/' + balancer.group(3))
            return 'load_balancer', arn, balancer.group(2)
        return 'load_balancer', None, balancer.group(4)
    function = _LAMBDA_ENI.match(description)
    if kind == 'lambda' or function:
        name = function.group(1) if function else ''
        arn = ('arn:aws:lambda:' + REGION + ':' + account + ':function:' + name) if name else None
        return 'lambda', arn, name
    if description == 'RDSNetworkInterface':
        # No database id anywhere on the interface; the address is the key, see
        # `_rds_names_by_address`.
        return 'rds', None, ''
    if description.startswith('arn:aws:ecs:'):
        return 'ecs_task', None, ''
    return kind or 'network_interface', None, ''


def _paginated(client, operation, key, **kwargs):
    for page in client.get_paginator(operation).paginate(**kwargs):
        for item in page.get(key, []):
            yield item


def _tags_by_id(kind, ids):
    """`id -> Name tag` for owners of one kind, in as few calls as the API allows."""
    ids = sorted(set(ids))
    out = {}
    if not ids:
        return out
    if kind == 'instance':
        # Filtered, not listed by id: `InstanceIds=[...]` fails the whole call
        # when one of them no longer exists, and an instance that has just been
        # replaced is exactly what this is asked about.
        for reservation in _paginated(ec2, 'describe_instances', 'Reservations',
                                      Filters=[{'Name': 'instance-id', 'Values': ids}]):
            for instance in reservation.get('Instances', []):
                out[instance['InstanceId']] = _name_tag(instance.get('Tags'))
    elif kind == 'nat_gateway':
        for gateway in _paginated(ec2, 'describe_nat_gateways', 'NatGateways',
                                  Filters=[{'Name': 'nat-gateway-id', 'Values': ids}]):
            out[gateway['NatGatewayId']] = _name_tag(gateway.get('Tags'))
    elif kind == 'vpc_endpoint':
        for endpoint in _paginated(ec2, 'describe_vpc_endpoints', 'VpcEndpoints',
                                   Filters=[{'Name': 'vpc-endpoint-id', 'Values': ids}]):
            out[endpoint['VpcEndpointId']] = _name_tag(endpoint.get('Tags'))
    elif kind == 'load_balancer':
        for start in range(0, len(ids), 20):
            batch = ids[start:start + 20]
            try:
                answers = [elbv2.describe_tags(ResourceArns=batch)]
            except Exception:  # noqa: BLE001
                # ONE load balancer that no longer exists fails the whole call
                # (`LoadBalancerNotFound`, measured 2026-09-25), so the batch is
                # asked again one by one and only the missing one goes without.
                answers = []
                for arn in batch:
                    try:
                        answers.append(elbv2.describe_tags(ResourceArns=[arn]))
                    except Exception as error:  # noqa: BLE001
                        print('describe_tags failed for ' + arn + ': ' + str(error))
            for answer in answers:
                for description in answer.get('TagDescriptions', []):
                    out[description['ResourceArn']] = _name_tag(description.get('Tags'))
    elif kind == 'lambda':
        for arn in ids:
            try:
                out[arn] = (lambda_client.list_tags(Resource=arn).get('Tags') or {}).get('Name', '')
            except Exception as error:  # noqa: BLE001 -- one function must not cost the others
                print('list_tags failed for ' + arn + ': ' + str(error))
    return out


def _rds_names_by_address():
    """`address -> Name tag` for every database this account runs here.

    A database's interface carries neither its identifier nor a tag -- only the
    description `RDSNetworkInterface` -- so the way from an address to a database
    is the other direction: every instance's endpoint, resolved. The endpoint of
    a private database still resolves from outside the VPC, to its private
    address, which is the one the flow log records.
    """
    if _rds_cache['expires_at'] > time.time():
        return _rds_cache['by_address']
    by_address = {}
    for database in _paginated(rds, 'describe_db_instances', 'DBInstances'):
        host = (database.get('Endpoint') or {}).get('Address')
        if not host:
            continue
        name = _name_tag(database.get('TagList')) or database.get('DBInstanceIdentifier', '')
        try:
            for info in socket.getaddrinfo(host, None):
                by_address[info[4][0]] = name
        except OSError:
            continue
    _rds_cache['by_address'] = by_address
    _rds_cache['expires_at'] = _expiry()
    return by_address


def _describe_interfaces(chunk):
    """Every interface holding one of these addresses, IPv4 and IPv6 alike."""
    v4 = [a for a in chunk if ':' not in a]
    v6 = [a for a in chunk if ':' in a]
    interfaces = []
    if v4:
        interfaces += list(_paginated(
            ec2, 'describe_network_interfaces', 'NetworkInterfaces',
            Filters=[{'Name': 'addresses.private-ip-address', 'Values': v4}]))
    if v6:
        interfaces += list(_paginated(
            ec2, 'describe_network_interfaces', 'NetworkInterfaces',
            Filters=[{'Name': 'ipv6-addresses.ipv6-address', 'Values': v6}]))
    return interfaces


def _addresses_of(interface):
    out = [entry.get('PrivateIpAddress') for entry in interface.get('PrivateIpAddresses', [])]
    out += [entry.get('Ipv6Address') for entry in interface.get('Ipv6Addresses', [])]
    return [address for address in out if address]


def owners_for_addresses(addresses):
    """`address -> (Name tag of what owns it, kind of owner)`, asking only for what
    is missing or stale.

    🔴 THE NAME IS THE IDENTITY OF AN END, NOT THE INSTANCE ID. A batch instance
    that is terminated and launched again, or an Auto Scaling group that goes to
    zero and back, comes back with new ids and the same Name tag -- and the
    diagram draws one box for it, under that name. Series keyed by the tag stay
    ONE series across every replacement; keyed by the id they would break at
    each one, and the box's history would stop at its last instance.

    The tag is the one the generator writes on everything it creates, with the
    box's logical name. An Auto Scaling group propagates it at launch, so every
    instance of the group carries the group's name.

    FROM THE INTERFACE TO ITS OWNER. One `describe_network_interfaces` by address
    says who owns each one -- an instance, a NAT gateway, an endpoint, a load
    balancer, a Lambda function, a database -- and then each kind is asked for
    its Name tag, once per kind per batch.

    An address nobody owns any more, or whose owner has no Name tag, is cached as
    nameless, so the miss is not paid again on every object.
    """
    now = time.time()
    unknown = sorted(
        address for address in addresses
        if address and _owner_by_address.get(address, {}).get('expires_at', 0.0) <= now
    )

    for start in range(0, len(unknown), ADDRESS_CHUNK):
        chunk = unknown[start:start + ADDRESS_CHUNK]
        try:
            interfaces = _describe_interfaces(chunk)
        except Exception as error:  # noqa: BLE001 -- a name is worth less than the run
            # Nothing is cached: a transport failure is not evidence that these
            # addresses have no owner, and caching it as one would hide the
            # resource until the entry expired.
            print('describe_network_interfaces failed for ' + str(len(chunk))
                  + ' addresses: ' + str(error))
            continue

        owned = {}  # address -> (kind, owner id, fallback name, the interface's own Name tag)
        wanted = defaultdict(set)
        for interface in interfaces:
            kind, owner_id, fallback = owner_of_interface(interface)
            own_tag = _name_tag(interface.get('TagSet'))
            for address in _addresses_of(interface):
                owned[address] = (kind, owner_id, fallback, own_tag)
            if owner_id:
                wanted[kind].add(owner_id)

        tags = {}
        for kind, ids in wanted.items():
            try:
                tags.update(_tags_by_id(kind, ids))
            except Exception as error:  # noqa: BLE001 -- the fallback name still answers
                # A missing permission lands here, and would land here again on
                # the next object: the fallback is cached like any other answer.
                print('reading the Name tag of ' + kind + ' failed: ' + str(error))

        databases = {}
        if any(entry[0] == 'rds' for entry in owned.values()):
            try:
                databases = _rds_names_by_address()
            except Exception as error:  # noqa: BLE001
                print('describe_db_instances failed: ' + str(error))

        for address in chunk:
            kind, owner_id, fallback, own_tag = owned.get(address, ('', None, '', ''))
            name = ((tags.get(owner_id, '') if owner_id else '')
                    or databases.get(address, '') or fallback or own_tag)
            _owner_by_address[address] = {'name': name, 'kind': kind, 'expires_at': _expiry()}

    return {address: (entry['name'], entry['kind'])
            for address, entry in _owner_by_address.items() if entry['name'] or entry['kind']}


def vpc_label(vpc_id):
    """The VPC an end sits in, by its Name tag -- the box the diagram draws."""
    return _vpc_name_by_id.get(vpc_id) or UNNAMED
def addresses_in(records, cidrs):
    """Every in-VPC address the batch mentions -- what is worth describing.

    Outside the known CIDRs an end collapses to a single point anyway (§ the
    `internet`/`S3` branch below), so describing those would buy nothing and
    would send the customer's own address space to EC2 one page at a time.
    """
    out = set()
    for record in records:
        for side in ('src', 'dst'):
            # BOTH spellings of the address: the original one names the ends of a
            # conversation, and the rewritten one names the ends of a hop through
            # a middlebox (`name_endpoint` with `hop`), which need a name too.
            for field in ('pkt-' + side + 'addr', side + 'addr'):
                address = value_of(record, field) or ''
                if address and scope_of_address(address, cidrs):
                    out.add(address)
    return out


def known_cidrs():
    """The CIDRs of the VPCs this account can describe, with the customer's role."""
    if _cidrs_cache['blocks'] and _cidrs_cache['expires_at'] > time.time():
        return _cidrs_cache['blocks']

    blocks = []
    paginator = ec2.get_paginator('describe_vpcs')
    for page in paginator.paginate():
        for vpc in page.get('Vpcs', []):
            # The same answer names the VPC: `_vpc` on a series is the box's
            # name, because the VPC id changes whenever the VPC is recreated.
            _vpc_name_by_id[vpc['VpcId']] = _name_tag(vpc.get('Tags'))
            for association in vpc.get('CidrBlockAssociationSet', []):
                block = association.get('CidrBlock')
                if block:
                    blocks.append((ipaddress.ip_network(block), vpc['VpcId']))
            # A dual-stack VPC keeps its IPv6 ranges in a SEPARATE list, and
            # leaving it out is the kind of gap that never looks like one: every
            # IPv6 address then falls outside every known CIDR, so name_endpoint
            # collapses the whole v6 half of the traffic to `internet` and the
            # picture reads as complete.
            for association in vpc.get('Ipv6CidrBlockAssociationSet', []):
                block = association.get('Ipv6CidrBlock')
                if block:
                    blocks.append((ipaddress.ip_network(block), vpc['VpcId']))

    _cidrs_cache['blocks'] = blocks
    _cidrs_cache['expires_at'] = _expiry()
    return blocks


def scope_of_address(address, cidrs):
    """The VPC id an address belongs to, or None when it is outside all of them."""
    try:
        parsed = ipaddress.ip_address(address)
    except ValueError:
        return None
    for network, vpc_id in cidrs:
        if parsed.version == network.version and parsed in network:
            return vpc_id
    return None


def is_private(address):
    try:
        parsed = ipaddress.ip_address(address)
    except ValueError:
        return False
    # 100.64/10 is carrier-grade NAT, which AWS uses in places and which is not the
    # internet either.
    return parsed.is_private or parsed in ipaddress.ip_network('100.64.0.0/10')


def describes_a_hop(record):
    """The record is about a HOP THROUGH A MIDDLEBOX, not about the conversation.

    A flow that crosses a NAT instance, a NAT gateway or any other middlebox is
    written by THAT interface with two pairs of addresses: `srcaddr`/`dstaddr`
    are the hop it saw, and `pkt-srcaddr`/`pkt-dstaddr` are the ends the packet
    itself carries. Equal pairs mean no middlebox was involved.

    🔴 THIS IS THE ONLY PLACE THE NEXT HOP IS NAMED. The sender's own interface
    writes the final destination in BOTH pairs, with `traffic-path=1` -- "left
    through the VPC", which does not say through what. Measured on 2026-09-23,
    a private instance reaching the internet through a NAT instance:

        sender's interface  addr 10.3.1.223 -> 98.87.175.214   pkt the same
        NAT's interface     addr 10.3.1.223 -> 10.3.0.153
                            pkt  10.3.1.223 -> 98.87.175.214

    Reading `pkt-` first answers WHO WAS TALKED TO, which is the right answer for
    an edge between two workloads and the wrong one for a diagram that also draws
    the machine doing the forwarding -- and it is what made a private instance
    look like it talked to nobody at all.
    """
    for side in ('src', 'dst'):
        seen = value_of(record, side + 'addr')
        carried = value_of(record, 'pkt-' + side + 'addr')
        if seen and carried and seen != carried:
            return True
    return False


def arrived_from_outside(record, cidrs):
    """An ingress record whose far end owns no interface here.

    The deduplication in `accumulate` keeps the egress side because a VPC flow
    log writes an internal flow TWICE -- egress at the sender, ingress at the
    receiver. A conversation with the OUTSIDE has no second copy: the far end has
    no interface in this VPC, so the reply from the internet exists only as this
    ingress record. Measured on 2026-09-23: every reply to a public instance
    appeared on that instance's own interface and on no other.

    So for those, dropping the ingress record is not deduplication. It is half of
    every external conversation, and it is why a resource talking to the internet
    was drawn with one arrow while two resources talking to each other got two.
    """
    far = value_of(record, 'pkt-srcaddr') or value_of(record, 'srcaddr') or ''
    return not scope_of_address(far, cidrs)


def capturing_side(record):
    """Which end of the record the interface that WROTE it sits on.

    🔴 `instance-id`, `interface-type` and `instance-tag` describe the capturing
    interface, never the far end. On an egress record that interface is the
    source; on an ingress one it is the destination. Assuming `src` was harmless
    while only egress records were kept -- and wrong the moment the inbound half
    started being kept, because the reply would arrive as
    `internet -> 10.3.0.188`, an ADDRESS, while the outbound half is
    `i-0bb2… -> internet`, an ID. Two spellings of one pair never meet, and the
    conversation would be drawn as two separate things instead of two directions
    of one.
    """
    return 'dst' if value_of(record, 'flow-direction') == 'ingress' else 'src'


def name_endpoint(record, side, cidrs, owners=None, hop=False):
    """Returns the labels for one end: its name, the kind of thing it is, and the
    VPC it sits in.

    🔴 THE NAME IS THE WHOLE IDENTITY. No instance id, no address, no VPC id goes
    out: every one of them changes when the resource is replaced, and a series
    keyed by any of them would break at each replacement while the diagram keeps
    drawing one box. The name is the Name tag the generator writes with the box's
    logical name, and an Auto Scaling group propagates it to every instance it
    launches, so the whole group arrives under the group's name and one series
    holds it across every scale-in and scale-out. See `owners_for_addresses`.

    `_type` is what the end is (instance, nat_gateway, load_balancer, ...), read
    from the interface's owner, so both ends of a conversation are described the
    same way whichever of them captured the record. `_vpc` is the VPC's Name tag.

    Read from the RECORD first where it says more: `ecs-service-name` names a task
    by its service, and `instance-tag`, when the flow log carries it, is the tag
    AWS stamped. Both only describe the interface that CAPTURED the record.
    """
    if hop:
        # THE HOP'S OWN ADDRESSES, and only those: on a hop record the two ends
        # are the two interfaces that handed the packet over.
        address = value_of(record, side + 'addr') or ''
    else:
        address = value_of(record, 'pkt-' + side + 'addr') or value_of(record, side + 'addr') or ''
    scope = scope_of_address(address, cidrs)

    if scope:
        name, kind = (owners or {}).get(address, ('', ''))
        # 🔴 ON A HOP RECORD, `instance-id`, `interface-type`, `instance-tag` and
        # `ecs-service-name` all describe THE INTERFACE THAT CAPTURED IT -- the
        # middlebox -- while the source of an outbound hop is the machine that
        # sent TO it. Naming the source with them would move a sender's whole
        # traffic onto the forwarder: the wrong box, carrying a number that looks
        # right. Both ends of a hop are named through their ADDRESS alone.
        if side == capturing_side(record) and not hop:
            service_name = value_of(record, 'ecs-service-name')
            if service_name:
                name, kind = service_name, 'ecs_service'
            name = value_of(record, 'instance-tag') or name
            if not kind:
                kind = (value_of(record, 'interface-type')
                        or ('instance' if value_of(record, 'instance-id') else ''))
        return {
            side + '_name': name or UNNAMED,
            side + '_type': kind or 'unknown',
            side + '_vpc': vpc_label(scope),
        }

    # Outside every known CIDR the canvas has no box to draw, so the end collapses.
    # Which of the four it collapses to is read from the record, never guessed.
    service = value_of(record, 'pkt-' + side + '-aws-service')
    path = value_of(record, 'traffic-path')
    if service:
        collapsed, kind = service, 'aws_service'
    elif path in ('3', '6'):
        collapsed, kind = 'on-premises', 'on_premises'
    elif path in ('2', '8'):
        collapsed, kind = 'internet', 'internet'
    elif is_private(address):
        # Private and matching no CIDR means the map is incomplete, which is a
        # different statement from "the internet" and the one that is true.
        collapsed, kind = 'unmapped-network', 'unmapped'
    else:
        collapsed, kind = 'internet', 'internet'

    # A collapsed end IS its name -- `S3`, `internet`, `on-premises`.
    return {
        side + '_name': collapsed,
        side + '_type': kind,
        side + '_vpc': 'external',
    }


# The door a flow used to LEAVE the VPC, named from `traffic-path`.
#
# The field is already read above, to tell `internet` from `on-premises`; this
# publishes it. Naming the far end says WHO was talked to, and this says THROUGH
# WHAT -- and only the second one lands on a box that is drawn. An internet
# gateway has no address and no interface, so a conversation that used one is
# invisible on the canvas unless the record is asked. A NAT gateway is the
# opposite case: it owns an ENI, so the hop to it is an ordinary flow between two
# addresses and needs none of this.
#
# ⚠️ ONLY EGRESS RECORDS CARRY IT -- on ingress the field is `-`. That costs
# nothing here, because the aggregator already keeps the egress side only.
EGRESS_PATHS = {
    '1': 'in_vpc',
    '3': 'virtual_private_gateway',
    '4': 'peering',
    '5': 'peering',
    '6': 'local_gateway',
    '7': 'vpc_endpoint',
    '8': 'internet_gateway',
}


def egress_path(record):
    """What a flow went out through, or '' when the record cannot say.

    VALUE 2 IS THE AMBIGUOUS ONE, and it is decided rather than rounded off.
    Outside Nitro the field does not separate an internet gateway from a gateway
    VPC endpoint; Nitro splits those into 8 and 7. A gateway endpoint only ever
    serves S3 and DynamoDB, and those flows carry the service field -- so a
    record WITH a service is genuinely undecidable and says nothing, while one
    without it left through the internet gateway.

    Answering `internet_gateway` for both would draw an edge to a gateway the
    traffic never touched, on a canvas whose whole claim is that it measured.
    """
    path = value_of(record, 'traffic-path')
    if path == '2':
        return '' if value_of(record, 'pkt-dst-aws-service') else 'internet_gateway'
    return EGRESS_PATHS.get(path, '')


# Where an operating system takes a port from when IT opens a connection. 32768
# is the floor Linux uses (32768-60999); Windows and several AWS services start
# higher, so the lowest floor catches all of them.
EPHEMERAL_FLOOR = int(os.environ.get('EPHEMERAL_FLOOR', '32768'))


def service_port(record):
    """The port that names the SERVICE of a conversation, in either direction.

    A request goes TO the service port and its reply comes FROM it, so a label
    keyed by `dstport` named every reply after the client's ephemeral port. That
    cost twice. A new series per connection: 833 of the 1108 series a
    three-machine laboratory wrote in thirty minutes, measured on 2026-09-23. And
    a breakdown that called the download half of an HTTPS conversation "TCP
    ephemeral ports", which says which side picked the port and nothing about
    what was talked.

    The service is the LOWER of the two ports -- the side that did not pick its
    port at random. When both are at or above the ephemeral floor there is nothing
    to name (gRPC on 50051 answered from 40000 is the common case), and the value
    is clamped to the floor itself: a label that would take a new value per
    connection takes exactly one, and the reader names it "ephemeral ports".

    WHAT IT GETS WRONG: a service above 1024 reached through a NAT gateway, which
    picks source ports from 1024 up, is named after the NAT's port whenever that
    one happens to be lower.

    A protocol without ports writes 0 on both sides -- ICMP -- and gets 0, which
    the reader names by the protocol. None when the record carries no port.
    """
    ports = []
    for name in ('srcport', 'dstport'):
        try:
            ports.append(int(value_of(record, name)))
        except (TypeError, ValueError):
            continue
    if not ports:
        return None
    return str(min(min(ports), EPHEMERAL_FLOOR))


# --- aggregation ------------------------------------------------------------------

def accumulate(records, cidrs, diagnostics, owners=None):
    """(bucket, labels) -> [bytes, packets], keeping only the egress direction."""
    totals = defaultdict(lambda: [0, 0])

    for record in records:
        diagnostics['records_seen'] += 1

        status = value_of(record, 'log-status')
        if status in ('NODATA', 'SKIPDATA'):
            diagnostics['records_' + str(status).lower()] += 1
            continue

        # 🔴 A REFUSED PACKET IS NOT TRAFFIC. `REJECT` is a packet a security
        # group or a network ACL dropped: it never reached anything, and on a
        # machine with a public address it is mostly the internet trying ports.
        # Counted, it became forty 40-byte rows -- TCP 3389, 23, 8443, SMTP -- in
        # the breakdown of every reply coming in from outside. Measured on
        # 2026-09-23: 203 of 203 inbound records from outside on a port below the
        # ephemeral floor were REJECT, against security groups that accept only
        # the VPC's own range.
        if value_of(record, 'action') == 'REJECT':
            diagnostics['records_rejected'] += 1
            continue

        if any(value_of(record, name) is None for name in REQUIRED_FIELDS):
            diagnostics['records_missing_required'] += 1
            continue

        # Deduplication. A VPC flow log captures every interface, so an internal flow
        # is written twice -- egress at the sender, ingress at the receiver. Keeping
        # the egress side counts it once. What must NOT be done instead is dividing
        # by two: that assumes both sides were captured, and it is wrong at the edge.
        #
        # A HOP RECORD IS KEPT WHATEVER ITS DIRECTION, and it has to be: the only
        # record naming the next hop of an OUTBOUND flow is the ingress one on
        # the middlebox's interface. It is not a second copy of anything -- the
        # sender's own record says where the packet was going, this one says whom
        # it was handed to, and they land on different pairs of ends. The rule
        # above still holds for every record that describes a conversation.
        hop = describes_a_hop(record)
        direction = value_of(record, 'flow-direction')
        if direction is None:
            diagnostics['records_without_direction'] += 1
        elif direction != 'egress' and not (hop or arrived_from_outside(record, cidrs)):
            continue
        if hop:
            diagnostics['records_hop'] += 1
        elif direction == 'ingress':
            diagnostics['records_inbound_kept'] += 1

        try:
            start = int(value_of(record, 'start'))
            byte_count = int(value_of(record, 'bytes'))
            packet_count = int(value_of(record, 'packets') or 0)
        except (TypeError, ValueError):
            diagnostics['records_unparsable'] += 1
            continue

        bucket = (start // BUCKET_SECONDS) * BUCKET_SECONDS

        labels = {}
        labels.update(name_endpoint(record, 'src', cidrs, owners, hop))
        labels.update(name_endpoint(record, 'dst', cidrs, owners, hop))
        if hop:
            # DECLARED, not left to be inferred from the shape of the other
            # labels. A hop and a direct conversation between the same two boxes
            # are different facts, and without this they would share one series
            # and one number -- traffic passing THROUGH a NAT added to traffic
            # addressed TO it.
            labels['hop'] = '1'

        # The SERVICE, not the destination port: both directions of one
        # conversation carry the same value, and no connection mints a label
        # value of its own. See `service_port`.
        port = service_port(record)
        if port is not None:
            labels['service_port'] = port

        # 🔴 THE PROTOCOL, which the log has always carried and this never read.
        # Without it a share can only be named after a port, and `dstport=0` --
        # what a flow log writes for a protocol that HAS no ports -- was reported
        # as "port 0": the largest slice of an edge, named after something that
        # never existed. Measured at 98% of one edge on 2026-09-23, where it was
        # ping. It also decides what a known port means, because 443 over UDP is
        # not HTTPS.
        protocol = value_of(record, 'protocol')
        if protocol:
            labels['protocol'] = protocol

        # Absent rather than empty when the record cannot say: an empty label is
        # a series of its own in Prometheus, so writing one would split a pair
        # into two series that differ by nothing anybody asked about.
        # NO DOOR ON A HOP. `egress` says which way a flow LEFT the VPC, and a
        # hop names a box inside it -- the far end is already drawn, so there is
        # nothing to substitute. It would also split the two directions of one
        # hop by a label that describes neither: the outbound record carries no
        # `traffic-path` at all and the return one carries `1`.
        egress = '' if hop else egress_path(record)
        if egress:
            labels['egress'] = egress

        key = (bucket, tuple(sorted(labels.items())))
        totals[key][0] += byte_count
        totals[key][1] += packet_count

    return totals


def group_of(labels):
    """The identity the cut competes on: each end's name and the VPC it is in.

    The VPC is part of it only for the ends nothing named: `unnamed` in two VPCs
    is two different things, while a named end is unique on its own.
    """
    as_dict = dict(labels)
    return (
        as_dict.get('src_name', ''), as_dict.get('src_vpc', ''),
        as_dict.get('dst_name', ''), as_dict.get('dst_vpc', ''),
    )


def cut_to_top_n(totals):
    """Top N per bucket, plus one `rest` row so the total still closes.

    IT RANKS PAIRS OF NAMES, and every row of one pair is kept or cut together.
    A pair can still hold several rows -- one per service port, protocol or door
    -- and ranked row by row they would divide their own traffic and a pair that
    is the busiest thing in the VPC could be pushed out by resources that move a
    fraction of what it does, with the `rest` row hiding it because a total that
    still closes looks right.
    """
    by_bucket = defaultdict(list)
    for (bucket, labels), values in totals.items():
        by_bucket[bucket].append((labels, values))

    kept = {}
    for bucket, rows in by_bucket.items():
        group_bytes = defaultdict(int)
        for labels, values in rows:
            group_bytes[group_of(labels)] += values[0]
        ranked = sorted(group_bytes, key=lambda group: group_bytes[group], reverse=True)
        surviving = set(ranked[:TOP_N_PAIRS])

        overflow = []
        for labels, values in rows:
            if group_of(labels) in surviving:
                kept[(bucket, labels)] = values
            else:
                overflow.append(values)

        if overflow:
            rest = [sum(v[0] for v in overflow), sum(v[1] for v in overflow)]
            rest_labels = (
                ('dst_name', 'rest'), ('dst_type', 'rest'), ('dst_vpc', 'aggregate'),
                ('src_name', 'rest'), ('src_type', 'rest'), ('src_vpc', 'aggregate'),
            )
            kept[(bucket, rest_labels)] = rest
    return kept


def write_offset_ms(keys):
    """Where inside the bucket this invocation writes, derived from what it read.

    WHY A SAMPLE IS NOT WRITTEN AT THE BUCKET'S OWN INSTANT. AWS splits one
    capture window across more than one object, and under the S3 notification
    each object is a separate invocation holding only its part of that minute.
    Both writing at the bucket instant means two different values at the same
    instant on the same series, which Prometheus refuses -- and it refuses the
    whole request, so the other series go with it. Measured on 2026-09-22, ten
    minutes into the first run and with a single network interface: bucket
    1790117040 arrived as 2778 bytes in one object and 1401 in another.

    Offset inside the minute, the two become samples of the same series at
    DIFFERENT instants, which is legal, and `sum_over_time` over the window adds
    them back to 4179. That costs nothing on the read side: the series is sparse,
    so the query was already a range query summing the window, never an instant
    query.

    IT COMES FROM THE KEYS AND NOT FROM THE CLOCK, so a retry of the same objects
    writes the same instant with the same value -- and a repeated sample whose
    value matches is accepted, which makes the retry free instead of fatal.

    `hash()` cannot be used: Python randomises it per process, so the same object
    would land on a different instant after every cold start, and the retry would
    stop being idempotent.

    WHAT IT DOES NOT FIX: the top-N cut still runs per invocation, so a pair kept
    in one object and cut in another leaves the minute undercounted, silently.
    Only a writer that sees the whole minute fixes that one.
    """
    digest = hashlib.sha256('\n'.join(sorted(keys)).encode('utf-8')).digest()
    return int.from_bytes(digest[:4], 'big') % (BUCKET_SECONDS * 1000)


def to_series(totals, offset_ms=0):
    """One Prometheus series per (labels, metric), samples ordered by instant.

    Every bucket goes out, the newest one included -- see the note where
    `CUTOFF_SECONDS` used to be for what holding one back cost.
    """
    grouped = defaultdict(list)

    for (bucket, labels), (byte_count, packet_count) in sorted(totals.items()):
        timestamp_ms = bucket * 1000 + offset_ms
        grouped[(labels, METRIC_BYTES)].append((timestamp_ms, byte_count))
        grouped[(labels, METRIC_PACKETS)].append((timestamp_ms, packet_count))

    series = []
    for (labels, metric), samples in grouped.items():
        full = {'__name__': metric}
        # Before the rest, so a label named `account` coming from anywhere else
        # could not quietly take its place.
        if ACCOUNT:
            full['account'] = ACCOUNT
        full.update(dict(labels))
        series.append((full, sorted(samples)))
    return series


def diagnostic_series(diagnostics):
    """The diagnosis travels with the number, and as series it gains history.

    THE INSTANT IS IN MILLISECONDS, and under the S3 notification that is not a
    detail. One delivery drops several objects at once, so several invocations
    run at the same moment, each holding counts of its own. At second precision
    two of them land on the same instant with different values; Prometheus
    refuses that for the WHOLE request, so a single collision loses every edge
    series in the batch, not just the counter -- and the object is gone after the
    two asynchronous retries fail the same way.

    Milliseconds make the collision rare. They do not make it impossible: a
    counter written by every invocation has no instant that is correct for all of
    them. What removes it is the single writer of the study's §12.
    """
    timestamp_ms = int(time.time() * 1000)
    out = []
    for name, value in diagnostics.items():
        out.append((
            {'__name__': 'struct8_flowlog_' + name + '_total'},
            [(timestamp_ms, value)],
        ))
    return out


def report_delivery_delay(key, records, now):
    """Logs how long after its window closed the newest record in a file arrived.

    This is the measurement the study calls blocking. The cut has to sit past the
    tail of this distribution, and a cut set short drops data with nothing but a
    counter to say so -- so until the tail is measured, the cut is a guess.

    It goes to the LOG and not to a series, on purpose. A percentile wants every
    observation, and a gauge written once per invocation would both lose most of
    them and collide with the next invocation's instant, the same way the
    diagnostics above do. The line is JSON so Logs Insights discovers the fields:

      filter metric = "struct8_delivery_delay"
      | stats count(*), avg(delay_seconds), max(delay_seconds),
              pct(delay_seconds, 50), pct(delay_seconds, 95), pct(delay_seconds, 99)
    """
    ends = []
    for record in records:
        raw = value_of(record, 'end')
        if raw is None:
            continue
        try:
            ends.append(int(raw))
        except ValueError:
            continue
    if not ends:
        return
    newest = max(ends)
    print(json.dumps({
        'metric': 'struct8_delivery_delay',
        'key': key,
        'records': len(records),
        'window_end': newest,
        'delay_seconds': now - newest,
    }))


# --- handler ----------------------------------------------------------------------

def keys_from_event(event, bucket):
    """An S3 notification, an explicit key, or a sweep of the delivery prefix."""
    if 'Records' in event and isinstance(event.get('Records'), list):
        keys = []
        for record in event['Records']:
            if 's3' not in record:
                continue
            key = urllib.parse.unquote_plus(record['s3']['object']['key'], encoding='utf-8')
            # Step 1: refuse our own output, whatever the notification filter says.
            if key.startswith(OUTPUT_PREFIX):
                continue
            keys.append(key)
        return keys

    if isinstance(event, dict) and event.get('object_key'):
        return [event['object_key']]

    keys = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket, Prefix=DELIVERY_PREFIX):
        for item in page.get('Contents', []):
            keys.append(item['Key'])
    return keys


def lambda_handler(event, context):
    print('Lambda execution started. Received event: ' + json.dumps(event)[:500])

    bucket = FLOW_BUCKET_NAME
    if not bucket:
        return {'statusCode': 500, 'body': 'Configuration Error: no flow log bucket.'}

    diagnostics = defaultdict(int)
    keys = keys_from_event(event, bucket)
    print('Objects to read: ' + str(len(keys)))

    cidrs = known_cidrs()
    print('Known CIDRs: ' + str([str(network) for network, _ in cidrs]))

    records = []
    read_keys = []
    now = int(time.time())
    for key in keys:
        try:
            from_this_file = list(read_text_object(bucket, key))
            records.extend(from_this_file)
            read_keys.append(key)
            diagnostics['files_processed'] += 1
            report_delivery_delay(key, from_this_file, now)
        except Exception as error:  # noqa: BLE001 -- one bad file must not stop the run
            diagnostics['files_skipped'] += 1
            print('Skipped ' + key + ': ' + str(error))

    # Only the keys actually READ decide the offset. A file that failed is not
    # part of what this invocation is writing, and leaving it out keeps the
    # retry -- which would fail on it again -- landing on the same instant.
    offset_ms = write_offset_ms(read_keys)
    print('write offset: ' + str(offset_ms) + ' ms into each bucket')

    # Only for the addresses this batch mentions and the cache does not already
    # hold. In the steady state of a warm container that list is empty and EC2 is
    # not called at all.
    owners = owners_for_addresses(addresses_in(records, cidrs))
    diagnostics['addresses_named'] = sum(1 for name, _ in owners.values() if name)
    diagnostics['addresses_unnamed'] = sum(1 for name, _ in owners.values() if not name)

    totals = cut_to_top_n(accumulate(records, cidrs, diagnostics, owners))
    edge_series = to_series(totals, offset_ms)

    if not edge_series:
        print('Nothing to write. Diagnostics: ' + json.dumps(dict(diagnostics)))
        return {'statusCode': 200, 'body': 'nothing to write'}

    write_series(edge_series, diagnostics)
    # The diagnostics go in a request of their own, AFTER the edges, so a refused
    # edge batch does not take with it the numbers that explain the refusal.
    write_series(diagnostic_series(diagnostics), diagnostics)

    print('Diagnostics: ' + json.dumps(dict(diagnostics)))

    return {
        'statusCode': 200,
        'body': json.dumps({'series': len(edge_series), 'diagnostics': dict(diagnostics)}),
    }


# --- bench ------------------------------------------------------------------------
#
# Reading a real file by hand is what proves the part that decides everything: whether
# an address becomes a resource. It needs no pipeline and no workspace.
#
#   python ProcessFlowLogs.py <a local flow log file>

if __name__ == '__main__':
    import sys

    path = sys.argv[1]
    raw = open(path, 'rb').read()
    if path.endswith('.gz'):
        raw = gzip.decompress(raw)
    text = io.StringIO(raw.decode('utf-8', errors='replace'))
    mapping = field_map_from_header(text.readline())
    print('field map: ' + json.dumps(mapping))

    rows = []
    for line in text:
        parts = line.split()
        if len(parts) >= len(mapping):
            rows.append({name: parts[index] for name, index in mapping.items()})

    bench_diagnostics = defaultdict(int)
    totals = accumulate(rows, [], bench_diagnostics)
    print('buckets x pairs: ' + str(len(totals)))
    print('diagnostics: ' + json.dumps(dict(bench_diagnostics)))
    for (bucket, labels), values in sorted(totals.items())[:20]:
        print(str(bucket) + '  ' + str(values) + '  ' + json.dumps(dict(labels)))
