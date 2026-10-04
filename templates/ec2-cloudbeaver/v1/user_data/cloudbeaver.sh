#!/bin/bash
# CloudBeaver (DBeaver web) on Amazon Linux 2023 via Docker.
# Boots Docker, runs dbeaver/cloudbeaver on port 8978, and restarts it on reboot.
#
# This is the reference bootstrap for any Struct8 template that puts CloudBeaver on
# an EC2 instance to browse a database (RDS, Aurora, etc.). Copy this file into the
# template's own v1/user_data/ folder -- assets are never shared across templates.
#
# It hardcodes nothing about the account. If the template wires the instance to the
# database AND enables "add environment variables", Struct8 writes the connection
# details to /etc/struct8_env and this script PRE-CONFIGURES the connection in
# CloudBeaver (host, port, database, and credentials fetched from Secrets Manager),
# so the user opens the UI with the connection already there. When those variables
# are absent it falls back to an empty CloudBeaver and the user adds the connection
# by hand.
#
# Variables read from /etc/struct8_env (written by Struct8 when env vars are enabled):
#   AWS_DB_INSTANCE_ENDPOINT_0   host:port of the database
#   AWS_DB_INSTANCE_DB_NAME_0    database name
#   AWS_DB_INSTANCE_SECRET_ARN_0 ARN of the RDS-managed master_user_secret (user/pass)
#   REGION                       region, used for the AWS CLI calls
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

CLOUDBEAVER_PORT="${CLOUDBEAVER_PORT:-8978}"
CLOUDBEAVER_IMAGE="${CLOUDBEAVER_IMAGE:-dbeaver/cloudbeaver:latest}"
WORKSPACE_DIR="/opt/cloudbeaver/workspace"
DBEAVER_CONF_DIR="${WORKSPACE_DIR}/GlobalConfiguration/.dbeaver"

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

echo "Preparing the CloudBeaver workspace..."
mkdir -p "$WORKSPACE_DIR"

# --- Pre-configure the database connection, if Struct8 provided the details ------
# /etc/struct8_env is written by Struct8 when the instance is wired to the database
# and "add environment variables" is enabled. Without it, CloudBeaver starts empty.
if [ -f /etc/struct8_env ]; then
  # shellcheck disable=SC1091
  . /etc/struct8_env
fi

DB_ENDPOINT="${AWS_DB_INSTANCE_ENDPOINT_0:-}"
DB_NAME="${AWS_DB_INSTANCE_DB_NAME_0:-}"
DB_SECRET_ARN="${AWS_DB_INSTANCE_SECRET_ARN_0:-}"
AWS_REGION="${REGION:-$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/placement/region)}"

if [ -n "$DB_ENDPOINT" ] && [ -n "$DB_SECRET_ARN" ]; then
  echo "Struct8 provided database details -- pre-configuring the CloudBeaver connection..."

  # The endpoint comes as host:port. Split it; default to 5432 if no port is present.
  DB_HOST="${DB_ENDPOINT%%:*}"
  DB_PORT="${DB_ENDPOINT##*:}"
  if [ "$DB_PORT" = "$DB_HOST" ]; then DB_PORT="5432"; fi

  # The AWS CLI ships with AL2023; the instance role is allowed to read this secret.
  echo "Fetching database credentials from Secrets Manager..."
  SECRET_JSON="$(aws secretsmanager get-secret-value \
    --secret-id "$DB_SECRET_ARN" \
    --region "$AWS_REGION" \
    --query SecretString --output text 2>/dev/null)"

  # The RDS-managed secret is a JSON blob {"username":"...","password":"..."}.
  DB_USER="$(echo "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("username",""))' 2>/dev/null)"
  DB_PASS="$(echo "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("password",""))' 2>/dev/null)"

  mkdir -p "$DBEAVER_CONF_DIR"

  # Pre-configured datasource. CloudBeaver reads this at startup; credentials in
  # auth-properties are kept until the first open, then encrypted and removed.
  cat > "${DBEAVER_CONF_DIR}/data-sources.json" <<EOFDS
{
  "folders": {},
  "connections": {
    "postgres-demo": {
      "provider": "postgresql",
      "driver": "postgres-jdbc",
      "name": "${NAME:-demo-postgres}",
      "save-password": true,
      "configuration": {
        "host": "${DB_HOST}",
        "port": "${DB_PORT}",
        "database": "${DB_NAME}",
        "url": "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}",
        "type": "dev",
        "auth-model": "native"
      },
      "auth-properties": {
        "user": "${DB_USER}",
        "password": "${DB_PASS}"
      }
    }
  }
}
EOFDS
  chmod 600 "${DBEAVER_CONF_DIR}/data-sources.json"
  echo "Wrote pre-configured connection to ${DBEAVER_CONF_DIR}/data-sources.json"
else
  echo "No database details in /etc/struct8_env -- starting CloudBeaver without a pre-configured connection."
fi
# ---------------------------------------------------------------------------------

echo "Running CloudBeaver on port ${CLOUDBEAVER_PORT}..."
docker run -d \
  --name cloudbeaver \
  --restart unless-stopped \
  -p "${CLOUDBEAVER_PORT}:8978" \
  -v "${WORKSPACE_DIR}:/opt/cloudbeaver/workspace" \
  "$CLOUDBEAVER_IMAGE"

echo "Done. CloudBeaver is starting on port ${CLOUDBEAVER_PORT}."
echo "Open http://<instance-public-ip>:${CLOUDBEAVER_PORT} and finish the first-run setup."
echo "If the connection was pre-configured, it appears in the navigator after setup."
