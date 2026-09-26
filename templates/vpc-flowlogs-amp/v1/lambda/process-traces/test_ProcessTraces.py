"""Proves ProcessTraces without touching AWS.

Run it before deploying anything:

    python test_ProcessTraces.py

The X-Ray answers below copy the shape measured on 2026-09-25 in a real account: the
`client` node named like the stage it calls, the stage -> Lambda edge with a count and
a histogram at -0.0, and a series point stamped with the END of its period. What was
not measured yet (a queue edge, a table named by ADOT) is marked where it is used.

Exit code is 1 on any failure, so this can gate a pipeline.
"""

import datetime
import importlib.util
import json
import os
import struct
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, 'ProcessTraces.py')

# The module reads its configuration at import. Fixed here, so the machine running
# the test does not decide the result.
for name in list(os.environ):
    if name.startswith('AWS_XRAY_GROUP') or name in ('XRAY_GROUPS', 'PROMETHEUS_ENDPOINT'):
        del os.environ[name]
os.environ.update({
    'AWS_REGION': 'us-east-1',
    'ACCOUNT': '123456789012',
    'AWS_PROMETHEUS_WORKSPACE_ENDPOINT_0':
        'https://aps-workspaces.sa-east-1.amazonaws.com/workspaces/ws-1234/',
    'BUCKET_SECONDS': '300',
    'SETTLE_SECONDS': '120',
})


# The module builds clients on demand. Stub boto3: nothing here talks to AWS.
class _NoAws:
    def __getattr__(self, _):
        raise RuntimeError('no AWS on the bench')


sys.modules.setdefault('boto3', type(sys)('boto3'))
sys.modules['boto3'].client = lambda *a, **k: _NoAws()
sys.modules['boto3'].Session = lambda *a, **k: _NoAws()
for name in ('botocore', 'botocore.auth', 'botocore.awsrequest', 'botocore.config'):
    sys.modules.setdefault(name, type(sys)(name))
sys.modules['botocore.auth'].SigV4Auth = object
sys.modules['botocore.awsrequest'].AWSRequest = object
sys.modules['botocore.config'].Config = lambda *a, **k: None

spec = importlib.util.spec_from_file_location('process_traces', TARGET)
ptr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ptr)

failures = []


def check(name, ok, detail=''):
    print(('  ok    ' if ok else '  FAIL  ') + name + (('   ' + detail) if detail else ''))
    if not ok:
        failures.append(name)



def at(text):
    return datetime.datetime.fromisoformat(text.replace('Z', '+00:00'))


def epoch(text):
    return int(at(text).timestamp())


# --- protobuf and snappy, decoded by readers written from the formats -------------

def read_varint(buffer, i):
    value, shift = 0, 0
    while True:
        byte = buffer[i]
        i += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, i
        shift += 7


def decode(buffer):
    out, i = [], 0
    while i < len(buffer):
        key, i = read_varint(buffer, i)
        field, wire = key >> 3, key & 7
        if wire == 0:
            value, i = read_varint(buffer, i)
        elif wire == 1:
            value = struct.unpack('<d', buffer[i:i + 8])[0]
            i += 8
        elif wire == 2:
            length, i = read_varint(buffer, i)
            value = buffer[i:i + length]
            i += length
        else:
            raise ValueError('unexpected wire type ' + str(wire))
        out.append((field, wire, value))
    return out


def snappy_decompress(buffer):
    declared, i = read_varint(buffer, 0)
    out = bytearray()
    while i < len(buffer):
        tag = buffer[i]
        i += 1
        if tag & 0x03:
            raise ValueError('this encoder emits literals only')
        n = tag >> 2
        if n < 60:
            length = n + 1
        else:
            extra = n - 59
            length = int.from_bytes(buffer[i:i + extra], 'little') + 1
            i += extra
        out += buffer[i:i + length]
        i += length
    return bytes(out), declared


print('\n=== remote write encoding (a copy of ProcessFlowLogs, tested again) ===')
encoded = ptr.encode_write_request([
    ({'__name__': 'struct8_trace_requests', 'src_name': 'client', 'dst_name': 'prod2'},
     [(1790422200000, 4.0)]),
])
series = decode(decode(encoded)[0][2])
labels = [v for (f, w, v) in series if f == 1]
samples = [decode(v) for (f, w, v) in series if f == 2]
check('three labels and one sample', len(labels) == 3 and len(samples) == 1)
check('the sample carries the value and the instant',
      [v for (f, w, v) in samples[0] if f == 1] == [4.0]
      and [v for (f, w, v) in samples[0] if f == 2] == [1790422200000])
for n in (0, 1, 60, 61, 256, 257, 70000):
    data = bytes((i * 7 + n) % 251 for i in range(n))
    back, declared = snappy_decompress(ptr.snappy_literal_only(data))
    check('snappy round-trip of ' + str(n) + ' bytes', back == data and declared == n)


print('\n=== the workspace region signs, not the function region ===')
check('read from the workspace address',
      ptr.workspace_region(ptr.WORKSPACE_ENDPOINT) == 'sa-east-1',
      ptr.workspace_region(ptr.WORKSPACE_ENDPOINT))
check('an address that does not name one falls back to the function region',
      ptr.workspace_region('https://example.com/') == 'us-east-1')


print('\n=== which groups ===')
check('nothing configured reads Default in its own region',
      ptr.groups_to_read({}, 'us-east-1') == [('us-east-1', 'Default')])
groups = ptr.groups_to_read({
    'XRAY_GROUPS': 'sa-east-1/proj-a, proj-b  eu-west-1/proj-c moon/x',
    'AWS_XRAY_GROUP_NAME_0': 'proj-b',
    'AWS_XRAY_GROUP_TARGET_NAME_1': 'proj-d',
}, 'us-east-1')
check('region/group, a bare group in the own region, and wired groups, without repeats',
      groups == [('sa-east-1', 'proj-a'), ('us-east-1', 'proj-b'), ('eu-west-1', 'proj-c'),
                 ('us-east-1', 'proj-d')], str(groups))


print('\n=== which block ===')
BLOCK_END = epoch('2026-09-26T11:30:00Z')
BLOCK_START = BLOCK_END - 300
d = defaultdict(int)
fired = {'time': '2026-09-26T11:35:00Z'}
check('fired at 11:35 with a 120 s settle, the run reads (11:25, 11:30]',
      ptr.blocks_to_read(fired, epoch('2026-09-26T11:35:04Z'), d) == (BLOCK_END, 1))
check('the same event started three minutes late reads the same block',
      ptr.blocks_to_read(fired, epoch('2026-09-26T11:38:00Z'), d) == (BLOCK_END, 1))
check('the next firing reads the next block',
      ptr.blocks_to_read({'time': '2026-09-26T11:40:00Z'}, epoch('2026-09-26T11:40:01Z'), d)
      == (BLOCK_END + 300, 1))
check('a cron firing on the five minutes is far from any boundary',
      d['schedule_near_block_edge'] == 0)
ptr.blocks_to_read({'time': '2026-09-26T11:32:05Z'}, epoch('2026-09-26T11:32:06Z'), d)
check('a firing 5 s past a boundary once the settle is taken off is counted',
      d['schedule_near_block_edge'] == 1)
check('without `time` the clock decides',
      ptr.blocks_to_read({}, epoch('2026-09-26T11:35:10Z'), d) == (BLOCK_END, 1))
check('`block_end` by hand is rounded down to a boundary',
      ptr.blocks_to_read({'block_end': '2026-09-26T11:27:00Z'}, epoch('2026-09-26T12:00:00Z'), d)
      == (BLOCK_END - 300, 1))
check('and never names a block that has not settled',
      ptr.blocks_to_read({'block_end': '2026-09-26T13:00:00Z'}, epoch('2026-09-26T11:35:00Z'), d)
      == (BLOCK_END, 1))
check('`blocks` stops at the 6 hours one graph call covers',
      ptr.blocks_to_read({'blocks': 1000}, epoch('2026-09-26T11:35:00Z'), d)[1] == 72)
check('an epoch in milliseconds is read as such',
      ptr.parse_instant(1790422200000) == 1790422200.0)


print('\n=== what one point becomes ===')


def point(stamp, total, histogram, seconds=None, errors=0, throttles=0, faults=0):
    return {
        'Timestamp': at(stamp),
        'EdgeSummaryStatistics': {
            'OkCount': total - errors - faults,
            'ErrorStatistics': {'ThrottleCount': throttles, 'OtherCount': errors - throttles,
                                'TotalCount': errors},
            'FaultStatistics': {'OtherCount': faults, 'TotalCount': faults},
            'TotalCount': total,
            'TotalResponseTime': seconds if seconds is not None else 0.0,
        },
        'ServiceForecastStatistics': {},
        'ResponseTimeHistogram': [{'Value': v, 'Count': c} for v, c in histogram],
    }


# Measured: the stage -> Lambda edge when the function records nothing of its own.
untimed = point('2026-09-26T11:30:00Z', 4, [(-0.0, 4)])
values, buckets = ptr.values_of_point(untimed)
check('a count without a time is written as the count alone',
      values == {'struct8_trace_requests': 4} and buckets is None, str(values))

# Measured: client -> stage, four requests.
entry = point('2026-09-26T11:30:00Z', 4, [(0.552, 1), (0.069, 1), (0.118, 1), (0.055, 1)], 0.794)
values, buckets = ptr.values_of_point(entry)
check('sum and count of the response time',
      values.get('struct8_trace_response_seconds_sum') == 0.794
      and values.get('struct8_trace_response_seconds_count') == 4, str(values))
by_le = dict(buckets)
check('the histogram is cumulative over fixed bounds',
      (by_le['0.05'], by_le['0.1'], by_le['0.25'], by_le['0.5'], by_le['1.0'], by_le['+Inf'])
      == (0, 2, 3, 3, 4, 4), str(buckets))
check('the bounds are the same on every point, so blocks add up',
      [le for le, _ in buckets] == [repr(float(b)) for b in ptr.LE_BOUNDS] + ['+Inf'])
check('no error, fault or throttle sample when there were none',
      not {'struct8_trace_errors', 'struct8_trace_faults', 'struct8_trace_throttles'} & set(values))

failing = point('2026-09-26T11:30:00Z', 10, [(0.2, 10)], 2.0, errors=3, throttles=1, faults=2)
values, _ = ptr.values_of_point(failing)
check('errors, faults and throttles from their own statistics',
      (values.get('struct8_trace_errors'), values.get('struct8_trace_faults'),
       values.get('struct8_trace_throttles')) == (3, 2, 1), str(values))

mixed = point('2026-09-26T11:30:00Z', 5, [(-0.0, 2), (0.1, 3)], 0.3)
values, buckets = ptr.values_of_point(mixed)
check('only the requests that carry a time enter the time series',
      values['struct8_trace_requests'] == 5 and values['struct8_trace_response_seconds_count'] == 3
      and dict(buckets)['+Inf'] == 3, str(values))


# --- fakes ------------------------------------------------------------------------

class FakeXRay:
    def __init__(self, services, points, fail=()):
        self.services, self.points, self.fail, self.calls = services, points, set(fail), []

    def get_service_graph(self, **kwargs):
        self.calls.append(('graph', kwargs))
        if 'graph' in self.fail:
            raise RuntimeError('AccessDeniedException')
        return {'Services': self.services, 'ContainsOldGroupVersions': False}

    def get_time_series_service_statistics(self, **kwargs):
        self.calls.append(('series', kwargs))
        expression = kwargs['EntitySelectorExpression']
        if expression in self.fail:
            raise RuntimeError('ThrottlingException')
        pages = self.points.get(expression, [[]])
        index = int(kwargs.get('NextToken') or 0)
        answer = {'TimeSeriesServiceStatistics': pages[index]}
        if index + 1 < len(pages):
            answer['NextToken'] = str(index + 1)
        return answer


class FakeTagging:
    def __init__(self, names, explode=False):
        self.names, self.explode, self.calls = names, explode, []

    def get_resources(self, ResourceARNList):
        self.calls.append(list(ResourceARNList))
        if self.explode:
            raise RuntimeError('AccessDeniedException')
        return {'ResourceTagMappingList': [
            {'ResourceARN': arn, 'Tags': [{'Key': 'Name', 'Value': self.names[arn]}]}
            for arn in ResourceARNList if arn in self.names]}


class FakeApiGateway:
    def __init__(self, items):
        self.items, self.calls = items, 0

    def get_paginator(self, operation):
        assert operation == 'get_rest_apis'
        fake = self

        class _Paginator:
            def paginate(self):
                fake.calls += 1
                return [{'items': fake.items}]
        return _Paginator()


def install(region, xray=None, tagging=None, apigateway=None):
    for service, fake in (('xray', xray), ('resourcegroupstaggingapi', tagging),
                          ('apigateway', apigateway)):
        if fake is not None:
            ptr._clients[(service, region)] = fake


def reset():
    ptr._clients.clear()
    ptr._name_by_arn.clear()
    ptr._rest_apis.clear()


LAMBDA_ARN = 'arn:aws:lambda:us-east-1:123456789012:function:api-handler'
WORKER_ARN = 'arn:aws:lambda:us-east-1:123456789012:function:async-worker'
STAGE_ARN = 'arn:aws:apigateway:us-east-1::/restapis/abc123/stages/prod2'
TABLE_ARN = 'arn:aws:dynamodb:us-east-1:123456789012:table/orders-table-123456789012'
QUEUE_ARN = 'arn:aws:sqs:us-east-1:123456789012:order-processing'
NAMES = {
    LAMBDA_ARN: 'api-handler',
    WORKER_ARN: 'async-worker',
    STAGE_ARN: 'prod2',
    # A table whose name the generator extended: the tag is the box's name.
    TABLE_ARN: 'orders-table',
    QUEUE_ARN: 'order-processing',
}

# The graph of the demo box on the diagram. The client, stage and first Lambda node
# are the measured shape. With active tracing the function shows twice, as the Lambda
# service and as the function. The table and queue nodes are the documented names of
# the X-Ray SDK; what ADOT calls them is not measured yet, and neither is whether a
# queue -> consumer edge comes as `link`.
SERVICES = [
    {'ReferenceId': 0, 'Name': 'api-handler', 'Type': 'AWS::Lambda',
     'Edges': [{'ReferenceId': 3, 'SummaryStatistics': {'TotalCount': 4}}]},
    {'ReferenceId': 1, 'Name': 'xray-demo-api/prod2', 'Type': 'AWS::ApiGateway::Stage', 'Root': True,
     'Edges': [{'ReferenceId': 0, 'SummaryStatistics': {'TotalCount': 4}, 'Aliases': []}]},
    {'ReferenceId': 2, 'Name': 'xray-demo-api/prod2', 'Type': 'client',
     'Edges': [{'ReferenceId': 1, 'SummaryStatistics': {'TotalCount': 4}}]},
    {'ReferenceId': 3, 'Name': 'api-handler', 'Type': 'AWS::Lambda::Function',
     'Edges': [{'ReferenceId': 4, 'SummaryStatistics': {'TotalCount': 4}},
               {'ReferenceId': 5, 'SummaryStatistics': {'TotalCount': 1}}]},
    {'ReferenceId': 4, 'Name': 'orders-table-123456789012', 'Type': 'AWS::DynamoDB::Table', 'Edges': []},
    {'ReferenceId': 5, 'Name': 'order-processing', 'Type': 'AWS::SQS::Queue',
     'Edges': [{'ReferenceId': 6, 'EdgeType': 'link', 'SummaryStatistics': {'TotalCount': 1}}]},
    {'ReferenceId': 6, 'Name': 'async-worker', 'Type': 'AWS::Lambda', 'Edges': []},
    {'ReferenceId': 7, 'Name': 'api.example.com', 'Type': 'remote', 'Edges': []},
    {'ReferenceId': 8, 'Name': 'DynamoDB', 'Type': 'AWS::DynamoDB', 'Edges': []},
]


def edge(a, b):
    return ('edge(id(name: "%s", type: "%s"), id(name: "%s", type: "%s"))'
            % (a['Name'], a['Type'], b['Name'], b['Type']))


S = {s['ReferenceId']: s for s in SERVICES}
CLIENT_TO_STAGE = edge(S[2], S[1])
STAGE_TO_LAMBDA = edge(S[1], S[0])
LAMBDA_TO_FUNCTION = edge(S[0], S[3])
FUNCTION_TO_TABLE = edge(S[3], S[4])
FUNCTION_TO_QUEUE = edge(S[3], S[5])
QUEUE_TO_WORKER = edge(S[5], S[6])

POINTS = {
    # The point of the block before this one is outside (start, end] and is dropped.
    CLIENT_TO_STAGE: [[point('2026-09-26T11:25:00Z', 1, [(0.2, 1)], 0.2),
                       point('2026-09-26T11:30:00Z', 4,
                             [(0.552, 1), (0.069, 1), (0.118, 1), (0.055, 1)], 0.794)]],
    STAGE_TO_LAMBDA: [[point('2026-09-26T11:30:00Z', 4, [(-0.0, 4)])]],
    # Two pages, the way the series answers at period 60.
    FUNCTION_TO_TABLE: [[], [point('2026-09-26T11:30:00Z', 4, [(0.012, 3), (0.3, 1)], 0.336, faults=1)]],
    FUNCTION_TO_QUEUE: [[point('2026-09-26T11:30:00Z', 1, [(0.02, 1)], 0.02)]],
    QUEUE_TO_WORKER: [[point('2026-09-26T11:30:00Z', 1, [(-0.0, 1)])]],
}


print('\n=== naming the ends ===')
reset()
tagging = FakeTagging(NAMES)
apis = FakeApiGateway([{'id': 'abc123', 'name': 'xray-demo-api'}, {'id': 'zzz', 'name': 'other'}])
install('us-east-1', tagging=tagging, apigateway=apis)
d = defaultdict(int)
ends = ptr.describe_ends(SERVICES, 'us-east-1', '123456789012', d)
check('the caller from outside is `client`, not the stage it shares a name with',
      ends[2] == {'name': 'client', 'type': 'client', 'arn': ''}, str(ends[2]))
check('a stage gets its ARN through the API id, and its box name from the tag',
      ends[1] == {'name': 'prod2', 'type': 'api_gateway_stage', 'arn': STAGE_ARN}, str(ends[1]))
check('the Lambda service node and the function node are the same end',
      ends[0] == ends[3] == {'name': 'api-handler', 'type': 'lambda', 'arn': LAMBDA_ARN}, str(ends[0]))
check('a table is named by its Name tag, not by its name in the cloud',
      ends[4] == {'name': 'orders-table', 'type': 'dynamodb_table', 'arn': TABLE_ARN}, str(ends[4]))
check('a remote host keeps its host name and has no ARN',
      ends[7] == {'name': 'api.example.com', 'type': 'remote', 'arn': ''}, str(ends[7]))
check('a node of a whole service has no ARN, and a type from its X-Ray type',
      ends[8] == {'name': 'DynamoDB', 'type': 'dynamodb', 'arn': ''}, str(ends[8]))
check('one tag call for every ARN of the graph', len(tagging.calls) == 1, str(len(tagging.calls)))

ptr.describe_ends(SERVICES, 'us-east-1', '123456789012', d)
check('inside the timer the tags and the API ids are not read again',
      len(tagging.calls) == 1 and apis.calls == 1, str((len(tagging.calls), apis.calls)))

reset()
install('us-east-1', tagging=FakeTagging(NAMES),
        apigateway=FakeApiGateway([{'id': 'abc123', 'name': 'xray-demo-api'},
                                   {'id': 'def456', 'name': 'xray-demo-api'}]))
d = defaultdict(int)
ends = ptr.describe_ends(SERVICES, 'us-east-1', '123456789012', d)
check('two APIs with one name: no ARN rather than a guess, and the stage keeps its own name',
      ends[1] == {'name': 'prod2', 'type': 'api_gateway_stage', 'arn': ''}
      and d['stages_without_arn'] == 1, str(ends[1]))

reset()
denied = FakeTagging(NAMES, explode=True)
install('us-east-1', tagging=denied, apigateway=FakeApiGateway([]))
d = defaultdict(int)
ends = ptr.describe_ends(SERVICES, 'us-east-1', '123456789012', d)
check('without the tags an end falls back to the resource name',
      ends[4]['name'] == 'orders-table-123456789012' and d['tag_reads_failed'] == 1, str(ends[4]))
ptr._clients[('resourcegroupstaggingapi', 'us-east-1')] = FakeTagging(NAMES)
ends = ptr.describe_ends(SERVICES, 'us-east-1', '123456789012', d)
check('and a failed read is not cached: the next run gets the tag',
      ends[4]['name'] == 'orders-table', str(ends[4]))

check('an ARN in another partition is spelled with it',
      ptr.arn_of({'Name': 'f', 'Type': 'AWS::Lambda'}, 'cn-north-1', '1', d)
      == 'arn:aws-cn:lambda:cn-north-1:1:function:f')
check('the account a node reports wins over the reader\'s own',
      ptr.arn_of({'Name': 'f', 'Type': 'AWS::Lambda', 'AccountId': '999'}, 'us-east-1', '1', d)
      == 'arn:aws:lambda:us-east-1:999:function:f')
check('a quote in a name makes the edge unselectable instead of a broken expression',
      ptr.selector({'Name': 'a"b', 'Type': 'remote'}, S[1]) is None)
check('the selector has the measured form', STAGE_TO_LAMBDA == ptr.selector(S[1], S[0]))


print('\n=== one group, one block ===')
reset()
xray = FakeXRay(SERVICES, POINTS)
install('us-east-1', xray=xray, tagging=FakeTagging(NAMES),
        apigateway=FakeApiGateway([{'id': 'abc123', 'name': 'xray-demo-api'}]))
totals = defaultdict(lambda: defaultdict(float))
d = defaultdict(int)
added = ptr.read_group('us-east-1', 'serverless-demo-traces', BLOCK_START, BLOCK_END,
                       '123456789012', totals, d, lambda: 60000)
graph_calls = [c for c in xray.calls if c[0] == 'graph']
series_calls = [c[1]['EntitySelectorExpression'] for c in xray.calls if c[0] == 'series']
check('one graph call, over exactly the block, filtered by the group',
      len(graph_calls) == 1
      and graph_calls[0][1]['StartTime'] == at('2026-09-26T11:25:00Z')
      and graph_calls[0][1]['EndTime'] == at('2026-09-26T11:30:00Z')
      and graph_calls[0][1]['GroupName'] == 'serverless-demo-traces', str(graph_calls))
check('the Lambda service handing over to its own function is not read',
      LAMBDA_TO_FUNCTION not in series_calls and d['edges_inside_one_resource'] == 1)
check('every other edge is read, page after page, with the block as the period',
      sorted(series_calls) == sorted([CLIENT_TO_STAGE, STAGE_TO_LAMBDA, FUNCTION_TO_TABLE,
                                      FUNCTION_TO_TABLE, FUNCTION_TO_QUEUE, QUEUE_TO_WORKER])
      and all(c[1]['Period'] == 300 for c in xray.calls if c[0] == 'series'), str(series_calls))
check('a point of the block before is dropped', d['points_outside_window'] == 1)
check('five points go in', added == 5, str(added))

by_metric = defaultdict(list)
for labels, samples in ptr.to_series(totals):
    by_metric[labels['__name__']].append((labels, samples))


def find(metric, **want):
    return [(labels, samples) for labels, samples in by_metric[metric]
            if all(labels.get(k) == v for k, v in want.items())]


entry_series = find('struct8_trace_requests', src_name='client', dst_name='prod2')
check('client -> stage lands on the stage by name and ARN',
      len(entry_series) == 1 and entry_series[0][0].get('dst_arn') == STAGE_ARN
      and 'src_arn' not in entry_series[0][0], str(entry_series))
check('each sample sits at the end of its block',
      entry_series and entry_series[0][1] == [(BLOCK_END * 1000, 4.0)], str(entry_series))
labels_order = list(entry_series[0][0].keys()) if entry_series else []
check('__name__ first, then the labels in order',
      labels_order[0] == '__name__' and labels_order[1:] == sorted(labels_order[1:]), str(labels_order))
check('with account, region and group on every series',
      all(l.get('account') == '123456789012' and l.get('region') == 'us-east-1'
          and l.get('xray_group') == 'serverless-demo-traces'
          for metric in by_metric.values() for l, _ in metric))
check('stage -> Lambda: a count and no time series',
      find('struct8_trace_requests', src_name='prod2', dst_name='api-handler')
      and not find('struct8_trace_response_seconds_count', src_name='prod2', dst_name='api-handler')
      and not find('struct8_trace_response_seconds_bucket', src_name='prod2'))
check('function -> table: the fault, and the table by its box name',
      find('struct8_trace_faults', src_name='api-handler', dst_name='orders-table')[0][1]
      == [(BLOCK_END * 1000, 1.0)])
check('twelve bucket series per timed edge',
      len(find('struct8_trace_response_seconds_bucket', src_name='client')) == 12)
check('queue -> consumer carries the edge type X-Ray gave it',
      find('struct8_trace_requests', src_name='order-processing')[0][0].get('edge_type') == 'link')
check('an edge without a type is a request',
      entry_series[0][0].get('edge_type') == 'request')

print('\n=== limits and failures inside a group ===')
reset()
xray = FakeXRay(SERVICES, POINTS, fail=[FUNCTION_TO_QUEUE])
install('us-east-1', xray=xray, tagging=FakeTagging(NAMES), apigateway=FakeApiGateway([]))
d = defaultdict(int)
ptr.read_group('us-east-1', 'Default', BLOCK_START, BLOCK_END, '123456789012',
               defaultdict(lambda: defaultdict(float)), d, lambda: 60000)
check('an edge that fails is counted and the others are still read',
      d['edges_failed'] == 1 and d['edges_read'] == 4, str(dict(d)))
check('`Default` sends no group: it is every trace',
      all('GroupName' not in c[1] for c in xray.calls))

reset()
xray = FakeXRay(SERVICES, POINTS)
install('us-east-1', xray=xray, tagging=FakeTagging(NAMES), apigateway=FakeApiGateway([]))
d = defaultdict(int)
ptr.read_group('us-east-1', 'Default', BLOCK_START, BLOCK_END, '123456789012',
               defaultdict(lambda: defaultdict(float)), d, lambda: 1000)
check('with the timeout close, no edge is started',
      d['edges_skipped_for_time'] == 5 and not [c for c in xray.calls if c[0] == 'series'])

limit_was = ptr.MAX_EDGES_PER_GROUP
ptr.MAX_EDGES_PER_GROUP = 2
reset()
xray = FakeXRay(SERVICES, POINTS)
install('us-east-1', xray=xray, tagging=FakeTagging(NAMES), apigateway=FakeApiGateway([]))
d = defaultdict(int)
ptr.read_group('us-east-1', 'Default', BLOCK_START, BLOCK_END, '123456789012',
               defaultdict(lambda: defaultdict(float)), d, lambda: 60000)
read = [c[1]['EntitySelectorExpression'] for c in xray.calls if c[0] == 'series']
check('over the limit, the busiest edges are kept, and an edge inside one box takes no place',
      d['edges_over_limit'] == 3 and sorted(read) == sorted([STAGE_TO_LAMBDA, CLIENT_TO_STAGE]),
      str((dict(d), read)))
ptr.MAX_EDGES_PER_GROUP = limit_was


print('\n=== the handler ===')


class Context:
    invoked_function_arn = 'arn:aws:lambda:sa-east-1:123456789012:function:process-traces'

    def get_remaining_time_in_millis(self):
        return 60000


written = []
remote_write_was = ptr.remote_write
ptr.remote_write = lambda batch: written.append(batch) or 200

reset()
os.environ['XRAY_GROUPS'] = 'us-east-1/serverless-demo-traces sa-east-1/other-project'
install('us-east-1', xray=FakeXRay(SERVICES, POINTS), tagging=FakeTagging(NAMES),
        apigateway=FakeApiGateway([{'id': 'abc123', 'name': 'xray-demo-api'}]))
install('sa-east-1', xray=FakeXRay([], {}, fail=['graph']))
answer = ptr.lambda_handler({'time': '2026-09-26T11:35:00Z'}, Context())
body = json.loads(answer['body'])
check('a region that fails does not stop the other',
      body['diagnostics'].get('groups_read') == 1 and body['diagnostics'].get('groups_failed') == 1,
      str(body['diagnostics']))
check('the edges go first, the run\'s counts in a request of their own',
      len(written) == 2
      and not [l for l, _ in written[0] if l['__name__'].startswith('struct8_trace_aggregator_')
               or l['__name__'] == 'struct8_trace_bucket_seconds']
      and written[1][-1][0] == {'__name__': 'struct8_trace_bucket_seconds'})
check('the block goes out as a gauge the reader steps by',
      written[1][-1][1][0][1] == 300)
check('the counts are named after the aggregator',
      any(l['__name__'] == 'struct8_trace_aggregator_groups_failed_total' for l, _ in written[1]))

written.clear()
reset()
install('us-east-1', xray=FakeXRay(SERVICES, POINTS), tagging=FakeTagging(NAMES),
        apigateway=FakeApiGateway([]))
install('sa-east-1', xray=FakeXRay([], {}))
answer = ptr.lambda_handler({'time': '2026-09-26T11:35:00Z', 'dry_run': True}, Context())
check('a dry run writes nothing', written == [] and answer['statusCode'] == 200)

endpoint_was = ptr.WORKSPACE_ENDPOINT
ptr.WORKSPACE_ENDPOINT = ''
reset()
untouched = FakeXRay(SERVICES, POINTS)
install('us-east-1', xray=untouched)
answer = ptr.lambda_handler({'time': '2026-09-26T11:35:00Z'}, Context())
check('without a workspace it stops before reading X-Ray',
      answer['statusCode'] == 500 and untouched.calls == [])
ptr.WORKSPACE_ENDPOINT = endpoint_was
del os.environ['XRAY_GROUPS']
ptr.remote_write = remote_write_was


print('\n=== a refused batch goes out one series at a time ===')


def refusing(batch):
    if len(batch) > 1:
        raise ptr.RemoteWriteRefused(400, 'duplicate sample for timestamp')
    if batch[0][0].get('dst_name') == 'bad':
        raise ptr.RemoteWriteRefused(400, 'duplicate sample for timestamp')
    return 200


ptr.remote_write = refusing
d = defaultdict(int)
ptr.write_series([({'__name__': 'm', 'dst_name': 'good'}, [(1, 1.0)]),
                  ({'__name__': 'm', 'dst_name': 'bad'}, [(1, 1.0)])], d)
check('one refused series, the other written',
      d['batches_refused'] == 1 and d['series_refused'] == 1 and d['series_written_singly'] == 1,
      str(dict(d)))


def server_error(batch):
    raise ptr.RemoteWriteRefused(503, 'unavailable')


ptr.remote_write = server_error
try:
    ptr.write_series([({'__name__': 'm'}, [(1, 1.0)])], defaultdict(int))
    check('a 5xx fails the run so Lambda retries it', False)
except ptr.RemoteWriteRefused:
    check('a 5xx fails the run so Lambda retries it', True)

sizes = []
ptr.remote_write = lambda batch: sizes.append(len(batch)) or 200
ptr.write_series([({'__name__': 'm', 'i': str(i)}, [(1, 1.0)]) for i in range(1201)], defaultdict(int))
check('batches of at most 500 series', sizes == [500, 500, 201], str(sizes))
ptr.remote_write = remote_write_was


print('\n' + ('ALL PASSED' if not failures else str(len(failures)) + ' FAILED: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
