#!/bin/bash
# OTLP load generator on Amazon Linux 2023 (telemetrygen).
#
# Inspired by the k6 generator in this repo, but it drives OTLP TELEMETRY, not HTTP: k6 fires
# HTTP requests and cannot emit valid OTLP, so it exercises an HTTP endpoint, never an OTel
# gateway. This box runs telemetrygen (the official OpenTelemetry Collector-Contrib generator),
# which emits real traces / metrics / logs over OTLP -- so pointed at an Alloy/OTel gateway it
# makes the whole LGTM pipeline work (gateway batches/forwards, Tempo takes traces, Loki logs,
# AMP metrics) and the ECS services cross their CPU target and autoscale.
#
# Architecture-neutral: runs on x86_64 and arm64 (Graviton/t4g). The Docker platform is detected
# at boot and the multi-arch telemetrygen image is pulled for exactly that platform.
#
# It does NOT run load on boot: a run is fired on demand, from the web control panel (OTEL_PANEL=on)
# or through Debug Access / SSM with /opt/otelgen/run.sh. Config comes from the environment per run:
#   OTLP_ENDPOINT=otel.example.com:443 OTLP_PROTOCOL=http OTLP_INSECURE=false \
#     SIGNAL=traces WORKERS=4 RATE=200 DURATION=5m /opt/otelgen/run.sh
LOGFILE="/var/log/user-data.log"
exec >$LOGFILE 2>&1
set -x

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

# Architecture-aware image pull (multi-arch image; fail loudly if a platform has no manifest).
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  TG_PLATFORM="linux/amd64" ;;
  aarch64|arm64) TG_PLATFORM="linux/arm64" ;;
  *)             echo "Unsupported CPU architecture: $ARCH" >&2; exit 1 ;;
esac
echo "Detected architecture: $ARCH -> Docker platform $TG_PLATFORM"
mkdir -p /opt/otelgen
echo "$TG_PLATFORM" > /opt/otelgen/platform

TG_IMAGE="ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest"
echo "Pulling telemetrygen image for $TG_PLATFORM..."
if ! docker pull --platform "$TG_PLATFORM" "$TG_IMAGE"; then
  echo "Failed to pull $TG_IMAGE for $TG_PLATFORM." >&2
  exit 1
fi

echo "Writing the run wrapper..."
cat > /opt/otelgen/run.sh <<'RUNEOF'
#!/bin/bash
# Convenience wrapper for one telemetrygen run (one signal). Fired by the panel or by hand.
#
# Env knobs (all optional except OTLP_ENDPOINT):
#   OTLP_ENDPOINT   host:port of the OTLP receiver (e.g. otel.example.com:443 or alloy:4317)
#   OTLP_PROTOCOL   grpc | http                         (default grpc)
#   OTLP_INSECURE   true=plaintext, false=TLS           (default true)
#   SIGNAL          traces | metrics | logs             (default traces)
#   WORKERS         concurrency                          (default 2)
#   RATE            per-second rate (traces/logs)        (default 100; ignored for metrics)
#   DURATION        e.g. 30s, 5m, 1h                     (default 60s)
set -euo pipefail
[ -f /etc/struct8_env ] && source /etc/struct8_env

: "${OTLP_ENDPOINT:?OTLP_ENDPOINT is required, e.g. otel.example.com:443}"
OTLP_PROTOCOL="${OTLP_PROTOCOL:-grpc}"
OTLP_INSECURE="${OTLP_INSECURE:-true}"
SIGNAL="${SIGNAL:-traces}"
WORKERS="${WORKERS:-2}"
RATE="${RATE:-100}"
DURATION="${DURATION:-60s}"

if [ -f /opt/otelgen/platform ]; then PLATFORM="$(cat /opt/otelgen/platform)"; else PLATFORM=""; fi
TG_IMAGE="ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest"

ARGS=( "$SIGNAL" --otlp-endpoint "$OTLP_ENDPOINT" --duration "$DURATION" --workers "$WORKERS" )
[ "$OTLP_INSECURE" = "true" ] && ARGS+=( --otlp-insecure )
[ "$OTLP_PROTOCOL" = "http" ] && ARGS+=( --otlp-http )
# metrics has no --rate flag; traces and logs do.
[ "$SIGNAL" != "metrics" ] && ARGS+=( --rate "$RATE" )

echo "telemetrygen $SIGNAL -> $OTLP_ENDPOINT ($OTLP_PROTOCOL, insecure=$OTLP_INSECURE, workers=$WORKERS, rate=$RATE, dur=$DURATION) on ${PLATFORM:-native}"
exec docker run --rm -i ${PLATFORM:+--platform "$PLATFORM"} "$TG_IMAGE" "${ARGS[@]}"
RUNEOF
chmod +x /opt/otelgen/run.sh

# ---------------------------------------------------------------------------
# Optional web control panel (OTEL_PANEL=on).
# ---------------------------------------------------------------------------
# A browser form on port 80 to set the endpoint, signals, workers, rate and duration, and to
# start/stop runs. OFF unless the node sets OTEL_PANEL=on. The two files are fetched from this
# template's folder in the public repo (user_data is capped at 16 KB). OTEL_PANEL_REF pins a
# branch/tag/commit (default main). The panel reads OTEL_PANEL_TOKEN, OTEL_PANEL_MAX_WORKERS and
# OTEL_PANEL_MAX_DURATION from the node environment; see the template README before opening port 80.
panel_var() { ( set +x; [ -f /etc/struct8_env ] && . /etc/struct8_env; eval "printf '%s' \"\${$1:-}\"" ); }
OTEL_PANEL="$(panel_var OTEL_PANEL)"
OTEL_PANEL_REF="$(panel_var OTEL_PANEL_REF)"
case "$(echo "${OTEL_PANEL:-off}" | tr '[:upper:]' '[:lower:]')" in
  on|true|1|yes)
    PANEL_SRC="https://raw.githubusercontent.com/Struct8/struct8-templates/${OTEL_PANEL_REF:-main}/templates/vpc-otel-load-generator/v1/control-panel"
    echo "Installing the OTLP control panel from ${PANEL_SRC}..."
    if ! swapon --show | grep -q /swapfile; then
      echo "Adding a temporary 1G swapfile so dnf is not OOM-killed on a small instance..."
      fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
      chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    fi
    dnf install -y nodejs
    swapoff /swapfile 2>/dev/null && rm -f /swapfile
    mkdir -p /opt/otelgen/panel
    PANEL_OK=1
    for f in server.mjs index.html; do
      curl -fsSL --retry 5 --retry-delay 3 -o "/opt/otelgen/panel/$f" "$PANEL_SRC/$f" || PANEL_OK=0
    done
    if [ "$PANEL_OK" = 1 ]; then
      cat > /etc/systemd/system/struct8-otel-panel.service <<'PANELEOF'
[Unit]
Description=Struct8 OTLP load-generator control panel (web UI on port 80)
After=docker.service network-online.target
Wants=docker.service network-online.target
[Service]
EnvironmentFile=-/etc/struct8_env
ExecStart=/usr/bin/node /opt/otelgen/panel/server.mjs
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
PANELEOF
      systemctl daemon-reload
      systemctl enable --now struct8-otel-panel.service
      echo "Control panel enabled on port 80 (journalctl -u struct8-otel-panel for its log)."
    else
      echo "Could not download the control panel from ${PANEL_SRC}; continuing without it." >&2
    fi
    ;;
  *)
    echo "Control panel off (set OTEL_PANEL=on on the node to enable it)."
    ;;
esac

echo "Done. telemetrygen image ready; wrapper at /opt/otelgen/run.sh. Nothing runs on its own."
