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

`TARGET_URL` is the endpoint under test. Set it as a node environment variable
(for the auto-run) or per run (for the on-demand path).

## Two ways to run

**1. On a timer, without an agent (default).** A systemd timer fires the default
plan **once**, `STARTUP_DELAY` seconds after boot. The delay lets the target come
up before the load starts. This is what a user gets out of the box — apply the
template, wait, and the test runs itself. Set `AUTOSTART=off` to disable it and
keep the generator idle.

**2. On demand, driven by an agent.** Through Struct8 Debug Access, the agent
runs `/opt/k6/run.sh` with env vars to tailor the plan — change load, duration
or target per run, and iterate on the results. This is the "agent helps the user
build a test plan" path: the agent overrides the defaults live.

The two coexist: the timer guarantees a test always runs; the agent turns that
fixed plan into a tailored one.

## The default plan (three knobs)

The plan is shaped by three node environment variables, so a user sets it from
the diagram and an agent overrides it per run:

| Variable | Default | Meaning |
|---|---|---|
| `STARTUP_DELAY` | `360` | Seconds to wait after boot before the auto-run (the timer). Give the target enough time to come up. |
| `DURATION` | `5m` | Total test time, e.g. `30s`, `5m`, `1h`. |
| `VUS` | `20` | The load, in virtual users (concurrency). |

Plus: `TARGET_URL` (endpoint), `METHOD` (`GET`/`POST`), `RPS` (optional fixed
arrival rate — when set, k6 holds it regardless of latency), and `AUTOSTART`
(`on`/`off`).

Thresholds: p95 latency under 1000 ms and error rate under 1%. k6 exits non-zero
when a threshold is breached, which an agent reads back through `debug_result`.

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

## Network shape

- VPC `10.60.0.0/16`, one public subnet `10.60.1.0/24`
- Internet Gateway + public route table (`0.0.0.0/0` → IGW)
- EC2 with a public IP, an IAM role for SSM, security group egress-only (it is a
  client; it listens on nothing)

To test a target in another VPC, either give its public endpoint as `TARGET_URL`,
or peer this VPC with the target's and pass the target's private DNS name.
