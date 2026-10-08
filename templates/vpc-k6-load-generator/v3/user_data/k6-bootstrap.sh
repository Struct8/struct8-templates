#!/bin/bash
# k6 load generator on Amazon Linux 2023 -- v3.
#
# v3 is v2 plus two things, both off unless the node asks for them:
#   * K6_SCENARIO=wordpress runs scenarios/wordpress.js (visitors browsing a
#     WordPress site) instead of the single-URL test. Unset, a run is exactly
#     the v2 run: same test script, same variables, same defaults.
#   * AUTOSTART=on fires one run STARTUP_DELAY seconds after boot, with no agent.
#
# Architecture-neutral: the Docker platform is detected at boot and grafana/k6
# (multi-arch) is pulled for it, so x86_64 and arm64 (Graviton) both work; only
# the EC2's AMI has to match the instance family.
#
# Nothing runs on boot unless AUTOSTART=on. A run is fired on demand through
# Struct8 Debug Access, or from the optional web panel (K6_PANEL=on):
#   TARGET_URL=https://your-service.example.com/ /opt/k6/run.sh
#   RPS=200 VUS=100 DURATION=5m TARGET_URL=https://... /opt/k6/run.sh
#   K6_SCENARIO=wordpress PROFILE=steps PEAK=20 TARGET_URL=https://wp.example.com/ /opt/k6/run.sh
LOGFILE="/var/log/user-data.log"
exec >$LOGFILE 2>&1
set -x

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  K6_PLATFORM="linux/amd64" ;;
  aarch64|arm64) K6_PLATFORM="linux/arm64" ;;
  *)             echo "Unsupported CPU architecture: $ARCH" >&2; exit 1 ;;
esac
echo "Detected architecture: $ARCH -> Docker platform $K6_PLATFORM"
mkdir -p /opt/k6
echo "$K6_PLATFORM" > /opt/k6/platform

echo "Pulling the k6 image for $K6_PLATFORM..."
if ! docker pull --platform "$K6_PLATFORM" grafana/k6:latest; then
  echo "Failed to pull grafana/k6:latest for $K6_PLATFORM. No image for this architecture?" >&2
  exit 1
fi

# Reads one variable from the node environment (/etc/struct8_env) in a subshell
# with tracing off, so the rest of it (a token, say) never lands in this log.
node_var() { ( set +x; [ -f /etc/struct8_env ] && . /etc/struct8_env; eval "printf '%s' \"\${$1:-}\"" ); }

# Files too large for user_data (EC2 caps it at 16 KB) come from this
# template's folder in the public repo. K6_REF pins a branch, tag or commit;
# K6_PANEL_REF is the v2 name of the same switch and is still read.
K6_REF="$(node_var K6_REF)"
[ -z "$K6_REF" ] && K6_REF="$(node_var K6_PANEL_REF)"
ASSETS="https://raw.githubusercontent.com/Struct8/struct8-templates/${K6_REF:-main}/templates/vpc-k6-load-generator/v3"

echo "Writing the k6 test scripts..."
mkdir -p /opt/k6/scripts
# The single-URL test: the same script as v2, byte for byte.
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

# The other scenarios. A failed download leaves only that scenario unavailable:
# run.sh says so when it is asked for, and the single-URL test is unaffected.
for s in wordpress; do
  curl -fsSL --retry 5 --retry-delay 3 -o "/opt/k6/scripts/$s.js" "$ASSETS/scenarios/$s.js" \
    || echo "Could not download scenario $s from $ASSETS; it will be unavailable." >&2
done

echo "Writing the run wrapper..."
cat > /opt/k6/run.sh <<'RUNEOF'
#!/bin/bash
# One k6 run. K6_SCENARIO picks the test:
#   url (default)  TARGET_URL with VUS, DURATION, RPS, METHOD, BODY, STAGES, START_VUS
#   wordpress      TARGET_URL with PROFILE, PEAK, STEPS, STEP_TIME, SOAK_TIME,
#                  THINK_MIN, THINK_MAX, MAX_VUS, FETCH_ASSETS, SEARCH_WORDS
set -euo pipefail

# A knob set for this call wins over the node environment. (In v2 the node
# environment won, so `TARGET_URL=... run.sh` was ignored on a node that
# declares TARGET_URL.)
KNOBS="TARGET_URL K6_SCENARIO VUS DURATION RPS METHOD BODY STAGES START_VUS PROFILE PEAK STEPS STEP_TIME SOAK_TIME THINK_MIN THINK_MAX MAX_VUS FETCH_ASSETS SEARCH_WORDS INSECURE_TLS DASHBOARD_PORT"
declare -A CALLER=()
for v in $KNOBS; do [ -n "${!v+x}" ] && CALLER[$v]="${!v}"; done
[ -f /etc/struct8_env ] && source /etc/struct8_env
for v in "${!CALLER[@]}"; do printf -v "$v" '%s' "${CALLER[$v]}"; done

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

SCENARIO="${K6_SCENARIO:-url}"
ARGS=(-e TARGET_URL="${TARGET_URL}")
case "$SCENARIO" in
  url)
    SCRIPT=/opt/k6/scripts/load-test.js
    echo "k6 -> ${TARGET_URL}  (VUS=${VUS:-10} DURATION=${DURATION:-30s} RPS=${RPS:-unset}) on ${K6_PLATFORM:-native}"
    ARGS+=(-e VUS="${VUS:-10}" -e DURATION="${DURATION:-30s}")
    [ -n "${RPS:-}" ] && ARGS+=(-e RPS="${RPS}")
    ARGS+=(-e METHOD="${METHOD:-GET}")
    for v in BODY STAGES START_VUS; do [ -n "${!v:-}" ] && ARGS+=(-e "$v=${!v}"); done
    ;;
  wordpress)
    SCRIPT=/opt/k6/scripts/wordpress.js
    echo "k6 wordpress -> ${TARGET_URL}  (PROFILE=${PROFILE:-steps} PEAK=${PEAK:-10} visits/s) on ${K6_PLATFORM:-native}"
    for v in PROFILE PEAK STEPS STEP_TIME SOAK_TIME THINK_MIN THINK_MAX MAX_VUS FETCH_ASSETS SEARCH_WORDS INSECURE_TLS; do
      [ -n "${!v:-}" ] && ARGS+=(-e "$v=${!v}")
    done
    ;;
  *)
    echo "Unknown K6_SCENARIO=${SCENARIO}. Use url or wordpress." >&2
    exit 1
    ;;
esac
if [ ! -f "$SCRIPT" ]; then
  echo "$SCRIPT is missing: the bootstrap could not download it (see /var/log/user-data.log)." >&2
  exit 1
fi

# The live dashboard is served on DASHBOARD_PORT while the test runs. It binds
# 0.0.0.0 because it runs inside the container, and a final HTML report is
# written so it survives the run.
DASHBOARD_PORT="${DASHBOARD_PORT:-5665}"
echo "Live dashboard on port ${DASHBOARD_PORT} while the test runs."
# The grafana/k6 container runs as a non-root uid, so the report directory
# has to be world-writable or the HTML export fails with permission denied.
mkdir -p /opt/k6/report && chmod 777 /opt/k6/report
exec docker run --rm -i \
  ${K6_PLATFORM:+--platform "${K6_PLATFORM}"} \
  -p "${DASHBOARD_PORT}:${DASHBOARD_PORT}" \
  "${ARGS[@]}" \
  -e K6_WEB_DASHBOARD=true \
  -e K6_WEB_DASHBOARD_HOST=0.0.0.0 \
  -e K6_WEB_DASHBOARD_PORT="${DASHBOARD_PORT}" \
  -e K6_WEB_DASHBOARD_EXPORT=/report/index.html \
  -v /opt/k6/report:/report \
  grafana/k6 run - < "$SCRIPT"
RUNEOF
chmod +x /opt/k6/run.sh

# ---------------------------------------------------------------------------
# Optional web control panel (K6_PANEL=on).
# ---------------------------------------------------------------------------
# A browser form on port 80 to pick the scenario, set the load and start and
# stop runs; it embeds the live dashboard on 5665 while a run is going. Its
# files are fetched from $ASSETS. It reads K6_PANEL_TOKEN, K6_PANEL_MAX_VUS,
# K6_PANEL_MAX_DURATION and TARGET_URL from the node environment; see the
# template README before opening port 80.
K6_PANEL="$(node_var K6_PANEL)"
case "$(echo "${K6_PANEL:-off}" | tr '[:upper:]' '[:lower:]')" in
  on|true|1|yes)
    echo "Installing the k6 control panel from ${ASSETS}/control-panel..."
    # `dnf install nodejs` can be OOM-killed on a 512 MB nano with Docker
    # running; a temporary swapfile gives it room, and is removed afterwards.
    if ! swapon --show | grep -q /swapfile; then
      fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
      chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    fi
    dnf install -y nodejs
    swapoff /swapfile 2>/dev/null && rm -f /swapfile
    mkdir -p /opt/k6/panel /opt/k6/report && chmod 777 /opt/k6/report
    PANEL_OK=1
    for f in server.mjs index.html; do
      curl -fsSL --retry 5 --retry-delay 3 -o "/opt/k6/panel/$f" "$ASSETS/control-panel/$f" || PANEL_OK=0
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
      echo "Could not download the control panel from ${ASSETS}; continuing without it." >&2
    fi
    ;;
  *)
    echo "Control panel off (set K6_PANEL=on on the node to enable it)."
    ;;
esac

# ---------------------------------------------------------------------------
# Optional auto-start (AUTOSTART=on): one run, STARTUP_DELAY seconds after boot.
# ---------------------------------------------------------------------------
# For a lab with no agent: the delay lets the target come up first. The run is
# /opt/k6/run.sh with the node environment, so the scenario and the load are
# whatever the node declares. It fires once per boot, not on a schedule.
AUTOSTART="$(node_var AUTOSTART)"
STARTUP_DELAY="$(node_var STARTUP_DELAY)"
case "$(echo "${AUTOSTART:-off}" | tr '[:upper:]' '[:lower:]')" in
  on|true|1|yes)
    cat > /etc/systemd/system/struct8-k6-loadtest.service <<'SVCEOF'
[Unit]
Description=Struct8 k6 run on boot (one-shot)
After=docker.service network-online.target
Wants=docker.service network-online.target
[Service]
Type=oneshot
ExecStart=/opt/k6/run.sh
SVCEOF
    cat > /etc/systemd/system/struct8-k6-loadtest.timer <<TIMEREOF
[Unit]
Description=Fire the Struct8 k6 run once, after a delay
[Timer]
OnBootSec=${STARTUP_DELAY:-360}
AccuracySec=1s
[Install]
WantedBy=timers.target
TIMEREOF
    systemctl daemon-reload
    systemctl enable --now struct8-k6-loadtest.timer
    echo "Auto-start armed: one run ${STARTUP_DELAY:-360}s after boot."
    ;;
  *)
    echo "Auto-start off (set AUTOSTART=on on the node to enable it)."
    ;;
esac

echo "Done. Test scripts are in /opt/k6/scripts; fire a run with /opt/k6/run.sh."
