#!/bin/bash
# Runs on the instance before every deployment, as root, before docker compose
# starts the site. The same file runs on a configuration change, from
# .platform/confighooks/prebuild/.
#
# 1. Mounts the EFS file system at /mnt/efs. The environment property
#    AWS_EFS_FILE_SYSTEM_ID_0 names it; the diagram's connection from the
#    environment to the file system writes it, and opens the NFS port.
# 2. Writes /opt/struct8/wordpress.env, which only root reads, with:
#      DB_ADMIN_USER, DB_ADMIN_PASSWORD  the master user, from the secret RDS manages
#                                        (AWS_DB_INSTANCE_SECRET_ARN_0). Read again on
#                                        every deployment, since RDS rotates it.
#      WORDPRESS_DB_PASSWORD             the password of WordPress's own database user,
#                                        generated on the first deployment and kept on
#                                        EFS, outside the folder the site serves.
#      WP_ADMIN_PASSWORD                 the first administrator's password, from the SSM
#                                        parameter connected to the environment with the
#                                        label "admin" (AWS_SSM_PARAMETER_NAME_ADMIN).
#
# The instance role reads the secret and the parameter: the diagram's connections
# to them grant it.
set -euo pipefail

log() { echo "struct8-wordpress: $*"; }
property() { /opt/elasticbeanstalk/bin/get-config environment -k "$1" 2>/dev/null || true; }

token=$(curl -fsS -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 300" http://169.254.169.254/latest/api/token)
region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)

# --- EFS -----------------------------------------------------------------------
efs=$(property AWS_EFS_FILE_SYSTEM_ID_0)
[ -n "$efs" ] || { log "no EFS file system: connect the environment to one"; exit 1; }
mkdir -p /mnt/efs
if ! mountpoint -q /mnt/efs; then
  target="$efs.efs.$region.amazonaws.com:/"
  options=nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport
  # The mount target of a new file system takes a minute or two to answer.
  n=0
  until mount -t nfs4 -o "$options" "$target" /mnt/efs; do
    n=$((n + 1))
    [ "$n" -lt 30 ] || { log "EFS $efs did not mount"; exit 1; }
    sleep 10
  done
  grep -q " /mnt/efs " /etc/fstab || echo "$target /mnt/efs nfs4 $options,_netdev 0 0" >> /etc/fstab
  log "EFS $efs mounted at /mnt/efs"
fi
mkdir -p /mnt/efs/uploads /mnt/efs/.struct8
chown 33:33 /mnt/efs/uploads
chmod 700 /mnt/efs/.struct8

# --- Passwords -----------------------------------------------------------------
secret=$(property AWS_DB_INSTANCE_SECRET_ARN_0)
[ -n "$secret" ] || { log "no database secret: connect the environment to an RDS instance with a managed password"; exit 1; }
master=$(aws secretsmanager get-secret-value --region "$region" --secret-id "$secret" --query SecretString --output text)

# One instance creates the password; the others wait for the file.
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

admin_parameter=$(property AWS_SSM_PARAMETER_NAME_ADMIN)
[ -n "$admin_parameter" ] || { log "no administrator password: connect the environment to an SSM parameter with the label admin"; exit 1; }
admin_password=$(aws ssm get-parameter --region "$region" --name "$admin_parameter" --with-decryption --query Parameter.Value --output text)

mkdir -p /opt/struct8
umask 077
MASTER="$master" DB_PASSWORD="$(cat "$db_password")" ADMIN_PASSWORD="$admin_password" python3 - > /opt/struct8/wordpress.env.tmp <<'PY'
import json, os
master = json.loads(os.environ["MASTER"])
values = {
    "DB_ADMIN_USER": master["username"],
    "DB_ADMIN_PASSWORD": master["password"],
    "WORDPRESS_DB_PASSWORD": os.environ["DB_PASSWORD"],
    "WP_ADMIN_PASSWORD": os.environ["ADMIN_PASSWORD"],
}
# docker compose reads an env_file value literally when it is in single quotes.
for name, value in values.items():
    if "'" in value or "\n" in value:
        raise SystemExit(f"struct8-wordpress: {name} holds a character the env file cannot carry")
    print(f"{name}='{value}'")
PY
mv /opt/struct8/wordpress.env.tmp /opt/struct8/wordpress.env
log "passwords written to /opt/struct8/wordpress.env"
