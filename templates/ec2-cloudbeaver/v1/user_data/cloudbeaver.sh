#!/bin/bash
# CloudBeaver (DBeaver web) on Amazon Linux 2023 via Docker.
# Boots Docker, runs dbeaver/cloudbeaver on port 8978, and restarts it on reboot.
#
# This is the reference bootstrap for any Struct8 template that puts CloudBeaver on
# an EC2 instance to browse a database (RDS, Aurora, etc.). Copy this file into the
# template's own v1/user_data/ folder -- assets are never shared across templates.
#
# It hardcodes nothing about the account. CloudBeaver starts empty and the user
# creates the database connection in the web UI, pointing at the endpoint the
# template provisions. If the template wires the instance to the database, the
# connection details are also written to /etc/struct8_env for convenience.
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

CLOUDBEAVER_PORT="${CLOUDBEAVER_PORT:-8978}"
CLOUDBEAVER_IMAGE="${CLOUDBEAVER_IMAGE:-dbeaver/cloudbeaver:latest}"
WORKSPACE_DIR="/opt/cloudbeaver/workspace"

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

echo "Preparing the CloudBeaver workspace..."
mkdir -p "$WORKSPACE_DIR"

echo "Running CloudBeaver on port ${CLOUDBEAVER_PORT}..."
docker run -d \
  --name cloudbeaver \
  --restart unless-stopped \
  -p "${CLOUDBEAVER_PORT}:8978" \
  -v "${WORKSPACE_DIR}:/opt/cloudbeaver/workspace" \
  "$CLOUDBEAVER_IMAGE"

echo "Done. CloudBeaver is starting on port ${CLOUDBEAVER_PORT}."
echo "Open http://<instance-public-ip>:${CLOUDBEAVER_PORT} and finish the first-run setup,"
echo "then add a connection to the database endpoint the template provisioned."
