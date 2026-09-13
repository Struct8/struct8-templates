#!/bin/bash
# k6 load generator on Amazon Linux 2023.
#
# Architecture-neutral: it runs unchanged on x86_64 and on arm64 (Graviton,
# e.g. t4g), because it assumes no CPU. The Docker platform is detected at boot
# and grafana/k6 (a multi-arch image) is pulled for exactly that platform. So
# swapping the instance family -- and its matching AMI -- does not require a
# script change.
#
# Boots Docker, pulls the grafana/k6 image, and drops a ready-to-run k6 test
# script on disk. Two ways to run it:
#
#  1. ON A TIMER, with no agent (default). A systemd timer fires the default
#     plan once, STARTUP_DELAY seconds after boot -- the delay lets the target
#     come up first. This is what a user without an agent gets out of the box.
#
#  2. ON DEMAND, driven by an agent (or a person) through Struct8 Debug Access:
#     `/opt/k6/run.sh` with env vars. The agent uses this to tailor the plan --
#     change the load, duration or target per run, or iterate on results.
#
# The default plan is defined by three node environment variables, so a user
# shapes it from the diagram and an agent can override it live:
#   STARTUP_DELAY  seconds to wait after boot before the auto-run   (default 360)
#   DURATION       total test time                                  (default 5m)
#   VUS            load, in virtual users                           (default 20)
# plus TARGET_URL, METHOD, RPS. Set AUTOSTART=off to disable the timer and keep
# the generator idle until something calls /opt/k6/run.sh.
#
# This template ships its own VPC and a public subnet, so the generator is not
# tied to any particular target. The endpoint under test is TARGET_URL.
#   TARGET_URL=https://your-service.example.com/ /opt/k6/run.sh
#   RPS=200 VUS=100 DURATION=5m TARGET_URL=https://... /opt/k6/run.sh
LOGFILE="/var/log/user-data.log"
exec >$LOGFILE 2>&1
set -x

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

# Architecture-aware: this script must boot on both x86_64 and arm64 (Graviton),
# so nothing here assumes a CPU. We detect the arch, map it to the Docker
# platform string, and pull grafana/k6 for exactly that platform -- grafana/k6
# is a multi-arch image, so the right layers are fetched instead of relying on
# the daemon guessing. If a platform ever has no manifest, we fail loudly here
# rather than at `docker run` time.
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  K6_PLATFORM="linux/amd64" ;;
  aarch64|arm64) K6_PLATFORM="linux/arm64" ;;
  *)             echo "Unsupported CPU architecture: $ARCH" >&2; exit 1 ;;
esac
echo "Detected architecture: $ARCH -> Docker platform $K6_PLATFORM"
echo "$K6_PLATFORM" > /opt/k6/platform 2>/dev/null || { mkdir -p /opt/k6; echo "$K6_PLATFORM" > /opt/k6/platform; }

echo "Pulling the k6 image for $K6_PLATFORM..."
if ! docker pull --platform "$K6_PLATFORM" grafana/k6:latest; then
  echo "Failed to pull grafana/k6:latest for $K6_PLATFORM. No image for this architecture?" >&2
  exit 1
fi

echo "Writing the k6 test script..."
mkdir -p /opt/k6/scripts
cat > /opt/k6/scripts/load-test.js <<'K6EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Every knob comes from the environment, so one script serves every run.
// The agent sets these with -e on `docker run` -- no edit, no redeploy.
const TARGET_URL = __ENV.TARGET_URL || 'http://localhost/';
const VUS = parseInt(__ENV.VUS || '10', 10);
const DURATION = __ENV.DURATION || '30s';
// HTTP method. Default GET. Set METHOD=POST for targets whose work endpoint
// only answers POST -- the Struct8 Hub load-test endpoint is one of them
// (POST /loadtest?ms=N; a GET there returns 405 and every check fails).
const METHOD = (__ENV.METHOD || 'GET').toUpperCase();
const BODY = __ENV.BODY || '';
// Optional fixed request rate. When RPS is set the test holds that arrival
// rate regardless of latency, which is the honest way to measure a system
// under a known load. When it is unset the VUs loop as fast as they can.
const RPS = __ENV.RPS ? parseInt(__ENV.RPS, 10) : 0;

const errorRate = new Rate('failed_requests');

export const options = RPS > 0
  ? {
      scenarios: {
        constant_rate: {
          executor: 'constant-arrival-rate',
          rate: RPS,
          timeUnit: '1s',
          duration: DURATION,
          preAllocatedVUs: VUS,
          maxVUs: VUS * 4,
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<1000'],
        failed_requests: ['rate<0.01'],
      },
    }
  : {
      vus: VUS,
      duration: DURATION,
      thresholds: {
        http_req_duration: ['p(95)<1000'],
        failed_requests: ['rate<0.01'],
      },
    };

export default function () {
  const res = METHOD === 'POST'
    ? http.post(TARGET_URL, BODY)
    : http.request(METHOD, TARGET_URL);
  const ok = check(res, {
    'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
  errorRate.add(!ok);
  sleep(1);
}
K6EOF

echo "Writing the run wrapper..."
cat > /opt/k6/run.sh <<'RUNEOF'
#!/bin/bash
# Convenience wrapper for a k6 run.
#
# Usage (from Debug Access, shell level):
#   TARGET_URL=https://your-service/ /opt/k6/run.sh
#   VUS=100 DURATION=5m TARGET_URL=https://your-service/ /opt/k6/run.sh
#   RPS=200 VUS=100 DURATION=5m TARGET_URL=https://your-service/ /opt/k6/run.sh
#
# TARGET_URL is required: this generator ships its own VPC and is not wired to
# any target, so the endpoint under test is given per run.
set -euo pipefail

[ -f /etc/struct8_env ] && source /etc/struct8_env

# Run on the same platform the image was pulled for (x86_64 or arm64). The
# platform was detected at boot and saved to /opt/k6/platform; fall back to the
# live arch if that file is missing.
if [ -f /opt/k6/platform ]; then
  K6_PLATFORM="$(cat /opt/k6/platform)"
else
  case "$(uname -m)" in
    x86_64|amd64)  K6_PLATFORM="linux/amd64" ;;
    aarch64|arm64) K6_PLATFORM="linux/arm64" ;;
    *)             K6_PLATFORM="" ;;
  esac
fi

if [ -z "${TARGET_URL:-}" ]; then
  echo "TARGET_URL is required. Example: TARGET_URL=https://your-service/ /opt/k6/run.sh" >&2
  exit 1
fi

# The k6 web dashboard is served WHILE the test runs, on port 5665. It must
# bind 0.0.0.0 (not the default 127.0.0.1), because it runs inside the container
# and is reached from outside the instance; the port is published from the
# container, and a final HTML report is written so it survives the run.
DASHBOARD_PORT="${DASHBOARD_PORT:-5665}"
# Default plan: 20 VUs for 5m (matches the documented STARTUP_DELAY/DURATION/VUS
# knobs). An agent overrides any of these per run by exporting them first.
VUS="${VUS:-20}"
DURATION="${DURATION:-5m}"
echo "k6 -> ${TARGET_URL}  (VUS=${VUS} DURATION=${DURATION} RPS=${RPS:-unset}) on ${K6_PLATFORM:-native}"
echo "Live dashboard on port ${DASHBOARD_PORT} while the test runs."
# The grafana/k6 container runs as a non-root uid, so the report directory
# has to be world-writable or the HTML export fails with permission denied.
mkdir -p /opt/k6/report && chmod 777 /opt/k6/report
exec docker run --rm -i \
  ${K6_PLATFORM:+--platform "${K6_PLATFORM}"} \
  -p "${DASHBOARD_PORT}:${DASHBOARD_PORT}" \
  -e TARGET_URL="${TARGET_URL}" \
  -e VUS="${VUS}" \
  -e DURATION="${DURATION}" \
  ${RPS:+-e RPS="${RPS}"} \
  -e METHOD="${METHOD:-GET}" \
  ${BODY:+-e BODY="${BODY}"} \
  -e K6_WEB_DASHBOARD=true \
  -e K6_WEB_DASHBOARD_HOST=0.0.0.0 \
  -e K6_WEB_DASHBOARD_PORT="${DASHBOARD_PORT}" \
  -e K6_WEB_DASHBOARD_EXPORT=/report/index.html \
  -v /opt/k6/report:/report \
  grafana/k6 run --out web-dashboard - < /opt/k6/scripts/load-test.js
RUNEOF
chmod +x /opt/k6/run.sh

# ---------------------------------------------------------------------------
# Auto-start: run the default plan once, on a timer, for users without an agent.
# ---------------------------------------------------------------------------
# Read the three plan knobs (and the switch) from the node environment. The
# generator writes them as `export KEY = "value"` (spaces + quotes), which is
# NOT valid shell to source, so parse the value out instead.
VARS=/etc/profile.d/struct8_vars.sh
getvar() { [ -f "$VARS" ] && awk -F= -v k="$1" '$0 ~ ("^[[:space:]]*export[[:space:]]+" k "[[:space:]]*=") {gsub(/[ "]/,"",$2); print $2; exit}' "$VARS"; }
AUTOSTART="$(getvar AUTOSTART)";       AUTOSTART="${AUTOSTART:-on}"
STARTUP_DELAY="$(getvar STARTUP_DELAY)"; STARTUP_DELAY="${STARTUP_DELAY:-360}"

case "$(echo "$AUTOSTART" | tr '[:upper:]' '[:lower:]')" in
  on|true|1|yes)
    echo "Auto-start enabled: default plan will run ${STARTUP_DELAY}s after boot."
    # The service runs the default plan once. run.sh reads DURATION/VUS/TARGET_URL
    # /METHOD/RPS from /etc/struct8_env itself, so nothing about the plan is
    # duplicated here -- change the plan by changing the node's env vars.
    cat > /etc/systemd/system/struct8-k6-loadtest.service <<'SVCEOF'
[Unit]
Description=Struct8 k6 default load test (one-shot)
After=docker.service network-online.target
Wants=docker.service network-online.target
[Service]
Type=oneshot
ExecStart=/opt/k6/run.sh
SVCEOF

    # OnBootSec gives the target time to come up before the load starts. It is a
    # one-shot timer: the plan runs once per boot, not on a schedule -- an agent
    # or a person re-runs it on demand with /opt/k6/run.sh.
    cat > /etc/systemd/system/struct8-k6-loadtest.timer <<TIMEREOF
[Unit]
Description=Fire the Struct8 k6 default load test once, after a delay
[Timer]
OnBootSec=${STARTUP_DELAY}
AccuracySec=1s
[Install]
WantedBy=timers.target
TIMEREOF

    systemctl daemon-reload
    systemctl enable --now struct8-k6-loadtest.timer
    echo "Timer armed (OnBootSec=${STARTUP_DELAY}s)."
    ;;
  *)
    echo "Auto-start disabled (AUTOSTART=${AUTOSTART}); generator stays idle until /opt/k6/run.sh is called."
    ;;
esac

echo "Done. k6 image is ready; test script is at /opt/k6/scripts/load-test.js."
echo "On demand: TARGET_URL=... /opt/k6/run.sh  |  Auto: systemd timer struct8-k6-loadtest.timer"
