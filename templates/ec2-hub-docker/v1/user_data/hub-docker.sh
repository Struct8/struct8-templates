#!/bin/bash
# Struct8 Hub on Docker - generic EC2 bootstrap for Amazon Linux 2023.
#
# Reusable across templates: any EC2 or Auto Scaling group that should run the
# Struct8 Hub container points its user_data at a COPY of this script (the
# struct8-templates repo forbids sharing a folder between templates, so each
# template keeps its own copy).
#
# What it does, on boot:
#   1. installs Docker,
#   2. gets the Hub source (git clone of Struct8/struct8-hub) and builds the
#      container image from image/ -- the image is not published to any
#      registry, and building from source keeps this independent of one,
#   3. runs the container, restarting it on reboot.
#
# The image is "one file, no dependencies" (image/index.mjs + Dockerfile), so
# the build is small and fast.
#
# Everything tunable is a NODE ENVIRONMENT VARIABLE, so the same script serves
# every template without an edit. The generator writes them to
# /etc/profile.d/struct8_vars.sh as `export KEY = "value"` (spaces + quotes),
# which is NOT valid shell to source, so we parse the value out instead.
#
#   HUB_PORT       port the container listens on and is published on. Default 8080.
#   HUB_LOADTEST   'on' enables the load-test endpoint (POST /loadtest?ms=N).
#                  Default unset (off). Only set it where load testing is the point.
#   HUB_REF        git ref (branch/tag/commit) of struct8-hub to build. Default 'main'.
#   HUB_POLL       optional: name a wired queue to consume (see the Hub docs).
#
# The Hub itself discovers its neighbours from the environment variables the
# generator injects from the diagram's wires; nothing about the topology is set
# here.
set -uo pipefail
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

VARS=/etc/profile.d/struct8_vars.sh
getvar() { [ -f "$VARS" ] && awk -F= -v k="$1" '$0 ~ ("^[[:space:]]*export[[:space:]]+" k "[[:space:]]*=") {gsub(/[ "]/,"",$2); print $2; exit}' "$VARS"; }

HUB_PORT="$(getvar HUB_PORT)";       HUB_PORT="${HUB_PORT:-8080}"
HUB_LOADTEST="$(getvar HUB_LOADTEST)"
HUB_REF="$(getvar HUB_REF)";         HUB_REF="${HUB_REF:-main}"
HUB_POLL="$(getvar HUB_POLL)"
echo "HUB_PORT=$HUB_PORT HUB_LOADTEST=${HUB_LOADTEST:-<off>} HUB_REF=$HUB_REF HUB_POLL=${HUB_POLL:-<none>}"

echo "Updating the system..."
dnf update -y

echo "Installing Docker and git..."
dnf install -y docker git
systemctl enable docker
systemctl start docker

echo "Fetching the Hub source ($HUB_REF)..."
rm -rf /opt/struct8-hub
git clone --depth 1 --branch "$HUB_REF" https://github.com/Struct8/struct8-hub /opt/struct8-hub \
  || git clone --depth 1 https://github.com/Struct8/struct8-hub /opt/struct8-hub

echo "Building the Hub image..."
docker build -t struct8-hub:local /opt/struct8-hub/image

# The Hub reads the wires from its OWN environment. The generator wrote them to
# /etc/struct8_env; pass that whole file into the container so discovery works,
# then add the runtime knobs on top.
ENV_ARGS=()
[ -f /etc/struct8_env ] && ENV_ARGS+=(--env-file /etc/struct8_env)
ENV_ARGS+=(-e "PORT=${HUB_PORT}")
[ -n "${HUB_LOADTEST:-}" ] && ENV_ARGS+=(-e "HUB_LOADTEST=${HUB_LOADTEST}")
[ -n "${HUB_POLL:-}" ]     && ENV_ARGS+=(-e "HUB_POLL=${HUB_POLL}")

echo "Running the Hub container on port ${HUB_PORT}..."
docker rm -f struct8-hub 2>/dev/null || true
docker run -d \
  --name struct8-hub \
  --restart unless-stopped \
  -p "${HUB_PORT}:${HUB_PORT}" \
  "${ENV_ARGS[@]}" \
  struct8-hub:local

echo "Done. Hub is starting on port ${HUB_PORT}. GET / is health; POST / fans out."
[ -n "${HUB_LOADTEST:-}" ] && echo "Load-test endpoint enabled: POST /loadtest?ms=N"
