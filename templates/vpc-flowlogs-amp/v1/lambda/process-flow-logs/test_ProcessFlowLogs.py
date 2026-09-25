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
pfl._vpc_name_by_id['vpc-1'] = 'lab'
# What `owners_for_addresses` answers for this VPC: the Name tag of what owns each
# address, and what kind of thing that is.
OWNERS = {'10.0.1.5': ('web', 'instance'), '10.0.2.9': ('db', 'instance'),
          '10.0.0.9': ('nat', 'instance')}
field_map = pfl.field_map_from_header(HEADER)
records = [{n: line.split()[i] for n, i in field_map.items()} for line in LINES]

diagnostics = defaultdict(int)
totals = pfl.accumulate(records, cidrs, diagnostics, OWNERS)

destinations = {}
for (_, label_tuple), values in totals.items():
    as_dict = dict(label_tuple)
    destinations[as_dict['dst_name']] = (as_dict['dst_type'], as_dict['dst_vpc'], values[0])

check('the ingress copy was deduplicated (four edges, not five)',
      len(totals) == 4, str(len(totals)))
check('NODATA discarded', diagnostics['records_nodata'] == 1, str(dict(diagnostics)))
check('an internal destination is named by what owns its address, in its VPC',
      destinations.get('db', ('', '', 0))[:2] == ('instance', 'lab'), str(destinations))
check('public through an internet gateway becomes internet',
      destinations.get('internet', ('', '', 0))[:2] == ('internet', 'external'))
check('a named service becomes S3',
      destinations.get('S3', ('', '', 0))[0] == 'aws_service')
check('10.99 through a VGW becomes on-premises, NOT internet',
      destinations.get('on-premises', ('', '', 0))[0] == 'on_premises')
check('no series carries an id, an address or a VPC id',
      not any(dict(k[1]).keys() & {'src_id', 'dst_id', 'src_addr', 'dst_addr',
                                   'src_scope', 'dst_scope', 'src_group', 'dst_group'}
              for k in totals),
      str(sorted({key for k in totals for key in dict(k[1])})))

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
hop_totals = pfl.accumulate(hop_records, cidrs, hop_diagnostics, OWNERS)

by_pair = {}
for (_, label_tuple), values in hop_totals.items():
    as_dict = dict(label_tuple)
    by_pair[(as_dict['src_name'], as_dict['dst_name'], as_dict.get('hop', ''))] = (as_dict, values[0])

check('the outbound hop survives, although its record is an ingress one',
      ('web', 'nat', '1') in by_pair, str(sorted(by_pair)))
check('the return hop is the middlebox talking to the machine, not the internet',
      ('nat', 'web', '1') in by_pair, str(sorted(by_pair)))
check("the sender's own record still reports the CONVERSATION",
      ('web', 'internet', '') in by_pair, str(sorted(by_pair)))
# The expensive mistake this forbids: `instance-id` on those two records is the
# NAT, while the source of the outbound hop is the machine that sent TO it.
check('neither end of a hop is named by the capturing interface',
      ('nat', 'nat', '1') not in by_pair, str(sorted(by_pair)))
check('a hop carries no egress door',
      all('egress' not in fields
          for (_, _, marked), (fields, _) in by_pair.items() if marked == '1'))
check('three series: two hops and one conversation, nothing counted twice',
      len(hop_totals) == 3 and hop_diagnostics['records_hop'] == 2,
      str(len(hop_totals)) + ' series, ' + str(dict(hop_diagnostics)))
check('the hop carries the volume that crossed it',
      by_pair[('nat', 'web', '1')][1] == 9000,
      str(by_pair.get(('nat', 'web', '1'))))

print('\n=== the IP protocol reaches the labels ===')
PROTO_LINES = [
    # ICMP between two machines. A flow log writes 0 for BOTH ports, because
    # ICMP has none -- which is how a ping came to be reported as "port 0".
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 0 0 1 10 1500 1758549780 1758549840 ACCEPT OK egress 1 - - -',
    # the same pair over TCP: a share of its own, whatever the ports look like
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 4444 443 6 10 800 1758549780 1758549840 ACCEPT OK egress 1 - - -',
]
proto_records = [{n: line.split()[i] for n, i in field_map.items()} for line in PROTO_LINES]
proto_totals = pfl.accumulate(proto_records, cidrs, defaultdict(int), OWNERS)
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
out_totals = pfl.accumulate(out_records, cidrs, out_diagnostics, OWNERS)
out_pairs = {(dict(k[1])['src_name'], dict(k[1])['dst_name']) for k in out_totals}

check('the outbound half is there', ('web', 'internet') in out_pairs, str(sorted(out_pairs)))
# The whole point: named the SAME way as the outbound half, or the conversation
# would be drawn as two things.
check('and the reply, named by the same name as the outbound half',
      ('internet', 'web') in out_pairs, str(sorted(out_pairs)))
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

print('\n=== what was refused is counted apart ===')
REFUSED_APART_LINES = REFUSED_LINES + [
    # the internet on a high port nobody runs a service on: counted, port dropped
    '11 vpc-1 sub-1 eni-1 i-0abc 185.220.101.4 10.0.1.5 185.220.101.4 10.0.1.5 51124 4711 6 2 80 1758549780 1758549840 REJECT OK ingress - - - -',
    # web -> db on MySQL, refused at db. The sender's copy says ACCEPT.
    '11 vpc-1 sub-1 eni-1 i-0abc 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 40100 3306 6 3 180 1758549780 1758549840 ACCEPT OK egress 1 - - -',
    '11 vpc-1 sub-2 eni-2 i-0def 10.0.1.5 10.0.2.9 10.0.1.5 10.0.2.9 40100 3306 6 3 180 1758549780 1758549840 REJECT OK ingress - - - -',
    # a NAT instance refusing web: named by the hop, web -> nat
    '11 vpc-1 sub-1 eni-nat i-0nat 10.0.1.5 10.0.0.9 10.0.1.5 140.82.121.4 40200 80 6 2 120 1758549780 1758549840 REJECT OK ingress - - - -',
]
apart_records = [{n: line.split()[i] for n, i in field_map.items()} for line in REFUSED_APART_LINES]
apart_diagnostics = defaultdict(int)
apart = pfl.accumulate_refused(apart_records, cidrs, apart_diagnostics, OWNERS)
apart_rows = {(dict(k[1])['src_name'], dict(k[1])['dst_name'], dict(k[1]).get('service_port')): v
              for k, v in apart.items()}

check('every REJECT is counted once, and no ACCEPT is',
      sum(v[1] for v in apart.values()) == 1 + 3 + 2 + 3 + 2, str(apart_rows))
check('the refusal inside the VPC keeps its port, between the two boxes',
      apart_rows.get(('web', 'db', '3306')) == [180, 3], str(apart_rows))
check('the internet on a well-known port keeps it',
      ('internet', 'web', '3389') in apart_rows, str(apart_rows))
check('the internet on an arbitrary high port is counted without one',
      apart_rows.get(('internet', 'web', None)) == [80, 2]
      and apart_diagnostics['refused_ports_folded'] == 1, str(apart_rows))
check('a refusal on a middlebox is named by the hop',
      ('web', 'nat', '80') in apart_rows
      and any(dict(k[1]).get('hop') == '1' for k in apart), str(apart_rows))
check('no refused series carries a door',
      not any('egress' in dict(k[1]) for k in apart), str(list(apart)))

refused_out = pfl.to_series(apart, 0, pfl.REFUSED_METRICS)
check('the refusals go out as packets, under their own metric only',
      {s[0]['__name__'] for s in refused_out} == {'struct8_edge_rejected_packets'}
      and sum(v for s in refused_out for _, v in s[1]) == 11,
      str({s[0]['__name__'] for s in refused_out}))
traffic_out = pfl.to_series(refused_totals, 0)
check('the traffic series are unchanged: bytes and packets',
      sorted(s[0]['__name__'] for s in traffic_out) == ['struct8_edge_bytes', 'struct8_edge_packets'],
      str([s[0]['__name__'] for s in traffic_out]))

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
service_totals = pfl.accumulate(service_records, cidrs, defaultdict(int), OWNERS)
service_by_pair = defaultdict(set)
for (_, label_tuple), values in service_totals.items():
    as_dict = dict(label_tuple)
    service_by_pair[(as_dict['src_name'], as_dict['dst_name'])].add(as_dict.get('service_port'))

check('the request is named after the port it went to',
      service_by_pair[('web', 'internet')] == {'443'}, str(dict(service_by_pair)))
check('and its reply after the port it came from -- the same service',
      service_by_pair[('internet', 'web')] == {'443'}, str(dict(service_by_pair)))
check('two connections to one service are one series, not one per client port',
      sum(1 for (_, label_tuple) in service_totals
          if dict(label_tuple).get('src_name') == 'internet') == 1,
      str(len(service_totals)) + ' series')
check('two ephemeral ends collapse to the floor, one value for every connection',
      service_by_pair[('web', 'db')] == {str(pfl.EPHEMERAL_FLOOR)},
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
PAIR = (('src_name', 'web'), ('dst_name', 'internet'))
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
pfl._vpc_name_by_id['vpc-lab'] = 'lab'
LAB_OWNERS = {'10.3.0.31': ('web', 'instance'), '10.3.0.200': ('nat', 'nat_gateway')}

# `pkt-srcaddr` carries the address BEFORE an intermediary rewrote it. The code
# asked for `pkt_srcaddr` -- an underscore, where every flow log field is spelled
# with a hyphen -- so the lookup never matched and the fallback always won. Behind
# a NAT gateway that attributes every flow to the NAT instead of the machine that
# sent it, with a number that looks perfectly sane.
behind_nat = {'srcaddr': '10.3.0.200', 'pkt-srcaddr': '10.3.0.31',
              'dstaddr': '52.1.2.3', 'traffic-path': '2'}
src = pfl.name_endpoint(behind_nat, 'src', LAB_CIDRS, LAB_OWNERS)
check('the original address wins over the rewritten one',
      src['src_name'] == 'web', src['src_name'])
check('and the field is spelled the way the header spells it',
      pfl.value_of({'pkt-srcaddr': '10.3.0.31'}, 'pkt-srcaddr') == '10.3.0.31')
check('while the old spelling finds nothing, which is why it was silent',
      pfl.value_of({'pkt-srcaddr': '10.3.0.31'}, 'pkt_srcaddr') is None)


print('\n=== the name, which is the whole identity of an end ===')

named = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'instance-id': 'i-aaa', 'instance-tag': 'web-fleet'},
    'src', LAB_CIDRS)
check('the record names itself when the tag travels in it',
      named['src_name'] == 'web-fleet', named['src_name'])
check('and only the name, the kind and the VPC go out -- no id, no address',
      set(named) == {'src_name', 'src_type', 'src_vpc'}, str(named))
check('the VPC is named by its Name tag, not by its id',
      named['src_vpc'] == 'lab', named['src_vpc'])

described = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'instance-id': 'i-aaa'}, 'src', LAB_CIDRS,
    {'10.3.0.31': ('web-fleet', 'instance')})
check('without the tag in the record, the owner of the address names it',
      (described['src_name'], described['src_type']) == ('web-fleet', 'instance'),
      str(described))

replaced = pfl.name_endpoint(
    {'srcaddr': '10.3.0.44', 'instance-id': 'i-bbb'}, 'src', LAB_CIDRS,
    {'10.3.0.44': ('web-fleet', 'instance')})
check('an instance replaced by another with the same Name gives the SAME labels',
      replaced == described, str((replaced, described)))

both = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'instance-id': 'i-aaa', 'instance-tag': 'from-record'},
    'src', LAB_CIDRS, {'10.3.0.31': ('from-describe', 'instance')})
check('the record wins over the describe, because it is what AWS stamped',
      both['src_name'] == 'from-record', both['src_name'])

destination = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'dstaddr': '10.3.0.77'}, 'dst', LAB_CIDRS,
    {'10.3.0.77': ('the-database', 'rds')})
check('the far end is named by what owns its address, and says what it is',
      (destination['dst_name'], destination['dst_type']) == ('the-database', 'rds'),
      str(destination))

nameless = pfl.name_endpoint({'srcaddr': '10.3.0.31', 'dstaddr': '10.3.0.99'}, 'dst', LAB_CIDRS)
check('an address nothing named is `unnamed`, in its VPC',
      (nameless['dst_name'], nameless['dst_vpc']) == ('unnamed', 'lab'), str(nameless))

external = pfl.name_endpoint(
    {'srcaddr': '10.3.0.31', 'dstaddr': '52.1.2.3', 'traffic-path': '2'},
    'dst', LAB_CIDRS)
check('a collapsed end IS its name, outside every VPC',
      (external['dst_name'], external['dst_vpc']) == ('internet', 'external'), str(external))


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


def row(src_name, dst_name, port, byte_count):
    return (BUCKET, (('src_name', src_name), ('dst_name', dst_name),
                     ('service_port', port))), [byte_count, 1]


# One pair talking over three services, moving 300 in all, against two single
# pairs moving more than any ONE of the three rows. Ranked row by row the pair
# loses every seat; ranked by pair it wins the first.
fleet = dict([
    row('web-fleet', 'S3', '443', 100),
    row('web-fleet', 'S3', '80', 100),
    row('web-fleet', 'S3', '8080', 100),
    row('the-database', 'S3', '443', 250),
    row('a-cache', 'S3', '443', 200),
    row('noise', 'S3', '443', 10),
])

TOP_WAS = pfl.TOP_N_PAIRS
pfl.TOP_N_PAIRS = 2
cut = pfl.cut_to_top_n(fleet)
pfl.TOP_N_PAIRS = TOP_WAS

survivors = defaultdict(int)
for (_, labels), values in cut.items():
    survivors[dict(labels)['src_name']] += values[0]

check('the pair survives the cut whole: all three rows kept',
      survivors.get('web-fleet') == 300, str(survivors.get('web-fleet')))
check('the second seat goes to the next pair by TOTAL, not by biggest row',
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


class _FakeClient:
    # Pages per operation, so one fake answers every describe a batch makes.
    def __init__(self, pages, calls, explode=False):
        self.pages, self.calls, self.explode = pages, calls, explode

    def get_paginator(self, operation):
        if self.explode:
            raise RuntimeError('AWS said no')
        return _FakePaginator(self.pages.get(operation, []), self.calls, operation)

    def describe_tags(self, **kwargs):
        self.calls.append(('describe_tags', kwargs))
        if self.explode:
            raise RuntimeError('AccessDenied')
        return self.pages['describe_tags']

    def list_tags(self, **kwargs):
        self.calls.append(('list_tags', kwargs))
        if self.explode:
            raise RuntimeError('AccessDenied')
        return self.pages['list_tags']


VPC_PAGE = {'describe_vpcs': [{'Vpcs': [{
    'VpcId': 'vpc-lab', 'Tags': [{'Key': 'Name', 'Value': 'lab-vpc'}],
    'CidrBlockAssociationSet': [{'CidrBlock': '10.3.0.0/16'}]}]}]}
CLIENTS_WERE = (pfl.ec2, pfl.elbv2, pfl.rds, pfl.lambda_client)

calls = []
pfl.ec2 = _FakeClient(VPC_PAGE, calls)
pfl._cidrs_cache['expires_at'] = 0.0
pfl._cidrs_cache['blocks'] = []
first = pfl.known_cidrs()
second = pfl.known_cidrs()
check('the CIDRs are described once, not once per delivered object',
      len(calls) == 1, str(len(calls)))
check('and the second call answers from the cache, with the same content',
      first == second)
check('the same answer names the VPC after its Name tag',
      pfl.vpc_label('vpc-lab') == 'lab-vpc', pfl.vpc_label('vpc-lab'))

pfl._cidrs_cache['expires_at'] = time.time() - 1
pfl.known_cidrs()
check('once the timer runs out it reads again, so a rename is picked up',
      len(calls) == 2, str(len(calls)))


def interface(addresses, **fields):
    out = {'PrivateIpAddresses': [{'PrivateIpAddress': a} for a in addresses],
           'OwnerId': '123456789012'}
    out.update(fields)
    return out


# Two instances of one Auto Scaling group, a NAT gateway, a load balancer, a Lambda
# function, a database and an address nothing owns any more.
ACCOUNT_PAGES = {
    'describe_network_interfaces': [{'NetworkInterfaces': [
        interface(['10.3.0.11'], Attachment={'InstanceId': 'i-asg1'}),
        interface(['10.3.0.12'], Attachment={'InstanceId': 'i-asg2'}),
        interface(['10.3.0.20'], InterfaceType='nat_gateway',
                  Description='Interface for NAT Gateway nat-0a1b2c3d4e5f60718'),
        interface(['10.3.0.30'], Description='ELB app/front-door/50dc6c495c0c9188'),
        interface(['10.3.0.40'], InterfaceType='lambda',
                  Description='AWS Lambda VPC ENI-process-orders-3f1c2b4a-1d2e-4f5a-9b8c-7d6e5f4a3b2c'),
        interface(['10.3.0.50'], Description='RDSNetworkInterface'),
    ]}],
    'describe_instances': [{'Reservations': [{'Instances': [
        {'InstanceId': 'i-asg1', 'Tags': [{'Key': 'Name', 'Value': 'ASG'}]},
        {'InstanceId': 'i-asg2', 'Tags': [{'Key': 'Name', 'Value': 'ASG'}]},
    ]}]}],
    'describe_nat_gateways': [{'NatGateways': [
        {'NatGatewayId': 'nat-0a1b2c3d4e5f60718', 'Tags': [{'Key': 'Name', 'Value': 'NAT'}]}]}],
    'describe_db_instances': [{'DBInstances': [
        {'DBInstanceIdentifier': 'orders-db', 'Endpoint': {'Address': '10.3.0.50'},
         'TagList': [{'Key': 'Name', 'Value': 'OrdersDb'}]}]}],
    'describe_tags': {'TagDescriptions': [{
        'ResourceArn': 'arn:aws:elasticloadbalancing:' + pfl.REGION
                       + ':123456789012:loadbalancer/app/front-door/50dc6c495c0c9188',
        'Tags': [{'Key': 'Name', 'Value': 'FrontDoor'}]}]},
    'list_tags': {'Tags': {'Name': 'ProcessOrders'}},
}
EVERY = {'10.3.0.11', '10.3.0.12', '10.3.0.20', '10.3.0.30', '10.3.0.40', '10.3.0.50', '10.3.0.99'}

calls = []
fake = _FakeClient(ACCOUNT_PAGES, calls)
pfl.ec2 = pfl.elbv2 = pfl.rds = pfl.lambda_client = fake
pfl._owner_by_address.clear()
pfl._rds_cache['expires_at'] = 0.0
owners = pfl.owners_for_addresses(EVERY)
check('every instance of a group is named after the group, whatever its id',
      owners.get('10.3.0.11') == owners.get('10.3.0.12') == ('ASG', 'instance'), str(owners))
check('a NAT gateway is named by its own Name tag',
      owners.get('10.3.0.20') == ('NAT', 'nat_gateway'), str(owners.get('10.3.0.20')))
check('a load balancer by its tag, found from the description of its interface',
      owners.get('10.3.0.30') == ('FrontDoor', 'load_balancer'), str(owners.get('10.3.0.30')))
check('a Lambda function by its tag, the uuid after its name left out',
      owners.get('10.3.0.40') == ('ProcessOrders', 'lambda'), str(owners.get('10.3.0.40')))
check('a database by its tag, through the address its endpoint resolves to',
      owners.get('10.3.0.50') == ('OrdersDb', 'rds'), str(owners.get('10.3.0.50')))
check('an address nothing owns has no name',
      '10.3.0.99' not in owners, str(owners.get('10.3.0.99')))
interface_calls = [c for c in calls if c[0] == 'describe_network_interfaces']
check('one call finds the owner of every address of the batch',
      len(interface_calls) == 1, str(len(interface_calls)))
check('and it asks by ADDRESS',
      interface_calls[0][1]['Filters'][0]['Name'] == 'addresses.private-ip-address',
      str(interface_calls[0][1]['Filters'][0]['Name']))
instance_calls = [c for c in calls if c[0] == 'describe_instances']
check('instances are read by a FILTER on the id: a dead id in a list fails the call',
      len(instance_calls) == 1 and instance_calls[0][1]['Filters'][0]['Name'] == 'instance-id',
      str(instance_calls))

before = len(calls)
pfl.owners_for_addresses(EVERY)
check('asking again inside the timer costs nothing', len(calls) == before, str(len(calls) - before))

pfl.owners_for_addresses(EVERY | {'10.3.0.13'})
asked = [c for c in calls[before:] if c[0] == 'describe_network_interfaces']
check('only the address the cache lacks is asked for',
      len(asked) == 1 and asked[0][1]['Filters'][0]['Values'] == ['10.3.0.13'], str(asked))

# Without permission to read the tags, a load balancer and a function still have
# the name their interface carries -- which the generator took from the box.
denied = _FakeClient(ACCOUNT_PAGES, [], explode=True)
pfl.elbv2 = pfl.lambda_client = denied
pfl._owner_by_address.clear()
owners = pfl.owners_for_addresses({'10.3.0.30', '10.3.0.40'})
check('a load balancer whose tags cannot be read keeps its own name',
      owners.get('10.3.0.30') == ('front-door', 'load_balancer'), str(owners.get('10.3.0.30')))
check('and so does a function',
      owners.get('10.3.0.40') == ('process-orders', 'lambda'), str(owners.get('10.3.0.40')))

pfl.ec2 = _FakeClient(ACCOUNT_PAGES, [], explode=True)
pfl._owner_by_address.clear()
check('a failed describe returns no owners instead of taking the run down',
      pfl.owners_for_addresses({'10.3.0.11'}) == {})
pfl.ec2 = _FakeClient(ACCOUNT_PAGES, [])
check('and it is NOT cached as nameless: a transport failure is not an answer',
      pfl.owners_for_addresses({'10.3.0.11'}).get('10.3.0.11') == ('ASG', 'instance'))

pfl.ec2, pfl.elbv2, pfl.rds, pfl.lambda_client = CLIENTS_WERE

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
check('and both the original and the rewritten address are collected -- a hop is '
      'named by the second',
      worth == {'10.3.0.31', '10.3.0.77', '10.3.0.200'}, str(sorted(worth)))



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


print('\n=== an Auto Scaling group is one end, whichever instances it runs ===')

# Two instances of the group ping the NAT instance of the other VPC across a
# peering; later the group is replaced by a new instance with a new id and a new
# address. All of them carry the group's Name tag.
PEERED_CIDRS = [(ipaddress.ip_network('10.3.0.0/16'), 'vpc-lab'),
                (ipaddress.ip_network('10.5.0.0/16'), 'vpc-asg')]
pfl._vpc_name_by_id['vpc-asg'] = 'asg-vpc'
PEER_OWNERS = {'10.5.0.11': ('ASG', 'instance'), '10.5.0.12': ('ASG', 'instance'),
               '10.5.0.77': ('ASG', 'instance'), '10.3.0.10': ('NAT', 'instance')}


def ping_record(src, dst, instance, start='1790205000'):
    return {'srcaddr': src, 'dstaddr': dst, 'flow-direction': 'egress',
            'traffic-path': '4', 'srcport': '0', 'dstport': '0', 'protocol': '1',
            'packets': '10', 'bytes': '12280', 'start': start,
            'instance-id': instance}


peer_totals = pfl.accumulate([ping_record('10.5.0.11', '10.3.0.10', 'i-asg1'),
                              ping_record('10.5.0.12', '10.3.0.10', 'i-asg2')],
                             PEERED_CIDRS, defaultdict(int), PEER_OWNERS)
check('two instances of the group are ONE series, with both volumes',
      len(peer_totals) == 1 and list(peer_totals.values())[0][0] == 24560,
      str(peer_totals))
group_labels = dict(list(peer_totals.keys())[0][1])
check('named after the group, in the VPC of the group',
      (group_labels['src_name'], group_labels['src_vpc']) == ('ASG', 'asg-vpc'), str(group_labels))

later = pfl.accumulate([ping_record('10.5.0.77', '10.3.0.10', 'i-asg9', start='1790208600')],
                       PEERED_CIDRS, defaultdict(int), PEER_OWNERS)
check('the instance launched an hour later, new id and new address, continues the SAME series',
      list(later.keys())[0][1] == list(peer_totals.keys())[0][1],
      str((list(later.keys())[0][1], list(peer_totals.keys())[0][1])))


print('\n' + ('all checks passed' if not failures else 'FAILED: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
