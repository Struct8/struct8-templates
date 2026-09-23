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
each file's own header, keeps the egress direction only, names both ends,
collapses everything outside the known CIDRs, accumulates into 60-second buckets
and remote-writes the result. Remote write is protobuf framed in snappy, encoded
by hand: **no dependency outside the runtime**, so the directory zips as it is.

`v1/user_data/FlowLogTrafficGenerator.sh` — an Amazon Linux 2023 `user_data`
script for the two lab instances. It installs a systemd unit that curls three
destinations every 20 seconds, which is not decoration: each one exercises a
different branch of the endpoint collapse the aggregator performs (a named AWS
service, the generic Amazon range, and an address outside every AWS range).

`v1/user_data/Nat.sh` — the NAT instance bootstrap, so the private subnet reaches
the internet without a NAT gateway. It is a **copy** of the one under
`ec2-nat-private`, not a reference to it: rule 4 of the repository README, because
a shared path becomes a dependency of published versions that cannot be pinned.

## The flow log format is part of the contract

The aggregator needs fields the **default** flow log format does not carry. The
template's flow log declares them, and two of them decide behaviour rather than
decorate it:

| Field | What it decides |
|---|---|
| `traffic-path` | Which door the flow left the VPC through. It becomes the `egress` label, and the canvas lands the far end of the conversation on that gateway |
| `pkt-dst-aws-service` | Whether a destination is a named AWS service. `traffic-path` value `2` is ambiguous — a gateway VPC endpoint only ever serves S3 and DynamoDB, whose flows carry this field, so a record **with** a service is undecidable and one without left through the Internet Gateway |
| `flow-direction` | Which side of a conversation a record describes. Every flow inside a VPC is written twice, once at each end; keeping the egress side counts it once |

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
| `CUTOFF_SECONDS` | `1800` | How long a bucket stays open for late records |
| `TOP_N_PAIRS` | `200` | Cardinality ceiling; the rest folds into one row |
| `DELIVERY_PREFIX` | `AWSLogs/` | Where the flow log writes |
| `OUTPUT_PREFIX` | `struct8/` | Refused as input, so the Lambda cannot read its own output |
| `DESCRIBE_TTL_SECONDS` | `600` | How long an address→name answer is cached |
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
