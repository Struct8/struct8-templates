# vpc-k6-load-generator — assets

Source code shipped with the self-contained k6 load-generator template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## What the template is

A **self-contained** load-testing environment: it ships its own VPC, a public
subnet, an Internet Gateway and a k6 generator EC2. It depends on nothing else on
the diagram, so it can be dropped into any region and torn down whole afterwards.

Because the generator sits in a **public subnet** with a public IP, it reaches the
internet directly — it pulls the `grafana/k6` image, talks to SSM, and hits any
`TARGET_URL` — with **no NAT gateway**. That keeps the template cheap and its
network small.

## What the code is

`v1/user_data/k6-bootstrap.sh` — an EC2 `user_data` script for Amazon Linux 2023.
It installs Docker, pulls the `grafana/k6` image, writes a parametrized k6 test to
`/opt/k6/scripts/load-test.js`, and a run wrapper to `/opt/k6/run.sh`. It does
**not** run a test on boot: load starts only when someone fires it through
Struct8 Debug Access.

## How a test is fired

Through Debug Access at the `shell` access level (the canvas owner picks it in the
state's Actions tab — it defaults to the restricted `probes` level, which cannot
run this):

```bash
TARGET_URL=https://your-service.example.com/ /opt/k6/run.sh
RPS=200 VUS=100 DURATION=5m TARGET_URL=https://your-service.example.com/ /opt/k6/run.sh
```

`TARGET_URL` is **required** — the generator is not wired to any target, so the
endpoint under test is given per run. That is what lets one generator hit any
target without a redeploy.

## Parameters the script reads

| Variable | Default | Meaning |
|---|---|---|
| `TARGET_URL` | none (required) | The endpoint under test |
| `VUS` | `10` | Virtual users (concurrency) |
| `DURATION` | `30s` | Test length, e.g. `30s`, `2m`, `1h` |
| `RPS` | unset | Fixed requests/second. When set, k6 holds this arrival rate regardless of latency; when unset, VUs loop as fast as they can |

Thresholds: p95 latency under 1000 ms and error rate under 1%. k6 exits non-zero
when a threshold is breached, which the agent reads back through `debug_result`.

## Network shape

- VPC `10.60.0.0/16`, one public subnet `10.60.1.0/24`
- Internet Gateway + public route table (`0.0.0.0/0` → IGW)
- EC2 with a public IP, an IAM role for SSM, security group egress-only (it is a
  client; it listens on nothing)

To test a target in another VPC, either give its public endpoint as `TARGET_URL`,
or peer this VPC with the target's and pass the target's private DNS name.
