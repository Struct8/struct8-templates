# vpc-k6-load-generator — assets

Source code shipped with the self-contained k6 load-generator template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |
| v2 | `v2/` — v1 plus the optional web control panel, and the live dashboard started once instead of twice |
| v3 | `v3/` — v2 plus a WordPress visitors scenario, optional auto-start, and the panel fixes listed under [v3](#v3-scenarios-and-auto-start) |

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
| `STAGES` | unset | v2 only. JSON list of `{"target": VUs, "duration": "30s"}`; switches to the `ramping-vus` executor and wins over `VUS`/`DURATION`/`RPS` |
| `START_VUS` | `0` | v2 only. VUs at t=0 when `STAGES` is set |

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

Two load modes, switched at the top of the panel:

- **Constant** — a fixed number of VUs for a duration, optionally held at a fixed
  request rate.
- **Curve** — draw the load over time. Click the chart to add a point, drag a
  point to move it, double-click to remove it; with a point focused, the arrow
  keys move it. A table beside the chart shows the same points and can be edited
  directly. Presets give a ramp, a spike, steps or a soak to start from. Each
  point is "this many VUs at this moment"; k6 ramps in a straight line between
  them (`ramping-vus` executor). Up to 50 points.

The curve reaches k6 as two variables the test script reads, so an agent can use
it through Debug Access too:

```bash
START_VUS=0 STAGES='[{"target":50,"duration":"1m"},{"target":50,"duration":"3m"},{"target":0,"duration":"30s"}]' \
  TARGET_URL=https://your-service.example.com/ /opt/k6/run.sh
```

When `STAGES` is set it takes precedence over `VUS`, `DURATION` and `RPS`.

**Failing-request alert.** A run can look fine — container up, dashboard served —
while every request fails on a wrong port, path or host, which leaves the target's
own metrics flat. The panel reads the failure rate from k6's output and, once it
passes 50%, shows an alert naming the likely cause (DNS, connection refused,
timeout, TLS) while the run is still going; when the run ends with a high failure
rate it is marked **Last run failed** rather than a bare exit code. It only alerts;
it does not stop the run, since some failures can be expected.

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

## v3: scenarios and auto-start

Point the EC2's `user_data_file_path_` at
`templates/vpc-k6-load-generator/v3/user_data/k6-bootstrap.sh`.

**Without `K6_SCENARIO`, v3 runs exactly what v2 runs**: the same test script
(byte for byte), the same variables and the same defaults. `v3/test/compat-with-v2.sh`
proves it: it runs the `run.sh` of both versions with a fake `docker` and compares
the commands (`bash templates/vpc-k6-load-generator/v3/test/compat-with-v2.sh`).

### WordPress scenario

`K6_SCENARIO=wordpress` runs `v3/scenarios/wordpress.js`: anonymous visitors
browsing a WordPress site. One iteration is one visit — an entry page, then one
to six pages with a reading pause between them (2.6 pages on average). The load is
set in **new visits per second** (`ramping-arrival-rate`), so the rate keeps
climbing when the site slows down, which is what shows where it breaks.

- **The URLs come from the site.** When the run starts, the script reads the
  posts, pages and categories from the WordPress REST API, so it works on any
  WordPress without a list typed by hand.
- **The mix:** visits enter on the home page (45%), a post (35%), a page (15%) or
  a category (5%); the next page is a post (40%), the home page, a page, a
  category or a search `?s=` (15% each). A search goes to the database.
- **Read-only:** no login, no comments, no forms. A form sends e-mail and a
  comment writes to the database.
- **Stops by itself** when 10% of the pages fail or the p95 passes 8 s: that is
  where the site broke. The summary gives the time of each kind of page
  (home, post, page, category, search) against its goal.
- **A site with a handful of posts gives optimistic numbers**: the whole database
  fits in memory. Add a few hundred posts to a lab site first, e.g.
  `wp post generate --count=300`.

| Variable | Default | Meaning |
|---|---|---|
| `TARGET_URL` | none (required) | The site, e.g. `https://wp.example.com/` |
| `PROFILE` | `steps` | `smoke` (1 visit/s for 2 min), `steps` (climbs to the peak in levels), `spike` (sudden jump), `soak` (holds the peak) |
| `PEAK` | `10` | New visits per second at the top of the curve |
| `STEPS` / `STEP_TIME` | `5` / `10m` | `steps` profile: how many levels, and how long each is held. A new ECS task or EC2 instance takes minutes to join |
| `SOAK_TIME` | `1h` | `soak` profile: how long the peak is held |
| `THINK_MIN` / `THINK_MAX` | `3` / `10` | Seconds a visitor reads each page |
| `MAX_VUS` | `1000` | Concurrent visits k6 may keep open. Runs out on a very slow site: `dropped_iterations` then counts the visits it could not start |
| `FETCH_ASSETS` | `off` | `on` downloads the images, CSS and JS of each page once per visit. Behind a CDN they come from its cache and never reach WordPress |
| `SEARCH_WORDS` | a list of 16 words | Comma-separated words for the searches |

```bash
K6_SCENARIO=wordpress PROFILE=steps PEAK=20 TARGET_URL=https://wp.example.com/ /opt/k6/run.sh
```

### In the panel

A third mode, **WordPress**, appears when the bootstrap managed to download the
scenario. It shows the load shape, the peak and the times, and the total length
of the run before it starts. `K6_PANEL_MAX_RATE` (default `100`) caps the peak in
new visits per second, next to the other caps.

Two fixes over v2, in every mode:

- **A finished run ends.** k6 does not exit while a browser holds its live
  dashboard open, and the panel's embedded dashboard is one: in v2 a run stays
  "Running" for as long as the panel page is open. v3 closes the embedded
  dashboard as soon as k6 marks the test done.
- **A value set for the call wins.** In v2, `/opt/k6/run.sh` read the node
  environment after the caller's variables, so `TARGET_URL=... /opt/k6/run.sh`
  was ignored on a node that declares `TARGET_URL`. In v3 the caller's value wins.

### Auto-start

`AUTOSTART=on` fires one run `STARTUP_DELAY` seconds after boot (default `360`),
with the node environment: the scenario and the load are whatever the node
declares. It is a systemd timer, `struct8-k6-loadtest.timer`, and it runs once per
boot. Off by default, as in v2.

### Moving a template from v1 or v2 to v3

- Change the path in `user_data_file_path_` and publish a new template version.
  Nothing else is needed: v3 reads the same variables.
- A generator that is **already applied** does not pick up v3 by itself. A new
  `user_data` stops and starts the instance (its public IP changes), and EC2 runs
  `user_data` only on the first boot. Recreate the generator to use v3.
- A template built on the `add-k6-autostart-timer` branch, whose auto-start was
  on by default with 20 VUs for 5 minutes, gets the same behaviour on v3 with
  `AUTOSTART=on`, `VUS=20` and `DURATION=5m` on the node.
- `K6_REF` pins the branch, tag or commit the panel and the scenarios are fetched
  from (default `main`); v2's `K6_PANEL_REF` is still read.
- EC2 caps `user_data` at 16 KB, and the diagram adds the node's variables to it.
  The v3 bootstrap is 12.7 KB.

## Network shape

- VPC `10.60.0.0/16`, one public subnet `10.60.1.0/24`
- Internet Gateway + public route table (`0.0.0.0/0` → IGW)
- EC2 with a public IP, an IAM role for SSM, security group egress-only (it is a
  client; it listens on nothing). With the control panel on, add ingress on 80
  (panel) and 5665 (live dashboard).

To test a target in another VPC, either give its public endpoint as `TARGET_URL`,
or peer this VPC with the target's and pass the target's private DNS name.
