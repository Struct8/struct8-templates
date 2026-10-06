#!/bin/bash
# pgweb (web PostgreSQL explorer) on Amazon Linux 2023 via Docker.
# Boots Docker, runs sosedoff/pgweb on port 8081, and restarts it on reboot.
#
# Works with BOTH a plain RDS instance (aws_db_instance) and an Aurora cluster
# (aws_rds_cluster). Struct8 writes different env var names depending on which the EC2
# is wired to: AWS_DB_INSTANCE_* for RDS, AWS_RDS_CLUSTER_* for Aurora. This script
# detects whichever set is present, so one asset serves both templates.
#
# Why pgweb and not a heavier client: pgweb opens ALREADY CONNECTED on the database,
# with no login screen, no setup wizard and no credential for the user to type. The
# instance reads the password from Secrets Manager at boot and starts pgweb pointed at
# the database -- the browser just shows the tables.
#
# It hardcodes nothing about the account. Struct8 writes the connection details to
# /etc/struct8_env when the instance is wired to the database AND "add environment
# variables" is enabled; this script reads them from there.
#
# Variables read from /etc/struct8_env (one set or the other):
#   RDS instance:   AWS_DB_INSTANCE_ENDPOINT_0 (host:port), AWS_DB_INSTANCE_DB_NAME_0,
#                   AWS_DB_INSTANCE_SECRET_ARN_0
#   Aurora cluster: AWS_RDS_CLUSTER_ENDPOINT_0 (host), AWS_RDS_CLUSTER_PORT_0,
#                   AWS_RDS_CLUSTER_DB_NAME_0, AWS_RDS_CLUSTER_SECRET_ARN_0
#   REGION          region, used for the AWS CLI calls (falls back to instance metadata)
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

PGWEB_PORT="${PGWEB_PORT:-8081}"
PGWEB_IMAGE="${PGWEB_IMAGE:-sosedoff/pgweb:latest}"
# sslmode for the connection. RDS/Aurora require TLS; "require" encrypts without
# verifying the CA (fine for a demo). Use "verify-full" with a CA bundle in prod.
PG_SSLMODE="${PG_SSLMODE:-require}"

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

# --- Read what Struct8 provided ---------------------------------------------------
if [ -f /etc/struct8_env ]; then
  # shellcheck disable=SC1091
  . /etc/struct8_env
fi

# Detect the wire: Aurora cluster first, then plain RDS instance.
if [ -n "${AWS_RDS_CLUSTER_ENDPOINT_0:-}" ]; then
  # Aurora: endpoint is the host alone; the port comes in its own variable.
  DB_HOST="${AWS_RDS_CLUSTER_ENDPOINT_0}"
  DB_PORT="${AWS_RDS_CLUSTER_PORT_0:-5432}"
  DB_NAME="${AWS_RDS_CLUSTER_DB_NAME_0:-}"
  DB_SECRET_ARN="${AWS_RDS_CLUSTER_SECRET_ARN_0:-}"
elif [ -n "${AWS_DB_INSTANCE_ENDPOINT_0:-}" ]; then
  # RDS: endpoint is host:port.
  DB_HOST="${AWS_DB_INSTANCE_ENDPOINT_0}"
  DB_PORT=""
  DB_NAME="${AWS_DB_INSTANCE_DB_NAME_0:-}"
  DB_SECRET_ARN="${AWS_DB_INSTANCE_SECRET_ARN_0:-}"
else
  echo "ERROR: /etc/struct8_env has no database endpoint. Wire the instance to the"
  echo "RDS instance or Aurora cluster and enable 'add environment variables'. Aborting."
  exit 1
fi

AWS_REGION="${REGION:-$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/placement/region)}"

if [ -z "$DB_HOST" ] || [ -z "$DB_SECRET_ARN" ]; then
  echo "ERROR: /etc/struct8_env has no database endpoint/secret. Aborting."
  exit 1
fi

# Endpoint may be host:port (RDS) or host (Aurora); split off a port if present.
case "$DB_HOST" in
  *:*)
    DB_PORT="${DB_HOST##*:}"
    DB_HOST="${DB_HOST%%:*}"
    ;;
esac
DB_PORT="${DB_PORT:-5432}"

echo "Fetching database credentials from Secrets Manager..."
SECRET_JSON="$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" \
  --region "$AWS_REGION" \
  --query SecretString --output text)"

DB_USER="$(echo "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["username"])')"
DB_PASS_RAW="$(echo "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["password"])')"

# Pass the credentials to pgweb as SEPARATE FLAGS with the RAW password, NOT as a
# DATABASE_URL. RDS-managed passwords contain characters (/, @, #, ?, :, |, (, >) and
# pgweb does not reliably percent-decode a password embedded in the connection URL:
# a URL-encoded password arrives wrong and pgweb loops on "authentication failed".
# Separate flags with the raw password avoid URL parsing entirely (verified against an
# RDS-managed secret). The password is handed to the container through an environment
# variable and expanded inside the container's shell, so it never appears in argv.
# ----------------------------------------------------------------------------------

echo "Running pgweb on port ${PGWEB_PORT}..."
# The image's entrypoint is the pgweb binary itself, so override it with a shell to
# expand $PGWEB_PASS inside the container. --bind=0.0.0.0 makes it reachable externally.
docker run -d \
  --name pgweb \
  --restart unless-stopped \
  -p "${PGWEB_PORT}:8081" \
  -e PGWEB_PASS="$DB_PASS_RAW" \
  --entrypoint sh \
  "$PGWEB_IMAGE" \
  -c 'exec pgweb --bind=0.0.0.0 --listen=8081 \
    --host="'"$DB_HOST"'" --port="'"$DB_PORT"'" --user="'"$DB_USER"'" \
    --pass="$PGWEB_PASS" --db="'"$DB_NAME"'" --ssl="'"$PG_SSLMODE"'"'

echo "Done. pgweb is starting on port ${PGWEB_PORT}."
echo "Open http://<instance-public-ip>:${PGWEB_PORT} -- it opens already connected to the database."
