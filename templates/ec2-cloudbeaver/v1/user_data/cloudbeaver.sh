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
# details to /etc/struct8_env and this script makes CloudBeaver open READY TO USE:
#   - writes a pre-configured datasource (host, port, database, and credentials
#     fetched from Secrets Manager) to the workspace;
#   - skips the first-run server wizard (CB_SERVER_NAME + admin env vars), so the
#     server boots already configured instead of showing "Initial Server
#     Configuration";
#   - grants the pre-configured connection to the anonymous team, so the browser
#     opens straight into the navigator with the connection present.
# When those variables are absent it falls back to a plain CloudBeaver and the user
# does the first-run setup and adds the connection by hand.
#
# Why env vars and not a custom cloudbeaver.conf: replacing the image's conf drops
# fields it needs (contentRoot -> "Base Resource is not valid: /var/www/cloudbeaver"
# and a restart loop). The image already resolves CB_*/CLOUDBEAVER_* variables into
# its own conf, so we only pass those and leave the file untouched.
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
CLOUDBEAVER_ADMIN_NAME="${CLOUDBEAVER_ADMIN_NAME:-cbadmin}"
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

PRECONFIGURED=0

# --- Pre-configure the database connection, if Struct8 provided the details ------
if [ -f /etc/struct8_env ]; then
  # shellcheck disable=SC1091
  . /etc/struct8_env
fi

DB_ENDPOINT="${AWS_DB_INSTANCE_ENDPOINT_0:-}"
DB_NAME="${AWS_DB_INSTANCE_DB_NAME_0:-}"
DB_SECRET_ARN="${AWS_DB_INSTANCE_SECRET_ARN_0:-}"
AWS_REGION="${REGION:-$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/placement/region)}"
PUBLIC_IP="$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4)"

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

  # Pre-configured datasource. CloudBeaver reads this at startup once the server is
  # configured; credentials in auth-properties are kept until the first open, then
  # encrypted and removed from the file.
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
  PRECONFIGURED=1
else
  echo "No database details in /etc/struct8_env -- starting CloudBeaver without pre-configuration."
fi
# ---------------------------------------------------------------------------------

echo "Running CloudBeaver on port ${CLOUDBEAVER_PORT}..."
if [ "$PRECONFIGURED" = "1" ]; then
  # A random admin password: the admin account is only there so the first-run wizard
  # is skipped; anonymous access is what the user actually browses with. Overridable
  # via CLOUDBEAVER_ADMIN_PASSWORD if the template wants a known admin.
  CB_ADMIN_PW="${CLOUDBEAVER_ADMIN_PASSWORD:-$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20)Aa1!}"

  # CB_SERVER_NAME present => the server boots configured and the wizard is skipped.
  # GRANT_CONNECTIONS_ACCESS_TO_ANONYMOUS_TEAM => the pre-configured connection is
  # visible to the anonymous user who opens the browser. Both verified on CloudBeaver
  # Community 26.2 (serverConfig.configurationMode=false, connection listed).
  docker run -d \
    --name cloudbeaver \
    --restart unless-stopped \
    -p "${CLOUDBEAVER_PORT}:8978" \
    -e CB_SERVER_NAME="${NAME:-Struct8 Demo} CloudBeaver" \
    -e CB_SERVER_URL="http://${PUBLIC_IP}:${CLOUDBEAVER_PORT}" \
    -e CB_ADMIN_NAME="${CLOUDBEAVER_ADMIN_NAME}" \
    -e CB_ADMIN_PASSWORD="${CB_ADMIN_PW}" \
    -e CLOUDBEAVER_APP_GRANT_CONNECTIONS_ACCESS_TO_ANONYMOUS_TEAM=true \
    -v "${WORKSPACE_DIR}:/opt/cloudbeaver/workspace" \
    "$CLOUDBEAVER_IMAGE"
else
  docker run -d \
    --name cloudbeaver \
    --restart unless-stopped \
    -p "${CLOUDBEAVER_PORT}:8978" \
    -v "${WORKSPACE_DIR}:/opt/cloudbeaver/workspace" \
    "$CLOUDBEAVER_IMAGE"
fi

echo "Done. CloudBeaver is starting on port ${CLOUDBEAVER_PORT}."
if [ "$PRECONFIGURED" = "1" ]; then
  echo "Open http://<instance-public-ip>:${CLOUDBEAVER_PORT} -- the connection is pre-loaded (anonymous access)."
else
  echo "Open http://<instance-public-ip>:${CLOUDBEAVER_PORT} and finish the first-run setup."
fi
