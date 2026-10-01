# vpc-k6-load-generator — assets

Source code shipped with the self-contained k6 load-generator template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |
| v2 | `v2/` — v1 plus the optional web control panel, and the live dashboard started once instead of twice |

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

**Architecture-neutral.** The script assumes no CPU: it detects the architecture
at boot (`x86_64` or `arm64`), maps it to the Docker platform, and pulls the
multi-arch `grafana/k6` image for exactly that platform. So the instance family
can be x86 (`t3`) or Graviton (`t4g`) with no change to this script — only the
EC2's AMI filter has to match the family's architecture (`...-x86_64` vs
`...-arm64`), which is a diagram setting, not a script one.

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

## Live web dashboard

The run serves k6's built-in **web dashboard** on port `5665` while the test runs — live
charts of VUs, request rate, response times, errors and checks. The container binds it to
`0.0.0.0` (not the default `127.0.0.1`, which is unreachable from outside the container) and
a final HTML report is written to `/opt/k6/report/index.html` so it survives the run.
`DASHBOARD_PORT` overrides the port.

Reaching it from the internet, when the generator sits in a private subnet, is done through
a NAT instance doing a port-forward (`FORWARD_PORT=5665`, `FORWARD_TARGET=<generator private
IP>`): browse `http://<NAT public IP>:5665`. That exposure is for a disposable test
environment — the dashboard has no auth, so do not leave it open on a long-lived setup.

## Web control panel (optional, v2)

`v2/control-panel/` is a small web UI for people who would rather not drive k6
through Debug Access: a form for the target, VUs, duration, rate, method and body,
Start/Stop buttons, the run output, the live dashboard embedded while a run is
going, and a link to the last run's HTML report. It is one Node file plus one
HTML page, with no npm dependencies.

It needs the v2 bootstrap: point the EC2's `user_data_file_path_` at
`templates/vpc-k6-load-generator/v2/user_data/k6-bootstrap.sh`.

It is **off by default**. Set `K6_PANEL=on` on the generator EC2 and the
bootstrap installs Node, downloads the two files from this folder in the public
repo, and runs the panel on port 80 as the systemd unit `struct8-k6-panel`. The
files are fetched instead of inlined because EC2 caps `user_data` at 16 KB.

Under the hood it does what `/opt/k6/run.sh` does: Start is a `docker run` of
`grafana/k6` with the same test script and the form values as `-e` flags; Stop
is a `docker stop`. A run started from the panel and one started through Debug
Access are the same test.

When a load balancer is wired from the generator, its DNS name
(`AWS_LB_DNSNAME_*`) is offered in the form as a ready-made target.

| Variable | Default | Meaning |
|---|---|---|
| `K6_PANEL` | `off` | `on` installs and starts the panel |
| `K6_PANEL_REF` | `main` | Branch, tag or commit the panel files are fetched from |
| `K6_PANEL_TOKEN` | unset | When set, the panel asks for this token before any action |
| `K6_PANEL_MAX_VUS` | `500` | Highest VU count a run may request |
| `K6_PANEL_MAX_DURATION` | `3600` | Longest run, in seconds |

**Exposure.** The panel needs ingress on port 80, and the embedded dashboard
needs 5665, on the generator's security group. This template is a short-lived
teaching lab whose users' IPs are not known in advance, so `0.0.0.0/0` on those
two ports is the expected setup. Anyone who reaches port 80 can fire load from
this instance at any URL, so set `K6_PANEL_TOKEN` when you can, keep the caps
low, and destroy the environment when the class is over.

## Network shape

- VPC `10.60.0.0/16`, one public subnet `10.60.1.0/24`
- Internet Gateway + public route table (`0.0.0.0/0` → IGW)
- EC2 with a public IP, an IAM role for SSM, security group egress-only (it is a
  client; it listens on nothing). With the control panel on, add ingress on 80
  (panel) and 5665 (live dashboard).

To test a target in another VPC, either give its public endpoint as `TARGET_URL`,
or peer this VPC with the target's and pass the target's private DNS name.
