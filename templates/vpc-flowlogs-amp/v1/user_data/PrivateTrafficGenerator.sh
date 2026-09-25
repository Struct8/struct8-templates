#!/bin/bash
# Boot script of the traffic generators in the private subnets of the VPC Flow
# Logs + Managed Prometheus lab: traffic-gen-private, and every instance
# traffic-gen-asg launches.
#
# Every 15 seconds it talks to each destination the node was given, each one
# leaving the VPC through a different door, so the Traffic layer has one line
# per door:
#
#   the bucket wired to the node       put, get and delete of a 256 KB object,
#   (AWS_S3_BUCKET_NAME_0)             through the S3 gateway endpoint
#   the table wired to the node        put and get of one item, through the
#   (AWS_DYNAMODB_TABLE_NAME_0)        DynamoDB gateway endpoint
#   PING_TARGET, an address set on     ten 1200-byte pings, across the VPC
#   the node's environment variables   peering when the address is in the peer
#   checkip.amazonaws.com and          one HTTPS request each, through the NAT
#   www.google.com                     instance of the public subnet
#
# The names come from /etc/struct8_env, which the compile writes when the node
# has environment variables on. A destination whose variable is missing is
# skipped, and the others keep running.
#
# The object is deleted right after it is read, so the bucket stays empty and a
# destroy does not stop on it.

cat >/usr/local/bin/struct8-private-traffic.sh <<'EOF'
#!/bin/bash
[ -f /etc/struct8_env ] && . /etc/struct8_env
BUCKET="${AWS_S3_BUCKET_NAME_0:-}"
TABLE="${AWS_DYNAMODB_TABLE_NAME_0:-}"
TARGET="${PING_TARGET:-}"
REGION="${REGION:-us-east-1}"

PAYLOAD=/var/tmp/struct8-payload.bin
head -c 262144 /dev/urandom >"$PAYLOAD"

while true; do
  KEY="traffic/$(hostname)-$(date +%s)"
  if [ -n "$BUCKET" ]; then
    aws s3api put-object --region "$REGION" --bucket "$BUCKET" --key "$KEY" --body "$PAYLOAD" >/dev/null 2>&1
    aws s3api get-object --region "$REGION" --bucket "$BUCKET" --key "$KEY" /var/tmp/struct8-read.bin >/dev/null 2>&1
    aws s3api delete-object --region "$REGION" --bucket "$BUCKET" --key "$KEY" >/dev/null 2>&1
  fi
  if [ -n "$TABLE" ]; then
    aws dynamodb put-item --region "$REGION" --table-name "$TABLE" --item "{\"ID\":{\"S\":\"$KEY\"}}" >/dev/null 2>&1
    aws dynamodb get-item --region "$REGION" --table-name "$TABLE" --key "{\"ID\":{\"S\":\"$KEY\"}}" >/dev/null 2>&1
  fi
  if [ -n "$TARGET" ]; then
    ping -c 10 -i 0.2 -s 1200 -W 2 "$TARGET" >/dev/null 2>&1
  fi
  curl -s -o /dev/null --max-time 5 https://checkip.amazonaws.com/
  curl -s -o /dev/null --max-time 5 https://www.google.com/
  sleep 15
done
EOF
chmod +x /usr/local/bin/struct8-private-traffic.sh

cat >/etc/systemd/system/struct8-private-traffic.service <<'UNIT'
[Unit]
Description=Traffic generator of a private subnet, for the VPC flow log lab
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/struct8-private-traffic.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now struct8-private-traffic.service
