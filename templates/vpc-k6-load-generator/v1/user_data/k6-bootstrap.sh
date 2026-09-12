#!/bin/bash
# k6 load generator on Amazon Linux 2023.
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

echo "Pulling the k6 image..."
docker pull grafana/k6:latest

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
  const res = http.get(TARGET_URL);
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

if [ -z "${TARGET_URL:-}" ]; then
  echo "TARGET_URL is required. Example: TARGET_URL=https://your-service/ /opt/k6/run.sh" >&2
  exit 1
fi

echo "k6 -> ${TARGET_URL}  (VUS=${VUS:-10} DURATION=${DURATION:-30s} RPS=${RPS:-unset})"
exec docker run --rm -i \
  -e TARGET_URL="${TARGET_URL}" \
  -e VUS="${VUS:-10}" \
  -e DURATION="${DURATION:-30s}" \
  ${RPS:+-e RPS="${RPS}"} \
  grafana/k6 run - < /opt/k6/scripts/load-test.js
RUNEOF
chmod +x /opt/k6/run.sh

echo "Done. k6 image is ready; test script is at /opt/k6/scripts/load-test.js."
echo "Fire a run through Debug Access: TARGET_URL=... /opt/k6/run.sh -- nothing runs on its own."
