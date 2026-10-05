#!/bin/bash
# pgweb (web PostgreSQL explorer) on Amazon Linux 2023 via Docker, for AURORA clusters.
# Boots Docker, runs sosedoff/pgweb on port 8081, and restarts it on reboot.
#
# This is the Aurora variant of the ec2-pgweb bootstrap. It is identical in spirit to
# ec2-pgweb/v1/user_data/pgweb.sh, but reads the AWS_RDS_CLUSTER_* variables Struct8
# writes when the instance is wired to an aws_rds_cluster, instead of the
# AWS_DB_INSTANCE_* variables a wire to an aws_db_instance (plain RDS) produces.
# Assets are never shared across templates (repo README rule 4), so this is a full copy
# with the variable names adjusted -- not a reference to the RDS script.
#
# Why pgweb and not a heavier client: pgweb takes the whole connection string
# (WITH the password) in DATABASE_URL at startup, so it opens ALREADY CONNECTED on
# the database, with no login screen, no setup wizard and no credential for the user
# to type. The instance reads the password from Secrets Manager at boot and builds
# the URL -- the browser just shows the tables.
#
# It hardcodes nothing about the account. Struct8 writes the connection details to
# /etc/struct8_env when the instance is wired to the cluster and "add environment
# variables" is enabled; this script reads them from there.
#
# Variables read from /etc/struct8_env (Aurora cluster wire):
#   AWS_RDS_CLUSTER_ENDPOINT_0   writer endpoint host of the cluster
#   AWS_RDS_CLUSTER_PORT_0       port (5432 for PostgreSQL)
#   AWS_RDS_CLUSTER_DB_NAME_0    database name
#   AWS_RDS_CLUSTER_SECRET_ARN_0 ARN of the RDS-managed master_user_secret (user/pass)
#   REGION                       region, used for the AWS CLI calls
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

PGWEB_PORT="${PGWEB_PORT:-8081}"
PGWEB_IMAGE="${PGWEB_IMAGE:-sosedoff/pgweb:latest}"
# sslmode for the Aurora connection. Aurora requires TLS; "require" encrypts without
# verifying the CA (fine for a demo). Use "verify-full" with a CA bundle in prod.
PG_SSLMODE="${PG_SSLMODE:-require}"

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

# --- Build the connection string from what Struct8 provided -----------------------
if [ -f /etc/struct8_env ]; then
  # shellcheck disable=SC1091
  . /etc/struct8_env
fi

# The Aurora cluster endpoint is the host alone (no :port), unlike the RDS instance
# endpoint which is host:port. Port comes in its own variable.
DB_HOST="${AWS_RDS_CLUSTER_ENDPOINT_0:-}"
DB_PORT="${AWS_RDS_CLUSTER_PORT_0:-5432}"
DB_NAME="${AWS_RDS_CLUSTER_DB_NAME_0:-}"
DB_SECRET_ARN="${AWS_RDS_CLUSTER_SECRET_ARN_0:-}"
AWS_REGION="${REGION:-$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/placement/region)}"

if [ -z "$DB_HOST" ] || [ -z "$DB_SECRET_ARN" ]; then
  echo "ERROR: /etc/struct8_env has no cluster endpoint/secret. Wire the instance to"
  echo "the Aurora cluster and enable 'add environment variables' on it. Aborting."
  exit 1
fi

# Some wires may still deliver the endpoint as host:port; tolerate both forms.
case "$DB_HOST" in
  *:*)
    DB_PORT="${DB_HOST##*:}"
    DB_HOST="${DB_HOST%%:*}"
    ;;
esac

echo "Fetching database credentials from Secrets Manager..."
SECRET_JSON="$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" \
  --region "$AWS_REGION" \
  --query SecretString --output text)"

DB_USER="$(echo "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["username"])')"
DB_PASS_RAW="$(echo "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["password"])')"
# URL-encode the password: RDS-managed passwords contain characters (/, @, #, ?, :)
# that break a connection URL if used raw.
DB_PASS_ENC="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$DB_PASS_RAW")"
DB_USER_ENC="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$DB_USER")"

DATABASE_URL="postgres://${DB_USER_ENC}:${DB_PASS_ENC}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${PG_SSLMODE}"
# ----------------------------------------------------------------------------------

echo "Running pgweb on port ${PGWEB_PORT}..."
# --bind=0.0.0.0 so it is reachable from outside the container.
docker run -d \
  --name pgweb \
  --restart unless-stopped \
  -p "${PGWEB_PORT}:8081" \
  -e DATABASE_URL="$DATABASE_URL" \
  "$PGWEB_IMAGE" \
  pgweb --bind=0.0.0.0 --listen=8081

echo "Done. pgweb is starting on port ${PGWEB_PORT}."
echo "Open http://<instance-public-ip>:${PGWEB_PORT} -- it opens already connected to the database."
