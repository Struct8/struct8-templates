#!/bin/bash
# OTLP load generator for the LGTM stack - Amazon Linux 2023, reusable across templates.
# Purpose: drive a VARIABLE OTLP workload at an Alloy/OTel gateway so the ECS services
#          (alloy / loki / tempo) cross their CPU target-tracking threshold and scale OUT,
#          then idle so they scale back IN. Lets you watch two-level autoscaling end to end
#          (tasks via Application Auto Scaling, instances via the ECS Capacity Provider+ASG).
#
# What it sends: traces, metrics AND logs over OTLP. A single stream exercises all three
#   backends at once - the gateway batches/forwards, Tempo takes the traces, Loki the logs,
#   AMP the metrics - so CPU rises across the whole stack, not just one service.
#
# Tool: telemetrygen, the official OpenTelemetry Collector-Contrib load generator.
#
# Node variables (read from /etc/profile.d/struct8_vars.sh, the file the Struct8 generator
#   writes with `export KEY = "value"` - note the spaces/quotes, so we PARSE it, never source):
#   OTLP_ENDPOINT   host:port of the gateway's OTLP gRPC receiver   (default: alloy:4317)
#                   Use the Service Connect/Cloud Map name when this box is INSIDE the VPC
#                   (e.g. alloy:4317), or the public ALB host (e.g. otel.cloudman.pro:443).
#   OTLP_PROTOCOL   "grpc" or "http"                                (default: grpc)
#   OTLP_INSECURE   "true" plaintext, "false" TLS                   (default: true)
#   LOAD_WORKERS    base concurrency unit, scaled per phase         (default: 2)
#   PHASE_SECONDS   seconds to hold each ramp phase                 (default: 300)
#   LOAD_LOOP       "true" repeat the ramp forever, "false" once    (default: true)
#
# Safe to re-run: it rebuilds the tool only if missing. Logs to /var/log/user-data.log.
set -uo pipefail
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1

# --- read node variables (generator writes `export KEY = "value"`, not sourceable) ---
VARS=/etc/profile.d/struct8_vars.sh
getvar() { [ -f "$VARS" ] && awk -F= -v k="$1" '$0 ~ "(^| )"k"( |=)" {gsub(/[ "]/,"",$2); print $2; exit}' "$VARS"; }
OTLP_ENDPOINT=$(getvar OTLP_ENDPOINT); OTLP_ENDPOINT=${OTLP_ENDPOINT:-alloy:4317}
OTLP_PROTOCOL=$(getvar OTLP_PROTOCOL); OTLP_PROTOCOL=${OTLP_PROTOCOL:-grpc}   # grpc | http
OTLP_INSECURE=$(getvar OTLP_INSECURE); OTLP_INSECURE=${OTLP_INSECURE:-true}
LOAD_WORKERS=$(getvar LOAD_WORKERS);   LOAD_WORKERS=${LOAD_WORKERS:-2}
PHASE_SECONDS=$(getvar PHASE_SECONDS); PHASE_SECONDS=${PHASE_SECONDS:-300}
LOAD_LOOP=$(getvar LOAD_LOOP);         LOAD_LOOP=${LOAD_LOOP:-true}
echo "endpoint=$OTLP_ENDPOINT proto=$OTLP_PROTOCOL insecure=$OTLP_INSECURE workers=$LOAD_WORKERS phase=${PHASE_SECONDS}s loop=$LOAD_LOOP"
# When going through the ALB (otel.cloudman.pro:443) the listener speaks OTLP/HTTP, not gRPC,
# so set OTLP_PROTOCOL=http there. Direct to the Alloy task (alloy:4317) uses grpc.

# --- install Go + telemetrygen (binary not published standalone; built via go install) ---
export HOME=/root
export GOPATH=/root/go
export PATH=$PATH:/usr/local/go/bin:/root/go/bin
if ! command -v telemetrygen >/dev/null 2>&1; then
  echo "Installing Go toolchain..."
  dnf install -y golang git || dnf install -y go git
  echo "Building telemetrygen..."
  go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest
fi
TG=$(command -v telemetrygen || echo /root/go/bin/telemetrygen)
echo "telemetrygen at: $TG"

# --- common flags: plaintext vs TLS, and gRPC vs HTTP transport ---
if [ "$OTLP_INSECURE" = "true" ]; then TLS_FLAG="--otlp-insecure"; else TLS_FLAG=""; fi
if [ "$OTLP_PROTOCOL" = "http" ]; then PROTO_FLAG="--otlp-http"; else PROTO_FLAG=""; fi
COMMON="$TLS_FLAG $PROTO_FLAG"

# fire one phase: traces + metrics + logs in parallel for PHASE_SECONDS, at the given scale.
# scale multiplies workers and rate so each phase is heavier than the last (the ramp).
run_phase() {
  local label="$1" mult="$2"
  local workers=$(( LOAD_WORKERS * mult ))
  local rate=$(( 50 * mult ))        # spans|metrics|logs per second, per the tool's rate flag
  echo "=== phase $label : workers=$workers rate=$rate for ${PHASE_SECONDS}s @ $(date -u +%T) ==="
  "$TG" traces  --otlp-endpoint "$OTLP_ENDPOINT" $COMMON \
        --workers "$workers" --rate "$rate" --duration "${PHASE_SECONDS}s" \
        --service load-generator --otlp-attributes 'phase="'"$label"'"' &
  "$TG" metrics --otlp-endpoint "$OTLP_ENDPOINT" $COMMON \
        --workers "$workers" --duration "${PHASE_SECONDS}s" \
        --otlp-attributes 'phase="'"$label"'"' &
  "$TG" logs    --otlp-endpoint "$OTLP_ENDPOINT" $COMMON \
        --workers "$workers" --rate "$rate" --duration "${PHASE_SECONDS}s" \
        --otlp-attributes 'phase="'"$label"'"' &
  wait
}

# The ramp: climb to a sustained peak (forces scale-OUT), then an idle gap (forces scale-IN).
# Target tracking needs a few minutes above target + cooldown to act, so phases are long.
run_ramp() {
  run_phase "warmup" 1     # light
  run_phase "ramp"   3     # medium
  run_phase "peak"   8     # heavy - should push CPU past 60% on alloy/loki/tempo
  echo "=== idle gap: no load for ${PHASE_SECONDS}s so the services scale back in @ $(date -u +%T) ==="
  sleep "$PHASE_SECONDS"
}

if [ "$LOAD_LOOP" = "true" ]; then
  while true; do run_ramp; done
else
  run_ramp
fi
echo "Done."
