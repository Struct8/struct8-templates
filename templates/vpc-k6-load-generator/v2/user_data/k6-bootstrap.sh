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
# script on disk. It does NOT run a test on boot: the test is fired on demand by
# an agent (or a person) through Struct8 Debug Access / SSM, so that load starts
# only when someone asks for it.
#
# This template ships its own VPC and a public subnet, so the generator is not
# tied to any particular target. The endpoint under test is passed per run as
# TARGET_URL:
#   TARGET_URL=https://your-service.example.com/ /opt/k6/run.sh
#   RPS=200 VUS=100 DURATION=5m TARGET_URL=https://... /opt/k6/run.sh
#
# TARGET_URL, VUS, DURATION and RPS are read by the script from the environment,
# so the same script covers every scenario without an edit or a redeploy.
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
// Optional load curve. STAGES is a JSON list of {"target": VUs, "duration": "30s"}
// and START_VUS the VUs at t=0: k6 ramps linearly from one target to the next.
// When STAGES is set it wins over VUS/DURATION/RPS. The control panel's curve
// editor writes these two; an agent can set them too:
//   STAGES='[{"target":50,"duration":"1m"},{"target":0,"duration":"30s"}]' /opt/k6/run.sh
const STAGES = __ENV.STAGES ? JSON.parse(__ENV.STAGES) : null;
const START_VUS = parseInt(__ENV.START_VUS || '0', 10);

const errorRate = new Rate('failed_requests');

export const options = STAGES
  ? {
      scenarios: {
        curve: {
          executor: 'ramping-vus',
          startVUs: START_VUS,
          stages: STAGES,
          gracefulRampDown: '10s',
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<1000'],
        failed_requests: ['rate<0.01'],
      },
    }
  : RPS > 0
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
echo "k6 -> ${TARGET_URL}  (VUS=${VUS:-10} DURATION=${DURATION:-30s} RPS=${RPS:-unset}) on ${K6_PLATFORM:-native}"
echo "Live dashboard on port ${DASHBOARD_PORT} while the test runs."
# The grafana/k6 container runs as a non-root uid, so the report directory
# has to be world-writable or the HTML export fails with permission denied.
mkdir -p /opt/k6/report && chmod 777 /opt/k6/report
exec docker run --rm -i \
  ${K6_PLATFORM:+--platform "${K6_PLATFORM}"} \
  -p "${DASHBOARD_PORT}:${DASHBOARD_PORT}" \
  -e TARGET_URL="${TARGET_URL}" \
  -e VUS="${VUS:-10}" \
  -e DURATION="${DURATION:-30s}" \
  ${RPS:+-e RPS="${RPS}"} \
  -e METHOD="${METHOD:-GET}" \
  ${BODY:+-e BODY="${BODY}"} \
  ${STAGES:+-e STAGES="${STAGES}"} \
  ${START_VUS:+-e START_VUS="${START_VUS}"} \
  -e K6_WEB_DASHBOARD=true \
  -e K6_WEB_DASHBOARD_HOST=0.0.0.0 \
  -e K6_WEB_DASHBOARD_PORT="${DASHBOARD_PORT}" \
  -e K6_WEB_DASHBOARD_EXPORT=/report/index.html \
  -v /opt/k6/report:/report \
  grafana/k6 run - < /opt/k6/scripts/load-test.js
RUNEOF
chmod +x /opt/k6/run.sh

# ---------------------------------------------------------------------------
# Optional web control panel (K6_PANEL=on).
# ---------------------------------------------------------------------------
# A browser form on port 80 to set the target, VUs, duration, rate and method,
# and to start and stop runs; it embeds the live dashboard on 5665 while a run
# is going. It is OFF unless the node sets K6_PANEL=on, so an instance that never
# asked for a browser-facing UI boots exactly as before.
#
# Its two files are too large to inline here (user_data is capped at 16 KB), so
# they are fetched from this template's folder in the public repo. K6_PANEL_REF
# pins a branch, tag or commit (default main). The panel reads K6_PANEL_TOKEN,
# K6_PANEL_MAX_VUS and K6_PANEL_MAX_DURATION from the node environment; see the
# template README before opening port 80.
#
# Only the two switches are read here, in a subshell with tracing off, so the
# rest of the node environment (a token, say) never lands in this log.
panel_var() { ( set +x; [ -f /etc/struct8_env ] && . /etc/struct8_env; eval "printf '%s' \"\${$1:-}\"" ); }
K6_PANEL="$(panel_var K6_PANEL)"
K6_PANEL_REF="$(panel_var K6_PANEL_REF)"
case "$(echo "${K6_PANEL:-off}" | tr '[:upper:]' '[:lower:]')" in
  on|true|1|yes)
    PANEL_SRC="https://raw.githubusercontent.com/Struct8/struct8-templates/${K6_PANEL_REF:-main}/templates/vpc-k6-load-generator/v2/control-panel"
    echo "Installing the k6 control panel from ${PANEL_SRC}..."
    dnf install -y nodejs
    mkdir -p /opt/k6/panel /opt/k6/report && chmod 777 /opt/k6/report
    PANEL_OK=1
    for f in server.mjs index.html; do
      curl -fsSL --retry 5 --retry-delay 3 -o "/opt/k6/panel/$f" "$PANEL_SRC/$f" || PANEL_OK=0
    done
    if [ "$PANEL_OK" = 1 ]; then
      cat > /etc/systemd/system/struct8-k6-panel.service <<'PANELEOF'
[Unit]
Description=Struct8 k6 control panel (web UI on port 80)
After=docker.service network-online.target
Wants=docker.service network-online.target
[Service]
EnvironmentFile=-/etc/struct8_env
ExecStart=/usr/bin/node /opt/k6/panel/server.mjs
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
PANELEOF
      systemctl daemon-reload
      systemctl enable --now struct8-k6-panel.service
      echo "Control panel enabled on port 80 (journalctl -u struct8-k6-panel for its log)."
    else
      echo "Could not download the control panel from ${PANEL_SRC}; continuing without it." >&2
    fi
    ;;
  *)
    echo "Control panel off (set K6_PANEL=on on the node to enable it)."
    ;;
esac

echo "Done. k6 image is ready; test script is at /opt/k6/scripts/load-test.js."
echo "Fire a run through Debug Access: TARGET_URL=... /opt/k6/run.sh -- nothing runs on its own."
