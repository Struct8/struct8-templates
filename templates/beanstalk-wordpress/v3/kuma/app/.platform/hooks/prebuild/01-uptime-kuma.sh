#!/bin/bash
# Runs on the instance before every deployment, as root, before docker compose
# starts Uptime Kuma. The same file runs on a configuration change, from
# .platform/confighooks/prebuild/.
#
# 1. Mounts the EFS file system at /mnt/efs. The environment property
#    AWS_EFS_FILE_SYSTEM_ID_0 names it; the diagram's connection from the
#    environment to the file system writes it, and opens the NFS port. When the
#    connection's access point is on, AWS_EFS_ACCESS_POINT_ID_0 names it too, and
#    the file system is mounted through it: /mnt/efs is then the access point's
#    directory. Without it, /mnt/efs is the root of the file system.
# 2. Writes /opt/struct8/kuma.env, which only root reads, with:
#      DB_ADMIN_USER, DB_ADMIN_PASSWORD_B64  the master user, from the secret RDS manages
#                                        (AWS_DB_INSTANCE_SECRET_ARN_0), the password in
#                                        base64 because RDS may put a quote in it. Read
#                                        again on every deployment, since RDS rotates it.
#      UPTIME_KUMA_DB_HOSTNAME, _PORT    the RDS endpoint (AWS_DB_INSTANCE_ENDPOINT_0).
#      UPTIME_KUMA_DB_NAME               Uptime Kuma's database: the property KUMA_DB_NAME,
#                                        or "uptime_kuma".
#      UPTIME_KUMA_DB_USERNAME           the database user Uptime Kuma logs in as: the
#                                        property KUMA_DB_USER, or "uptime_kuma".
#      UPTIME_KUMA_DB_PASSWORD           that user's password, generated on the first
#                                        deployment and kept on EFS.
#
# The RDS instance is MariaDB: Uptime Kuma supports MariaDB as its external
# database. The instance role reads the secret: the diagram's connection grants it.
set -euo pipefail

log() { echo "struct8-kuma: $*"; }
property() { /opt/elasticbeanstalk/bin/get-config environment -k "$1" 2>/dev/null || true; }

token=$(curl -fsS -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 300" http://169.254.169.254/latest/api/token)
region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)

# --- EFS -----------------------------------------------------------------------
efs=$(property AWS_EFS_FILE_SYSTEM_ID_0)
[ -n "$efs" ] || { log "no EFS file system: connect the environment to one"; exit 1; }
access_point=$(property AWS_EFS_ACCESS_POINT_ID_0)

# What is mounted at /mnt/efs, so a later deployment can tell when it changed.
mounted=/var/lib/struct8/efs-mount
wanted="$efs ${access_point:-root}"

mkdir -p /mnt/efs /var/lib/struct8
if mountpoint -q /mnt/efs; then
  # The running containers hold the mount, so it cannot be swapped here. New
  # instances mount the new one: replace the instances, or rebuild the environment.
  if [ "$(cat "$mounted" 2>/dev/null || true)" != "$wanted" ]; then
    log "/mnt/efs still holds $(cat "$mounted" 2>/dev/null || echo 'an earlier mount'), not $wanted: replace the instances to mount it"
  fi
else
  if [ -n "$access_point" ]; then
    # An access point is mounted with the EFS mount helper, over TLS.
    rpm -q amazon-efs-utils >/dev/null 2>&1 || dnf install -y -q amazon-efs-utils
    fstype=efs
    source="$efs:/"
    options="tls,accesspoint=$access_point"
  else
    fstype=nfs4
    source="$efs.efs.$region.amazonaws.com:/"
    options=nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport
  fi
  # The mount target of a new file system takes a minute or two to answer.
  n=0
  until mount -t "$fstype" -o "$options" "$source" /mnt/efs; do
    n=$((n + 1))
    [ "$n" -lt 30 ] || { log "EFS $efs did not mount"; exit 1; }
    sleep 10
  done
  sed -i '\# /mnt/efs #d' /etc/fstab
  echo "$source /mnt/efs $fstype $options,_netdev 0 0" >> /etc/fstab
  echo "$wanted" > "$mounted"
  log "EFS $efs mounted at /mnt/efs${access_point:+ through access point $access_point}"
fi
mkdir -p /mnt/efs/data /mnt/efs/.struct8
chmod 700 /mnt/efs/.struct8

# --- Database address, name and user ---------------------------------------------
endpoint=$(property AWS_DB_INSTANCE_ENDPOINT_0)
[ -n "$endpoint" ] || { log "no database: connect the environment to an RDS instance"; exit 1; }
db_host=${endpoint%:*}
db_port=${endpoint##*:}
[ "$db_port" != "$endpoint" ] || db_port=3306

db_name=$(property KUMA_DB_NAME)
[ -n "$db_name" ] || db_name=uptime_kuma
db_user=$(property KUMA_DB_USER)
[ -n "$db_user" ] || db_user=uptime_kuma
for value in "$db_name" "$db_user"; do
  [[ "$value" =~ ^[A-Za-z0-9_]{1,32}$ ]] || { log "\"$value\": a database name or user takes letters, digits and _, up to 32"; exit 1; }
done

# --- Passwords -----------------------------------------------------------------
secret=$(property AWS_DB_INSTANCE_SECRET_ARN_0)
[ -n "$secret" ] || { log "no database secret: connect the environment to an RDS instance with a managed password"; exit 1; }
master=$(aws secretsmanager get-secret-value --region "$region" --secret-id "$secret" --query SecretString --output text)

db_password=/mnt/efs/.struct8/db-password
if [ ! -s "$db_password" ] && mkdir /mnt/efs/.struct8/db-password.lock 2>/dev/null; then
  head -c 24 /dev/urandom | base64 | tr -d '/+=' > "$db_password.tmp"
  chmod 600 "$db_password.tmp"
  mv "$db_password.tmp" "$db_password"
  rmdir /mnt/efs/.struct8/db-password.lock
fi
n=0
until [ -s "$db_password" ]; do
  n=$((n + 1)); [ "$n" -lt 30 ] || { log "the database password was not created"; exit 1; }; sleep 2
done

mkdir -p /opt/struct8
umask 077
MASTER="$master" DB_HOST="$db_host" DB_PORT="$db_port" DB_NAME="$db_name" DB_USER="$db_user" DB_PASSWORD="$(cat "$db_password")" \
  python3 - > /opt/struct8/kuma.env.tmp <<'PY'
import base64, json, os
master = json.loads(os.environ["MASTER"])
values = {
    "DB_ADMIN_USER": master["username"],
    "DB_ADMIN_PASSWORD_B64": base64.b64encode(master["password"].encode()).decode(),
    "UPTIME_KUMA_DB_HOSTNAME": os.environ["DB_HOST"],
    "UPTIME_KUMA_DB_PORT": os.environ["DB_PORT"],
    "UPTIME_KUMA_DB_NAME": os.environ["DB_NAME"],
    "UPTIME_KUMA_DB_USERNAME": os.environ["DB_USER"],
    "UPTIME_KUMA_DB_PASSWORD": os.environ["DB_PASSWORD"],
}
# docker compose reads an env_file value literally when it is in single quotes.
for name, value in values.items():
    if "'" in value or "\n" in value:
        raise SystemExit(f"struct8-kuma: {name} holds a character the env file cannot carry")
    print(f"{name}='{value}'")
PY
mv /opt/struct8/kuma.env.tmp /opt/struct8/kuma.env
log "database $db_name on $db_host, user $db_user; written to /opt/struct8/kuma.env"
