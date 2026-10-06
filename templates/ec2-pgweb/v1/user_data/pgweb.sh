#!/bin/bash
# pgweb (web PostgreSQL explorer) on Amazon Linux 2023 via Docker.
# Boots Docker, runs sosedoff/pgweb on port 8081, and keeps it connected across
# Secrets Manager password rotations.
#
# Works with BOTH a plain RDS instance (aws_db_instance) and an Aurora cluster
# (aws_rds_cluster). Struct8 writes different env var names depending on which the EC2
# is wired to: AWS_DB_INSTANCE_* for RDS, AWS_RDS_CLUSTER_* for Aurora. This script
# detects whichever set is present, so one asset serves both templates.
#
# Why pgweb and not a heavier client: pgweb opens ALREADY CONNECTED on the database,
# with no login screen, no setup wizard and no credential for the user to type. The
# instance reads the password from Secrets Manager and starts pgweb pointed at the DB.
#
# ROTATION-SAFE. An RDS/Aurora managed master secret is rotated by AWS -- notably once
# right after the cluster is created. pgweb reads the password once at container start,
# so a fixed password goes stale on rotation and pgweb loops on "authentication failed"
# (the Lambdas never see this: they read the secret on every invocation). To stay
# connected, a systemd timer re-reads the secret every minute and recreates the
# container whenever the live password differs from the one the container is running
# with -- so a rotation self-heals within ~1 minute.
#
# It hardcodes nothing about the account. Struct8 writes the connection details to
# /etc/struct8_env when the instance is wired to the database AND "add environment
# variables" is enabled; this script reads them from there.
#
# Variables read from /etc/struct8_env (one set or the other, auto-detected):
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

# --- Resolve the connection details ONCE, from /etc/struct8_env --------------------
if [ -f /etc/struct8_env ]; then
  # shellcheck disable=SC1091
  . /etc/struct8_env
fi

# Detect the wire: Aurora cluster first, then plain RDS instance.
if [ -n "${AWS_RDS_CLUSTER_ENDPOINT_0:-}" ]; then
  DB_HOST="${AWS_RDS_CLUSTER_ENDPOINT_0}"       # Aurora: host alone
  DB_PORT="${AWS_RDS_CLUSTER_PORT_0:-5432}"
  DB_NAME="${AWS_RDS_CLUSTER_DB_NAME_0:-}"
  DB_SECRET_ARN="${AWS_RDS_CLUSTER_SECRET_ARN_0:-}"
elif [ -n "${AWS_DB_INSTANCE_ENDPOINT_0:-}" ]; then
  DB_HOST="${AWS_DB_INSTANCE_ENDPOINT_0}"       # RDS: host:port
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

# --- Install the reconcile script and the systemd timer that keeps pgweb connected -
# The reconcile script is the single source of truth for how pgweb is run; the boot
# path just invokes it once, and the timer invokes it every minute afterwards.
mkdir -p /opt/pgweb
cat > /opt/pgweb/pgweb.env <<EOFPGENV
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_SECRET_ARN=${DB_SECRET_ARN}
AWS_REGION=${AWS_REGION}
PGWEB_PORT=${PGWEB_PORT}
PGWEB_IMAGE=${PGWEB_IMAGE}
PG_SSLMODE=${PG_SSLMODE}
EOFPGENV

cat > /opt/pgweb/reconcile.sh <<'EOFRECONCILE'
#!/bin/bash
# Ensures the pgweb container is running with the CURRENT master password. Reads the
# secret, compares with what the running container holds, and recreates it on any
# mismatch (or if it is not running). Idempotent: a no-op when already correct.
set -u
# shellcheck disable=SC1091
. /opt/pgweb/pgweb.env

SECRET_JSON="$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" --region "$AWS_REGION" \
  --query SecretString --output text 2>/dev/null)" || exit 0
[ -z "$SECRET_JSON" ] && exit 0

DB_USER="$(printf '%s' "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["username"])')" || exit 0
DB_PASS="$(printf '%s' "$SECRET_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["password"])')" || exit 0
[ -z "$DB_PASS" ] && exit 0

# What is the running container using right now?
CUR_PASS="$(docker inspect pgweb --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | sed -n 's/^PGWEB_PASS=//p')"
RUNNING="$(docker inspect -f '{{.State.Running}}' pgweb 2>/dev/null || echo false)"

if [ "$RUNNING" = "true" ] && [ "$CUR_PASS" = "$DB_PASS" ]; then
  exit 0   # already correct
fi

echo "$(date -u +%FT%TZ) reconcile: (re)starting pgweb (running=$RUNNING, pass changed=$([ "$CUR_PASS" = "$DB_PASS" ] && echo no || echo yes))"
docker rm -f pgweb >/dev/null 2>&1
# Override the image entrypoint with a shell so $PGWEB_PASS is expanded INSIDE the
# container and never appears in argv/`docker inspect .Args`. Separate flags (not a
# DATABASE_URL): pgweb mis-decodes a percent-encoded password in the URL, so a managed
# secret with /, @, :, |, (, > etc. fails auth when encoded. Raw password avoids that.
docker run -d \
  --name pgweb \
  --restart unless-stopped \
  -p "${PGWEB_PORT}:8081" \
  -e PGWEB_PASS="$DB_PASS" \
  --entrypoint sh \
  "$PGWEB_IMAGE" \
  -c 'exec pgweb --bind=0.0.0.0 --listen=8081 \
    --host="'"$DB_HOST"'" --port="'"$DB_PORT"'" --user="'"$DB_USER"'" \
    --pass="$PGWEB_PASS" --db="'"$DB_NAME"'" --ssl="'"$PG_SSLMODE"'"'
EOFRECONCILE
chmod +x /opt/pgweb/reconcile.sh

cat > /etc/systemd/system/pgweb-reconcile.service <<'EOFSVC'
[Unit]
Description=Reconcile pgweb container with the current DB master secret
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/opt/pgweb/reconcile.sh
EOFSVC

cat > /etc/systemd/system/pgweb-reconcile.timer <<'EOFTIMER'
[Unit]
Description=Run pgweb reconcile every minute (self-heals on secret rotation)

[Timer]
OnBootSec=15s
OnUnitActiveSec=60s
AccuracySec=10s

[Install]
WantedBy=timers.target
EOFTIMER

systemctl daemon-reload
systemctl enable --now pgweb-reconcile.timer

# Run it once now so pgweb comes up immediately instead of waiting for the first tick.
echo "Starting pgweb on port ${PGWEB_PORT}..."
/opt/pgweb/reconcile.sh

echo "Done. pgweb is starting on port ${PGWEB_PORT}."
echo "Open http://<instance-public-ip>:${PGWEB_PORT} -- it opens already connected to the database."
echo "A systemd timer re-reads the secret every minute and reconnects pgweb after a rotation."
