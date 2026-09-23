"""Proves the risky parts of ProcessFlowLogs without touching AWS.

Run it before deploying anything:

    python test_ProcessFlowLogs.py

Two of the checks matter more than the rest. The protobuf is decoded back by a
wire-level reader written from the format, not from the encoder, so a wrong field
number or wire type shows up instead of being agreed on twice. The snappy block is
fed to a decompressor that implements the copy elements this encoder never emits,
so a malformed literal header cannot pass by being read the same way it was written.

Exit code is 1 on any failure, so this can gate a pipeline.
"""

import importlib.util
import io
import ipaddress
import os
import struct
import sys
import time
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, 'ProcessFlowLogs.py')


# The module builds boto3 clients at import time. Stub them: nothing here talks to AWS.
class _NoAws:
    def __getattr__(self, _):
        raise RuntimeError('no AWS on the bench')


sys.modules.setdefault('boto3', type(sys)('boto3'))
sys.modules['boto3'].client = lambda *a, **k: _NoAws()
sys.modules['boto3'].Session = lambda *a, **k: _NoAws()
for name in ('botocore', 'botocore.auth', 'botocore.awsrequest'):
    sys.modules.setdefault(name, type(sys)(name))
sys.modules['botocore.auth'].SigV4Auth = object
sys.modules['botocore.awsrequest'].AWSRequest = object

spec = importlib.util.spec_from_file_location('process_flow_logs', TARGET)
pfl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pfl)

failures = []


def check(name, ok, detail=''):
    print(('  ok    ' if ok else '  FAIL  ') + name + (('   ' + detail) if detail else ''))
    if not ok:
        failures.append(name)


# --- a wire-level protobuf reader, written from the format ------------------------

def read_varint(buffer, i):
    value = 0
    shift = 0
    while True:
        byte = buffer[i]
        i += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, i
        shift += 7


def decode(buffer):
    """[(field_number, wire_type, value)] at one level."""
    out = []
    i = 0
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


print('\n=== protobuf ===')
sample_series = [
    ({'__name__': 'struct8_edge_bytes', 'src_id': 'i-0abc', 'dst_id': 'internet'},
     [(1758549780000, 41230.0), (1758549840000, 900.0)]),
]
encoded = pfl.encode_write_request(sample_series)

top = decode(encoded)
check('WriteRequest carries timeseries in field 1',
      len(top) == 1 and top[0][0] == 1 and top[0][1] == 2)

timeseries = decode(top[0][2])
labels = [v for (f, w, v) in timeseries if f == 1]
samples = [v for (f, w, v) in timeseries if f == 2]
check('TimeSeries: three labels in field 1', len(labels) == 3, str(len(labels)))
check('TimeSeries: two samples in field 2', len(samples) == 2, str(len(samples)))

pairs = []
for raw in labels:
    fields = decode(raw)
    pairs.append((
        [v for (f, w, v) in fields if f == 1][0].decode(),
        [v for (f, w, v) in fields if f == 2][0].decode(),
    ))
check('Label: name in field 1, value in field 2',
      ('__name__', 'struct8_edge_bytes') in pairs, str(pairs))

first = decode(samples[0])
check('Sample: value is a double in field 1',
      [v for (f, w, v) in first if f == 1 and w == 1] == [41230.0])
check('Sample: timestamp is a varint in field 2',
      [v for (f, w, v) in first if f == 2 and w == 0] == [1758549780000])


# --- a snappy decompressor, including the copies we never emit --------------------

def snappy_decompress(buffer):
    declared, i = read_varint(buffer, 0)
    out = bytearray()
    while i < len(buffer):
        tag = buffer[i]
        i += 1
        kind = tag & 0x03
        if kind == 0:
            n = tag >> 2
            if n < 60:
                length = n + 1
            else:
                extra = n - 59
                length = int.from_bytes(buffer[i:i + extra], 'little') + 1
                i += extra
            out += buffer[i:i + length]
            i += length
        elif kind == 1:
            length = 4 + ((tag >> 2) & 0x07)
            offset = ((tag >> 5) << 8) | buffer[i]
            i += 1
            for _ in range(length):
                out.append(out[-offset])
        else:
            width = 2 if kind == 2 else 4
            length = (tag >> 2) + 1
            offset = int.from_bytes(buffer[i:i + width], 'little')
            i += width
            for _ in range(length):
                out.append(out[-offset])
    return bytes(out), declared


print('\n=== snappy, literal-only block ===')
# The sizes are the boundaries of the literal header: 60 is the last inline length,
# then one, two, three and four extra bytes.
for n in (0, 1, 59, 60, 61, 255, 256, 257, 4096, 70000):
    data = bytes((i * 7 + n) % 251 for i in range(n))
    block = pfl.snappy_literal_only(data)
    back, declared = snappy_decompress(block)
    check('round-trip of ' + str(n) + ' bytes', back == data and declared == n,
          'declared=' + str(declared) + ' got=' + str(len(back)))

back, _ = snappy_decompress(pfl.snappy_literal_only(encoded))
check('the WriteRequest survives the snappy framing', back == encoded)


# --- reading, deduplication and the collapse --------------------------------------

print('\n=== reading, deduplication and collapse ===')
HEADER = ('version vpc-id subnet-id interface-id instance-id srcaddr dstaddr '
          'pkt-srcaddr pkt-dstaddr srcport dstport protocol packets bytes start '
          'end action log-status flow-direction traffic-path pkt-src-aws-service '
          'pkt-dst-aws-service interface-type')

LINES = [
    # internal, egress: both ends resolve inside the VPC
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 4444 443 6 10 1500 1758549780 1758549840 ACCEPT OK egress 1 - - -',
    # the SAME conversation seen at the other interface: ingress, must disappear
    '11 vpc-1 sub-2 eni-2 i-0def 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 4444 443 6 10 1500 1758549780 1758549840 ACCEPT OK ingress 1 - - -',
    # out to the internet through an internet gateway
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 140.82.121.4 10.0.1.5 140.82.121.4 5555 443 6 4 800 1758549780 1758549840 ACCEPT OK egress 8 - - -',
    # to S3, which the record names
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 52.216.1.1 10.0.1.5 52.216.1.1 5556 443 6 2 300 1758549780 1758549840 ACCEPT OK egress 2 - S3 -',
    # to on-prem through a virtual private gateway: NOT the internet
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.99.0.7 10.0.1.5 10.99.0.7 5557 22 6 1 100 1758549780 1758549840 ACCEPT OK egress 3 - - -',
    # a window with no traffic: discarded
    '11 vpc-1 sub-1 eni-1 - - - - - - - - - - 1758549780 1758549840 - NODATA - - - - -',
]

cidrs = [(ipaddress.ip_network('10.0.0.0/16'), 'vpc-1')]
field_map = pfl.field_map_from_header(HEADER)
records = [{n: line.split()[i] for n, i in field_map.items()} for line in LINES]

diagnostics = defaultdict(int)
totals = pfl.accumulate(records, cidrs, diagnostics)

destinations = {}
for (_, label_tuple), values in totals.items():
    as_dict = dict(label_tuple)
    destinations[as_dict['dst_id'] or as_dict['dst_addr']] = (as_dict['dst_type'], values[0])

check('the ingress copy was deduplicated (four edges, not five)',
      len(totals) == 4, str(len(totals)))
check('NODATA discarded', diagnostics['records_nodata'] == 1, str(dict(diagnostics)))
check('an internal destination resolves by CIDR',
      destinations.get('10.0.2.9', ('', 0))[0] == 'address')
check('public through an internet gateway becomes internet',
      destinations.get('internet', ('', 0))[0] == 'internet')
check('a named service becomes S3',
      destinations.get('S3', ('', 0))[0] == 'aws_service')
check('10.99 through a VGW becomes on-premises, NOT internet',
      destinations.get('on-premises', ('', 0))[0] == 'on_premises')

print('\n=== a hop through a middlebox ===')
# One conversation, as a NAT instance and the sender each write it. Copied from
# an account on 2026-09-23: `addr` is the hop that interface saw, `pkt` is the
# conversation. Note the shape that makes this hard -- the record naming the next
# hop is an INGRESS one, which the deduplication rule drops, and the sender's own
# record (third) says `traffic-path=1` without naming anything.
HOP_LINES = [
    # outbound, on the NAT's interface: the only record naming the next hop
    '11 vpc-1 sub-1 eni-nat i-0nat 10.0.1.5 10.0.0.9 10.0.1.5 140.82.121.4 5555 443 6 4 800 1758549780 1758549840 ACCEPT OK ingress - - - -',
    # the return, same interface: egress, and today it reads as "the internet"
    '11 vpc-1 sub-1 eni-nat i-0nat 10.0.0.9 10.0.1.5 140.82.121.4 10.0.1.5 443 5555 6 9 9000 1758549780 1758549840 ACCEPT OK egress 1 - - -',
    # the sender's own interface: both pairs equal, so this is the conversation
    '11 vpc-1 sub-2 eni-1 i-0abc 10.0.1.5 140.82.121.4 10.0.1.5 140.82.121.4 5555 443 6 4 800 1758549780 1758549840 ACCEPT OK egress 1 - - -',
]
hop_records = [{n: line.split()[i] for n, i in field_map.items()} for line in HOP_LINES]
hop_diagnostics = defaultdict(int)
hop_totals = pfl.accumulate(hop_records, cidrs, hop_diagnostics)

by_pair = {}
for (_, label_tuple), values in hop_totals.items():
    as_dict = dict(label_tuple)
    left = as_dict.get('src_id') or as_dict.get('src_addr')
    right = as_dict.get('dst_id') or as_dict.get('dst_addr')
    by_pair[(left, right, as_dict.get('hop', ''))] = (as_dict, values[0])

check('the outbound hop survives, although its record is an ingress one',
      ('10.0.1.5', '10.0.0.9', '1') in by_pair, str(sorted(by_pair)))
check('the return hop is the middlebox talking to the machine, not the internet',
      ('10.0.0.9', '10.0.1.5', '1') in by_pair, str(sorted(by_pair)))
check("the sender's own record still reports the CONVERSATION",
      ('i-0abc', 'internet', '') in by_pair, str(sorted(by_pair)))
# The expensive mistake this forbids: `instance-id` on those two records is the
# NAT, while the source of the outbound hop is the machine that sent TO it.
check('neither end of a hop is named by the capturing interface',
      all(fields.get('src_id', '') == '' and fields.get('dst_id', '') == ''
          for (_, _, marked), (fields, _) in by_pair.items() if marked == '1'),
      str([f for (_, _, m), (f, _) in by_pair.items() if m == '1']))
check('a hop carries no egress door',
      all('egress' not in fields
          for (_, _, marked), (fields, _) in by_pair.items() if marked == '1'))
check('three series: two hops and one conversation, nothing counted twice',
      len(hop_totals) == 3 and hop_diagnostics['records_hop'] == 2,
      str(len(hop_totals)) + ' series, ' + str(dict(hop_diagnostics)))
check('the hop carries the volume that crossed it',
      by_pair[('10.0.0.9', '10.0.1.5', '1')][1] == 9000,
      str(by_pair.get(('10.0.0.9', '10.0.1.5', '1'))))

print('\n=== the IP protocol reaches the labels ===')
PROTO_LINES = [
    # ICMP between two machines. A flow log writes 0 for BOTH ports, because
    # ICMP has none -- which is how a ping came to be reported as "port 0".
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 0 0 1 10 1500 1758549780 1758549840 ACCEPT OK egress 1 - - -',
    # the same pair over TCP: a share of its own, whatever the ports look like
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 4444 443 6 10 800 1758549780 1758549840 ACCEPT OK egress 1 - - -',
]
proto_records = [{n: line.split()[i] for n, i in field_map.items()} for line in PROTO_LINES]
proto_totals = pfl.accumulate(proto_records, cidrs, defaultdict(int))
proto_shares = {(dict(k[1]).get('protocol'), dict(k[1]).get('service_port')) for k in proto_totals}

check('ICMP is labelled 1, and the 0 beside it is not what should name the share',
      ('1', '0') in proto_shares, str(sorted(proto_shares)))
check('TCP on 443 stays a share of its own, not folded into the ICMP one',
      ('6', '443') in proto_shares and len(proto_totals) == 2,
      str(len(proto_totals)) + ' ' + str(sorted(proto_shares)))

print('\n=== the reply from outside is the only capture there is ===')
OUTSIDE_LINES = [
    # out to the internet, on the instance's own interface
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 140.82.121.4 10.0.1.5 140.82.121.4 5555 443 6 4 800 1758549780 1758549840 ACCEPT OK egress 8 - - -',
    # the reply coming back: same interface, INGRESS, and no traffic-path at all
    '11 vpc-1 sub-1 eni-1 i-0abc 140.82.121.4 10.0.1.5 140.82.121.4 10.0.1.5 443 5555 6 9 9000 1758549780 1758549840 ACCEPT OK ingress - - - -',
    # an internal flow seen at the RECEIVER: that one does have a second capture
    '11 vpc-1 sub-2 eni-2 i-0def 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 4444 443 6 10 1500 1758549780 1758549840 ACCEPT OK ingress 1 - - -',
]
out_records = [{n: line.split()[i] for n, i in field_map.items()} for line in OUTSIDE_LINES]
out_diagnostics = defaultdict(int)
out_totals = pfl.accumulate(out_records, cidrs, out_diagnostics)
out_pairs = {
    (dict(k[1]).get('src_id') or dict(k[1]).get('src_addr'),
     dict(k[1]).get('dst_id') or dict(k[1]).get('dst_addr'))
    for k in out_totals
}

check('the outbound half is there', ('i-0abc', 'internet') in out_pairs, str(sorted(out_pairs)))
# The whole point: named by the SAME id as the outbound half. By address the two
# would be different pairs and the conversation would be drawn as two things.
check('and the reply, named by the id of the interface that captured IT',
      ('internet', 'i-0abc') in out_pairs, str(sorted(out_pairs)))
check('the internal ingress copy is still dropped -- that one IS a duplicate',
      len(out_totals) == 2 and out_diagnostics['records_inbound_kept'] == 1,
      str(len(out_totals)) + ' series, ' + str(dict(out_diagnostics)))

print('\n=== a refused packet is not traffic ===')
REFUSED_LINES = [
    # the internet trying RDP on a public address, dropped by the security group
    '11 vpc-1 sub-1 eni-1 i-0abc 185.220.101.4 10.0.1.5 185.220.101.4 10.0.1.5 51123 3389 6 1 40 1758549780 1758549840 REJECT OK ingress - - - -',
    # and an outbound attempt a network ACL refused: not traffic either
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 140.82.121.4 10.0.1.5 140.82.121.4 5555 25 6 3 180 1758549780 1758549840 REJECT OK egress 8 - - -',
    # the conversation that DID happen, which must survive untouched
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 140.82.121.4 10.0.1.5 140.82.121.4 5556 443 6 4 800 1758549780 1758549840 ACCEPT OK egress 8 - - -',
]
refused_records = [{n: line.split()[i] for n, i in field_map.items()} for line in REFUSED_LINES]
refused_diagnostics = defaultdict(int)
refused_totals = pfl.accumulate(refused_records, cidrs, refused_diagnostics)

check('both refused records are dropped, whatever their direction',
      refused_diagnostics['records_rejected'] == 2, str(dict(refused_diagnostics)))
check('only the accepted conversation is left, with its own bytes',
      len(refused_totals) == 1 and list(refused_totals.values())[0][0] == 800,
      str({dict(k[1]).get('service_port'): v for k, v in refused_totals.items()}))

print('\n=== a conversation is named after the service, both ways ===')
SERVICE_LINES = [
    # the request: from the client's ephemeral port TO 443
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 140.82.121.4 10.0.1.5 140.82.121.4 40001 443 6 4 800 1758549780 1758549840 ACCEPT OK egress 8 - - -',
    # its reply: FROM 443 to that port. `dstport` here is 40001, and it was what
    # named this half -- "TCP ephemeral ports", one new series per connection.
    '11 vpc-1 sub-1 eni-1 i-0abc 140.82.121.4 10.0.1.5 140.82.121.4 10.0.1.5 443 40001 6 9 9000 1758549780 1758549840 ACCEPT OK ingress - - - -',
    # a second connection to the same service: a new client port, NOT a new label
    '11 vpc-1 sub-1 eni-1 i-0abc 140.82.121.4 10.0.1.5 140.82.121.4 10.0.1.5 443 40777 6 9 9000 1758549780 1758549840 ACCEPT OK ingress - - - -',
    # both ends ephemeral: gRPC on 50051 answered from 40002. Nothing to name.
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 50051 40002 6 5 700 1758549780 1758549840 ACCEPT OK egress 1 - - -',
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 50051 40003 6 5 700 1758549780 1758549840 ACCEPT OK egress 1 - - -',
]
service_records = [{n: line.split()[i] for n, i in field_map.items()} for line in SERVICE_LINES]
service_totals = pfl.accumulate(service_records, cidrs, defaultdict(int))
service_by_pair = defaultdict(set)
for (_, label_tuple), values in service_totals.items():
    as_dict = dict(label_tuple)
    left = as_dict.get('src_id') or as_dict.get('src_addr')
    right = as_dict.get('dst_id') or as_dict.get('dst_addr')
    service_by_pair[(left, right)].add(as_dict.get('service_port'))

check('the request is named after the port it went to',
      service_by_pair[('i-0abc', 'internet')] == {'443'}, str(dict(service_by_pair)))
check('and its reply after the port it came from -- the same service',
      service_by_pair[('internet', 'i-0abc')] == {'443'}, str(dict(service_by_pair)))
check('two connections to one service are one series, not one per client port',
      sum(1 for (_, label_tuple) in service_totals
          if dict(label_tuple).get('src_id') == 'internet') == 1,
      str(len(service_totals)) + ' series')
check('two ephemeral ends collapse to the floor, one value for every connection',
      service_by_pair[('i-0abc', '10.0.2.9')] == {str(pfl.EPHEMERAL_FLOOR)},
      str(dict(service_by_pair)))
check('no series carries `dstport` any more',
      not any('dstport' in dict(label_tuple) for (_, label_tuple) in service_totals))

check('a bucket from last year goes out',
      len(pfl.to_series(totals)) == len(totals) * 2)

# The old cutoff held back every bucket younger than it, and nothing re-read the
# object afterwards: the newest minute of every delivery was lost. The sample lines
# are from 2025, so only a RECENT instant proves the newest bucket goes out.
now = int(time.time())
recent = dict(records[0])
recent['start'] = str(now - 60)
recent['end'] = str(now)
recent_series = pfl.to_series(pfl.accumulate([recent], cidrs, defaultdict(int)))
check('what just arrived goes out at once, bytes and packets',
      len(recent_series) == 2, 'series=' + str(len(recent_series)))

series = pfl.to_series(totals)
check('one bytes series and one packets series per edge',
      len(series) == len(totals) * 2, str(len(series)))
check('every series carries __name__', all('__name__' in l for l, _ in series))

# --- the S3 notification, which is how this Lambda is actually invoked ------------

print('\n=== the S3 notification event ===')

NOTIFICATION = {'Records': [
    {'s3': {'object': {'key': 'AWSLogs/123456789012/vpcflowlogs/us-east-1/2026/09/22/'
                              '123456789012_vpcflowlogs_us-east-1_fl-0abc_a1b2.log.gz'}}},
    # Our own output. The notification filter should never send it, and step 1
    # refuses it anyway -- the guard that survives someone editing the filter.
    {'s3': {'object': {'key': 'struct8/partials/whatever.json'}}},
    # S3 percent-encodes the key. Asking for it undecoded asks for an object that
    # does not exist, and the file is lost with a 404 nobody reads.
    {'s3': {'object': {'key': 'AWSLogs/a%3Db/file+name.log.gz'}}},
]}

keys = pfl.keys_from_event(NOTIFICATION, 'any-bucket')
# Reaching this line at all proves no listing was attempted: the stub raises.
check('two keys survive, our own output is not one of them',
      len(keys) == 2 and not any(k.startswith(pfl.OUTPUT_PREFIX) for k in keys), str(keys))
check('the delivered object comes from the event', keys[0].endswith('_a1b2.log.gz'))
check('the key is percent-decoded', 'AWSLogs/a=b/file name.log.gz' in keys, str(keys))


print('\n=== the delivery delay, which is what the lab exists to measure ===')

import contextlib
import json

delay_records = [
    {'end': '1758549840'},
    {'end': '1758549900'},  # the newest window, and the one the delay is measured from
    {'end': '-'},           # absent: the flow log writes '-' for a field it has no value for
]
captured = io.StringIO()
with contextlib.redirect_stdout(captured):
    pfl.report_delivery_delay('AWSLogs/x.log.gz', delay_records, 1758550500)
line = json.loads(captured.getvalue().strip())
check('the delay counts from the NEWEST window in the file',
      line['delay_seconds'] == 600, str(line))
check('the line is JSON, so Logs Insights finds the field by name',
      line['metric'] == 'struct8_delivery_delay' and line['records'] == 3, str(line))

captured = io.StringIO()
with contextlib.redirect_stdout(captured):
    pfl.report_delivery_delay('AWSLogs/empty.log.gz', [{'end': '-'}], 1758550500)
check('a file with no usable window logs nothing', captured.getvalue() == '',
      repr(captured.getvalue()))


print('\n=== the diagnostic instant, in milliseconds ===')


class _ClockBetweenSeconds:
    """Stopped between two whole seconds, which is what second precision loses."""

    def time(self):
        return 1758549780.123


original_time = pfl.time
pfl.time = _ClockBetweenSeconds()
diagnostic = pfl.diagnostic_series({'files_processed': 1})
pfl.time = original_time
instant = diagnostic[0][1][0][0]
check('the diagnostic instant keeps the milliseconds', instant == 1758549780123,
      str(instant) + ' (second precision would give 1758549780000, and two '
      'invocations in the same second would then collide)')


print('\n=== the batch AMP refuses ===')

# Measured on 2026-09-22, ten minutes into the first real run with ONE network
# interface: two objects of the same delivery both carried bucket 1790117040 for
# the same pair, 2778 bytes against 1401, because AWS split that capture window
# across two files. The second write is refused, and AMP refuses the WHOLE
# request -- so without the fallback the other nine series go with it.

batch_sizes = []


def _refuses_the_batch(series):
    """AMP's behaviour: one bad sample refuses everything sent with it."""
    batch_sizes.append(len(series))
    if len(series) > 1:
        raise pfl.RemoteWriteRefused(400, 'duplicate sample for timestamp')
    if dict(series[0][0]).get('__name__') == 'struct8_edge_bytes':
        raise pfl.RemoteWriteRefused(400, 'duplicate sample for timestamp')
    return 200


def _server_is_down(series):
    raise pfl.RemoteWriteRefused(503, 'service unavailable')


original_remote_write = pfl.remote_write
refused_diagnostics = defaultdict(int)
pfl.remote_write = _refuses_the_batch
with contextlib.redirect_stdout(io.StringIO()):
    pfl.write_series([
        ({'__name__': 'struct8_edge_bytes'}, [(1790117040000, 1401.0)]),
        ({'__name__': 'struct8_edge_packets'}, [(1790117040000, 13.0)]),
        ({'__name__': 'struct8_flowlog_records_seen_total'}, [(1790117040000, 16.0)]),
    ], refused_diagnostics)
pfl.remote_write = original_remote_write

check('a refused batch is resent one series at a time',
      batch_sizes == [3, 1, 1, 1], str(batch_sizes))
check('only the conflicting series is lost; the other two get through',
      refused_diagnostics['series_refused'] == 1
      and refused_diagnostics['series_written_singly'] == 2,
      str(dict(refused_diagnostics)))

pfl.remote_write = _server_is_down
reraised = False
try:
    with contextlib.redirect_stdout(io.StringIO()):
        pfl.write_series([({'__name__': 'x'}, [(1, 1.0)])], defaultdict(int))
except pfl.RemoteWriteRefused:
    reraised = True
pfl.remote_write = original_remote_write
check('a 5xx is re-raised instead: there the bytes are fine and a retry helps',
      reraised)


print('\n=== the write offset, which is what lets two objects share a minute ===')

# The two real objects of 2026-09-22, the ones that collided on bucket 1790117040.
PREFIX = ('AWSLogs/952133486861/vpcflowlogs/us-east-1/2026/09/22/'
          '952133486861_vpcflowlogs_us-east-1_fl-0296d8224cd28bf60_')
KEY_A = PREFIX + '20260922T2240Z_55b632a6.log.gz'
KEY_B = PREFIX + '20260922T2245Z_304f4c51.log.gz'

offset_a = pfl.write_offset_ms([KEY_A])
offset_b = pfl.write_offset_ms([KEY_B])

check('the offset stays inside its own bucket',
      0 <= offset_a < pfl.BUCKET_SECONDS * 1000
      and 0 <= offset_b < pfl.BUCKET_SECONDS * 1000, str((offset_a, offset_b)))
check('two objects of one delivery land on different instants',
      offset_a != offset_b, str((offset_a, offset_b)))
check('the same objects always land on the same instant, so a retry is idempotent',
      pfl.write_offset_ms([KEY_A]) == offset_a)
check('the order the keys arrive in does not move the instant',
      pfl.write_offset_ms([KEY_A, KEY_B]) == pfl.write_offset_ms([KEY_B, KEY_A]))

# Hard-coded on purpose. Python randomises hash() per process, so swapping the
# digest for hash() would move these numbers on every cold start -- the object
# would land somewhere new each time and the retry would stop being idempotent.
# A literal is what makes that swap fail here instead of in production.
check('the offset is the same in every process, not Python hash()',
      (offset_a, offset_b) == (43161, 6978), str((offset_a, offset_b)))

# The measured case, rebuilt: one bucket, one pair, two objects, 2778 and 1401.
BUCKET = 1790117040
PAIR = (('src_id', 'i-0abc'), ('dst_id', 'internet'))
sample_a = [s for labels, s in pfl.to_series({(BUCKET, PAIR): [2778, 29]}, offset_a)
            if labels['__name__'] == pfl.METRIC_BYTES][0][0]
sample_b = [s for labels, s in pfl.to_series({(BUCKET, PAIR): [1401, 13]}, offset_b)
            if labels['__name__'] == pfl.METRIC_BYTES][0][0]

check('the two writes fall in the SAME minute',
      sample_a[0] // 60000 == sample_b[0] // 60000 == BUCKET * 1000 // 60000,
      str((sample_a[0], sample_b[0])))
check('at DIFFERENT instants, which is what Prometheus accepts',
      sample_a[0] != sample_b[0], str((sample_a[0], sample_b[0])))
check('and the window sums back to what the minute really carried',
      sample_a[1] + sample_b[1] == 4179, str(sample_a[1] + sample_b[1]))
check('with no offset the two would land on the same instant -- the 400',
      pfl.to_series({(BUCKET, PAIR): [2778, 29]})[0][1][0][0]
      == pfl.to_series({(BUCKET, PAIR): [1401, 13]})[0][1][0][0])


print('\n=== the ORIGINAL address, which was never being read ===')

LAB_CIDRS = [(ipaddress.ip_network('10.3.0.0/16'), 'vpc-lab')]

# `pkt-srcaddr` carries the address BEFORE an intermediary rewrote it. The code
# asked for `pkt_srcaddr` -- an underscore, where every flow log field is spelled
# with a hyphen -- so the lookup never matched and the fallback always won. Behind
# a NAT gateway that attributes every flow to the NAT instead of the machine that
# sent it, with a number that looks perfectly sane.
behind_nat = {'srcaddr': '10.3.0.200', 'pkt-srcaddr': '10.3.0.31',
              'dstaddr': '52.1.2.3', 'traffic-path': '2'}
src = pfl.name_endpoint(behind_nat, 'src', LAB_CIDRS)
check('the original address wins over the rewritten one',
      src['src_addr'] == '10.3.0.31', src['src_addr'])
check('and the field is spelled the way the header spells it',
      pfl.value_of({'pkt-srcaddr': '10.3.0.31'}, 'pkt-srcaddr') == '10.3.0.31')
check('while the old spelling finds nothing, which is why it was silent',
      pfl.value_of({'pkt-srcaddr': '10.3.0.31'}, 'pkt_srcaddr') is None)


print('\n=== the name, which is what groups siblings ===')

named = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'instance-id': 'i-aaa', 'instance-tag': 'web-fleet'},
    'src', LAB_CIDRS)
check('the record names itself when the tag travels in it',
      named['src_name'] == 'web-fleet', named['src_name'])
check('and the id stays per-machine, so both readings survive',
      named['src_id'] == 'i-aaa', named['src_id'])

described = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'instance-id': 'i-aaa'}, 'src', LAB_CIDRS,
    {'10.3.0.31': 'web-fleet'})
check('without the tag in the record, the described map names it',
      described['src_name'] == 'web-fleet', described['src_name'])

both = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'instance-id': 'i-aaa', 'instance-tag': 'from-record'},
    'src', LAB_CIDRS, {'10.3.0.31': 'from-describe'})
check('the record wins over the describe, because it is what AWS stamped',
      both['src_name'] == 'from-record', both['src_name'])

destination = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'dstaddr': '10.3.0.77'}, 'dst', LAB_CIDRS,
    {'10.3.0.77': 'the-database'})
check('the far end is named too, and it never carries an instance id',
      (destination['dst_name'], destination['dst_id']) == ('the-database', ''),
      str((destination['dst_name'], destination['dst_id'])))

external = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'dstaddr': '52.1.2.3', 'traffic-path': '2'},
    'dst', LAB_CIDRS)
check('a collapsed end IS its name, so summing by name keeps external edges',
      external['dst_name'] == 'internet', external['dst_name'])


print('\n=== the account, without which two of them share a series ===')

ACCOUNT_WAS = pfl.ACCOUNT
pfl.ACCOUNT = '952133486861'
labels_out = pfl.to_series({(BUCKET, PAIR): [10, 1]})[0][0]
check('every series says which account it came from',
      labels_out.get('account') == '952133486861', str(labels_out.get('account')))
pfl.ACCOUNT = ''
check('and an account that was never configured adds no empty label',
      'account' not in pfl.to_series({(BUCKET, PAIR): [10, 1]})[0][0])
pfl.ACCOUNT = ACCOUNT_WAS


print('\n=== the cut ranks GROUPS and keeps MEMBERS ===')


def row(src_name, dst_name, member, byte_count):
    return (BUCKET, (('src_id', member), ('src_name', src_name),
                     ('dst_id', dst_name), ('dst_name', dst_name))), [byte_count, 1]


# One group of three machines moving 300 between them, against two single
# resources moving more than any ONE of the three. Ranked row by row the group
# loses every seat; ranked by group it wins the first.
fleet = dict([
    row('web-fleet', 'S3', 'i-a', 100),
    row('web-fleet', 'S3', 'i-b', 100),
    row('web-fleet', 'S3', 'i-c', 100),
    row('the-database', 'S3', 'i-db', 250),
    row('a-cache', 'S3', 'i-cache', 200),
    row('noise', 'S3', 'i-noise', 10),
])

TOP_WAS = pfl.TOP_N_PAIRS
pfl.TOP_N_PAIRS = 2
cut = pfl.cut_to_top_n(fleet)
pfl.TOP_N_PAIRS = TOP_WAS

survivors = defaultdict(int)
for (_, labels), values in cut.items():
    survivors[dict(labels)['src_name']] += values[0]

check('the group survives the cut whole: all three members kept',
      survivors.get('web-fleet') == 300, str(survivors.get('web-fleet')))
check('the second seat goes to the next group by TOTAL, not by biggest row',
      survivors.get('the-database') == 250, str(survivors.get('the-database')))
check('what lost is summed into `rest`, so the bucket still closes',
      survivors.get('rest') == 210, str(survivors.get('rest')))
check('and nothing was invented: 300 + 250 + 210 is what went in',
      sum(survivors.values()) == 760, str(sum(survivors.values())))


print('\n=== the caches, which is what keeps EC2 out of every invocation ===')


class _FakePaginator:
    def __init__(self, pages, calls, operation):
        self.pages, self.calls, self.operation = pages, calls, operation

    def paginate(self, **kwargs):
        self.calls.append((self.operation, kwargs))
        return self.pages


class _FakeEc2:
    def __init__(self, pages, calls, explode=False):
        self.pages, self.calls, self.explode = pages, calls, explode

    def get_paginator(self, operation):
        if self.explode:
            raise RuntimeError('EC2 said no')
        return _FakePaginator(self.pages, self.calls, operation)


VPC_PAGE = [{'Vpcs': [{'VpcId': 'vpc-lab',
                       'CidrBlockAssociationSet': [{'CidrBlock': '10.3.0.0/16'}]}]}]
EC2_WAS = pfl.ec2

calls = []
pfl.ec2 = _FakeEc2(VPC_PAGE, calls)
pfl._cidrs_cache['expires_at'] = 0.0
pfl._cidrs_cache['blocks'] = []
first = pfl.known_cidrs()
second = pfl.known_cidrs()
check('the CIDRs are described once, not once per delivered object',
      len(calls) == 1, str(len(calls)))
check('and the second call answers from the cache, with the same content',
      first == second)

pfl._cidrs_cache['expires_at'] = time.time() - 1
pfl.known_cidrs()
check('once the timer runs out it reads again, so a rename is picked up',
      len(calls) == 2, str(len(calls)))

INSTANCE_PAGE = [{'Reservations': [{'Instances': [{
    'Tags': [{'Key': 'Name', 'Value': 'web-fleet'}],
    'NetworkInterfaces': [{'PrivateIpAddresses': [
        {'PrivateIpAddress': '10.3.0.31'}, {'PrivateIpAddress': '10.3.0.32'}]}],
}]}]}]

calls = []
pfl.ec2 = _FakeEc2(INSTANCE_PAGE, calls)
pfl._name_by_address.clear()
names = pfl.names_for_addresses({'10.3.0.31', '10.3.0.32'})
check('one call names every address of the batch',
      len(calls) == 1 and names.get('10.3.0.31') == 'web-fleet', str(names))
check('and it asks by ADDRESS, not by instance id -- a dead id would fail the call',
      calls[0][1]['Filters'][0]['Name'] == 'private-ip-address',
      str(calls[0][1]['Filters'][0]['Name']))

pfl.names_for_addresses({'10.3.0.31', '10.3.0.32'})
check('asking again inside the timer costs nothing', len(calls) == 1, str(len(calls)))

pfl.names_for_addresses({'10.3.0.31', '10.3.0.99'})
check('only the address the cache lacks is asked for',
      calls[1][1]['Filters'][0]['Values'] == ['10.3.0.99'],
      str(calls[1][1]['Filters'][0]['Values']))

pfl.names_for_addresses({'10.3.0.99'})
check('an address EC2 does not know is remembered as nameless, not re-asked',
      len(calls) == 2, str(len(calls)))

calls = []
pfl._name_by_address.clear()
pfl.ec2 = _FakeEc2(INSTANCE_PAGE, calls, explode=True)
check('a failed describe returns no names instead of taking the run down',
      pfl.names_for_addresses({'10.3.0.31'}) == {})
pfl.ec2 = _FakeEc2(INSTANCE_PAGE, calls)
check('and it is NOT cached as nameless: a transport failure is not an answer',
      pfl.names_for_addresses({'10.3.0.31'}).get('10.3.0.31') == 'web-fleet')

# Two instances an Auto Scaling group launched, and one it did not. AWS writes
# `aws:autoscaling:groupName` on the first two; the Name tag is the box's label.
GROUP_PAGE = [{'Reservations': [{'Instances': [
    {'Tags': [{'Key': 'Name', 'Value': 'ASG'},
              {'Key': 'aws:autoscaling:groupName', 'Value': 'ASG'}],
     'NetworkInterfaces': [{'PrivateIpAddresses': [{'PrivateIpAddress': '10.5.0.11'}]}]},
    {'Tags': [{'Key': 'Name', 'Value': 'ASG'},
              {'Key': 'aws:autoscaling:groupName', 'Value': 'ASG'}],
     'NetworkInterfaces': [{'PrivateIpAddresses': [{'PrivateIpAddress': '10.5.0.12'}]}]},
    {'Tags': [{'Key': 'Name', 'Value': 'nat'}],
     'NetworkInterfaces': [{'PrivateIpAddresses': [{'PrivateIpAddress': '10.3.0.10'}]}]},
]}]}]

calls = []
pfl._name_by_address.clear()
pfl.ec2 = _FakeEc2(GROUP_PAGE, calls)
pfl.names_for_addresses({'10.5.0.11', '10.5.0.12', '10.3.0.10'})
groups = pfl.groups_for_addresses()
check('the group comes out of the same describe that names the address',
      len(calls) == 1 and groups == {'10.5.0.11': 'ASG', '10.5.0.12': 'ASG'}, str(groups))
check('and an instance no group launched has no entry at all',
      '10.3.0.10' not in groups, str(groups))

pfl.ec2 = EC2_WAS

spread = {pfl._expiry() for _ in range(50)}
check('the timer is jittered, so containers that started together do not all '
      'read at the same instant', len(spread) > 45, str(len(spread)))
floor = time.time() + pfl.DESCRIBE_TTL_SECONDS * 0.85
ceiling = time.time() + pfl.DESCRIBE_TTL_SECONDS * 1.15
check('and the jitter stays inside its band',
      all(floor - 1 <= value <= ceiling + 1 for value in spread))


print('\n=== only in-VPC addresses are worth describing ===')

outside = [{'srcaddr': '10.3.0.31', 'dstaddr': '52.1.2.3'},
           {'srcaddr': '10.3.0.31', 'pkt-dstaddr': '10.3.0.77', 'dstaddr': '10.3.0.200'}]
worth = pfl.addresses_in(outside, LAB_CIDRS)
check('the public address is left out: it collapses to one point anyway',
      '52.1.2.3' not in worth, str(sorted(worth)))
check('and the ORIGINAL destination is the one collected, not the rewritten one',
      worth == {'10.3.0.31', '10.3.0.77'}, str(sorted(worth)))



print()
print('=== the door a flow left through ===')

# Measured on the account 2026-09-23: every one of the 59 egress records in a
# real object carried `traffic-path 8`, and all 96 ingress records carried `-`.
def egress_record(path, service=None):
    record = {'srcaddr': '10.3.0.206', 'dstaddr': '16.15.252.172',
              'traffic-path': path, 'flow-direction': 'egress',
              'dstport': '443', 'protocol': '6', 'packets': '11',
              'bytes': '1297', 'start': '1790165981', 'instance-id': 'i-lab'}
    if service:
        record['pkt-dst-aws-service'] = service
    return record

check('8 is an internet gateway, the one door that lands on a box that is drawn',
      pfl.egress_path(egress_record('8')) == 'internet_gateway')
check('7 is a gateway VPC endpoint, which is NOT the same door',
      pfl.egress_path(egress_record('7', service='S3')) == 'vpc_endpoint')
check('1 is another resource in the same VPC -- a NAT gateway, whose hop is '
      'already an ordinary flow between two addresses',
      pfl.egress_path(egress_record('1')) == 'in_vpc')
check('3 is a virtual private gateway',
      pfl.egress_path(egress_record('3')) == 'virtual_private_gateway')

# The ambiguity that must not be rounded off: outside Nitro, 2 covers both the
# internet gateway and a gateway VPC endpoint.
check('2 WITHOUT a service left through the internet gateway',
      pfl.egress_path(egress_record('2')) == 'internet_gateway')
check('2 WITH a service is undecidable, and says nothing rather than guessing',
      pfl.egress_path(egress_record('2', service='S3')) == '')

check('an ingress record says nothing, because the field is `-` there',
      pfl.egress_path({'traffic-path': '-'}) == '')
check('and a record without the field at all says nothing',
      pfl.egress_path({}) == '')

egress_totals = pfl.accumulate([egress_record('8')], LAB_CIDRS, defaultdict(int))
egress_labels = dict(list(egress_totals.keys())[0][1])
check('the label reaches the series',
      egress_labels.get('egress') == 'internet_gateway', str(egress_labels))

# An empty label is a series of its own in Prometheus, so a pair would split in
# two by something nobody asked about.
quiet_labels = dict(list(pfl.accumulate([egress_record('-')], LAB_CIDRS,
                                        defaultdict(int)).keys())[0][1])
check('and it is ABSENT, not empty, when the record cannot say',
      'egress' not in quiet_labels, str(quiet_labels))


print('\n=== the Auto Scaling group an end belongs to ===')

# An instance of the group pings the NAT instance of the other VPC across a
# peering, and the NAT answers. Each direction is the egress record of its sender.
PEERED_CIDRS = [(ipaddress.ip_network('10.3.0.0/16'), 'vpc-lab'),
                (ipaddress.ip_network('10.5.0.0/16'), 'vpc-asg')]
PEER_GROUPS = {'10.5.0.11': 'ASG'}


def ping_record(src, dst, instance):
    return {'srcaddr': src, 'dstaddr': dst, 'flow-direction': 'egress',
            'traffic-path': '4', 'srcport': '0', 'dstport': '0', 'protocol': '1',
            'packets': '10', 'bytes': '12280', 'start': '1790205000',
            'instance-id': instance}


peer_totals = pfl.accumulate([ping_record('10.5.0.11', '10.3.0.10', 'i-asg1'),
                              ping_record('10.3.0.10', '10.5.0.11', 'i-nat')],
                             PEERED_CIDRS, defaultdict(int), groups=PEER_GROUPS)
by_source = {dict(labels)['src_addr']: dict(labels) for (_, labels) in peer_totals}
out_of_group = by_source.get('10.5.0.11', {})
into_group = by_source.get('10.3.0.10', {})
check('the sender launched by a group carries the group',
      out_of_group.get('src_group') == 'ASG', str(out_of_group))
check('and so does the far end of the reply, named by address alone',
      into_group.get('dst_group') == 'ASG', str(into_group))
check('the end no group launched has no group label, not an empty one',
      'dst_group' not in out_of_group and 'src_group' not in into_group,
      str((out_of_group, into_group)))
check('the per-instance id is still there beside it',
      out_of_group.get('src_id') == 'i-asg1', str(out_of_group))

without = pfl.accumulate([ping_record('10.5.0.11', '10.3.0.10', 'i-asg1')],
                         PEERED_CIDRS, defaultdict(int))
check('with no groups known, the series looks exactly as before',
      not any(key.endswith('_group') for key in dict(list(without.keys())[0][1])),
      str(dict(list(without.keys())[0][1])))


print('\n' + ('all checks passed' if not failures else 'FAILED: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
