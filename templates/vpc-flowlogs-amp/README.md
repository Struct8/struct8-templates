# vpc-flowlogs-amp — assets

Source code shipped with the VPC Flow Logs → Managed Prometheus template: the
aggregator that turns flow log records into Prometheus series, and the two
bootstrap scripts the lab instances run.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## What the template is

A **self-contained** observation lab: its own VPC, a public and a private subnet,
an Internet Gateway, a NAT instance, two EC2s that talk, a VPC flow log delivering
to S3, a Lambda triggered by each delivered object, and a Managed Prometheus
workspace it writes into.

It exists so the diagram's **Traffic** layer has something real to read. Without
it that layer can only be exercised against a sample, and a sample cannot tell you
whether the read path works against an account.

## What the code is

`v1/lambda/process-flow-logs/` — the aggregator, wired to the Lambda's
`file_path_`. It reads plain-text flow log objects, derives the field map from
each file's own header, drops what a security group or network ACL refused,
keeps one capture of every flow, names both ends and the service port, collapses
everything outside the known CIDRs, accumulates into 60-second buckets and
remote-writes the result. Remote write is protobuf framed in snappy, encoded
by hand: **no dependency outside the runtime**, so the directory zips as it is.

`v1/user_data/FlowLogTrafficGenerator.sh` — an Amazon Linux 2023 `user_data`
script for the public traffic generator. It installs a systemd unit that curls three
destinations every 20 seconds, which is not decoration: each one exercises a
different branch of the endpoint collapse the aggregator performs (a named AWS
service, the generic Amazon range, and an address outside every AWS range).

`v1/user_data/PrivateTrafficGenerator.sh` — the `user_data` of the traffic
generators in the private subnets: the private instance of `vpc-a` and the launch
template of the Auto Scaling group in `vpc-b`. Every part is switched on by a
variable in `/etc/struct8_env` and skipped when it is missing, so one script
serves both nodes:

| Variable | What the node does |
|---|---|
| `AWS_S3_BUCKET_NAME_0` | writes, reads and deletes an object in the wired bucket |
| `AWS_DYNAMODB_TABLE_NAME_0` | writes and reads an item in the wired table |
| `PING_TARGET` | pings each address (ICMP) |
| `PROBE` | opens one conversation per `host:port/tcp` or `host:port/udp` |
| `LISTEN` | answers on each `port/tcp` (an HTTP response) and `port/udp` (an echo) |

In the lab, the private instance of `vpc-a` has a bucket, a table and
`LISTEN="80/tcp 53/udp"`; the group has a table, pings the private instance, and
probes it on 22/tcp, 80/tcp and 53/udp. The security group of the private
instance admits exactly those four, one rule per protocol, and each rule names
the group's security group as its source instead of an address range. The
Traffic layer shows ICMP, SSH, HTTP and DNS between the two VPCs.

`v1/user_data/Nat.sh` — the NAT instance bootstrap, so the private subnet reaches
the internet without a NAT gateway. It is a **copy** of the one under
`ec2-nat-private`, not a reference to it: rule 4 of the repository README, because
a shared path becomes a dependency of published versions that cannot be pinned.

## An end is its Name tag

Each end of a series is identified by the **Name tag of the resource that owns the
address**, which is the logical name of its box on the diagram. No instance id, no
address and no VPC id is written: all of them change when a resource is replaced,
and the box does not. A batch instance terminated and launched again, or an Auto
Scaling group that scales to zero and back, continues the SAME series.

| Label | Value |
|---|---|
| `src_name`, `dst_name` | The owner's Name tag. `S3`, `internet`, `on-premises`, `unmapped-network` for an end outside every VPC. `unnamed` when nothing owning the address carries a Name tag |
| `src_type`, `dst_type` | What the owner is: `instance`, `nat_gateway`, `vpc_endpoint`, `load_balancer`, `lambda`, `rds`, `ecs_task`/`ecs_service`, or the kind of an outside end |
| `src_vpc`, `dst_vpc` | The VPC's Name tag, or `external` |
| `service_port`, `protocol`, `egress`, `hop` | As before: the service, the IP protocol, the door out of the VPC, and whether the record is a hop through a middlebox |

The owner is found from the address: one `ec2:DescribeNetworkInterfaces` says
whose interface it is, and each kind of owner is asked for its tag. The Lambda's
role needs these, all read-only:

| Permission | For |
|---|---|
| `ec2:DescribeVpcs`, `ec2:DescribeNetworkInterfaces`, `ec2:DescribeInstances` | VPC names, interface owners, instance tags |
| `ec2:DescribeNatGateways`, `ec2:DescribeVpcEndpoints` | NAT gateway and endpoint tags |
| `elasticloadbalancing:DescribeTags` | Load balancer tags |
| `lambda:ListTags` | Function tags |
| `rds:DescribeDBInstances` | Database tags, matched through the address the endpoint resolves to |

A missing permission does not stop the run. A load balancer or a function then
falls back to its own name, which the generator took from the box. Any other
owner is written as `unnamed`, and the Lambda's log says which call failed.

## How late a record may arrive

AWS splits some capture minutes across two deliveries, and the second part
reaches the workspace older than what its series already holds. The workspace
accepts such a sample only while it is at most **10 minutes older than the newest
sample the workspace holds from any series** (measured on 2026-09-23: 10.0 minutes
in, 10.1 refused with `too old sample`). Every run of the Lambda moves that newest
sample to about the current time, so a late part has about ten minutes from the
start of its minute. In the laboratory, the oldest record of each object arrived
4.4 to 6.4 minutes after its minute began.

A refused sample is lost, and it shows: the Lambda's log prints
`struct8_series_refused` with the series, and the count goes out as
`struct8_flowlog_series_refused_total`.

## The flow log format is part of the contract

The aggregator needs fields the **default** flow log format does not carry. The
template's flow log declares them, and two of them decide behaviour rather than
decorate it:

| Field | What it decides |
|---|---|
| `traffic-path` | Which door the flow left the VPC through. It becomes the `egress` label, and the canvas lands the far end of the conversation on that gateway |
| `pkt-dst-aws-service` | Whether a destination is a named AWS service. `traffic-path` value `2` is ambiguous — a gateway VPC endpoint only ever serves S3 and DynamoDB, whose flows carry this field, so a record **with** a service is undecidable and one without left through the Internet Gateway |
| `flow-direction` | Which side of a conversation a record describes. Every flow inside a VPC is written twice, once at each end, and only the egress copy is kept; a reply from outside is captured once, on its way in, and that copy is kept |
| `action` | Whether the packet got through. `REJECT` is a packet a security group or a network ACL dropped — on a public address, mostly the internet trying ports — and it is not counted as traffic |
| `srcport`, `dstport` | The service a conversation is named after: the lower of the two ports, so a request and its reply carry the same `service_port`. Two client-range ports give `EPHEMERAL_FLOOR` itself |

`FALLBACK_FIELD_ORDER` below is the same list, used only for an object that
arrives with no header line.

## Parameters the aggregator reads

All of these come from the diagram: the generator writes the wired resources'
names into the Lambda's environment, so nothing here is account-specific.

| Variable | Default | Meaning |
|---|---|---|
| `FLOW_LOG_BUCKET` | from `AWS_S3_BUCKET_NAME_0` | Bucket the flow log delivers into |
| `AWS_PROMETHEUS_WORKSPACE_ENDPOINT_0` | from `PROMETHEUS_ENDPOINT` | Workspace remote-write endpoint |
| `ACCOUNT` | empty | Account id, written as a series label |
| `AWS_REGION` | `us-east-1` | Set by the runtime |
| `BUCKET_SECONDS` | `60` | Aggregation window |
| `EPHEMERAL_FLOOR` | `32768` | Where client ports start. A conversation whose two ports are both at or above it is labelled with this value, so no connection adds a series of its own |
| `TOP_N_PAIRS` | `200` | Cardinality ceiling; the rest folds into one row |
| `DELIVERY_PREFIX` | `AWSLogs/` | Where the flow log writes |
| `OUTPUT_PREFIX` | `struct8/` | Refused as input, so the Lambda cannot read its own output |
| `DESCRIBE_TTL_SECONDS` | `600` | How long an address→owner answer is cached |
| `FALLBACK_FIELD_ORDER` | empty | Field order for an object with no header line |

## Two things that look like faults and are not

**The lab is silent for about ten minutes after an apply.** An S3 event
notification takes time to become effective, and objects delivered in that window
are never processed — the trigger is per event, and the event was lost. Invoking
the Lambda with an **empty event** sweeps the whole delivery prefix and recovers
them.

**A resource that only talks outwards draws one edge, to a gateway.** Every
destination collapses to `internet`, `S3`, `EC2` or `AMAZON`, and none of those is
a box on the diagram. The conversation lands on the door it left through instead,
and the four conversations fuse into one edge carrying the sum; which destinations
they were survives in the tooltip.

## Network shape

- VPC `10.3.0.0/16`, public subnet `10.3.0.0/24`, private subnet `10.3.1.0/24`
- Internet Gateway + public route table (`0.0.0.0/0` → IGW)
- NAT instance in the public subnet, `source_dest_check` disabled, and a private
  route table sending `0.0.0.0/0` to it
- Flow log on the **VPC**, `traffic_type = ALL`, delivering to S3 in plain text
- S3 notification on `AWSLogs/` + `.log.gz` invoking the aggregator
