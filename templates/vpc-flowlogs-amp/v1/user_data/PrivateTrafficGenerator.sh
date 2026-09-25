#!/bin/bash
# Boot script of the traffic generators in the private subnets of the VPC Flow
# Logs + Managed Prometheus lab: traffic-gen-private, and every instance
# traffic-gen-asg launches.
#
# Everything it does is switched on by a variable in /etc/struct8_env, which the
# compile writes from the node's connections and environment variables. A
# variable that is missing switches its part off, and the rest keeps running.
#
# Every 15 seconds, as a client:
#
#   AWS_S3_BUCKET_NAME_0        put, get and delete of a 256 KB object in the
#                               wired bucket, through the S3 gateway endpoint
#   AWS_DYNAMODB_TABLE_NAME_0   put and get of one item in the wired table,
#                               through the DynamoDB gateway endpoint
#   PING_TARGET                 ten 1200-byte pings to each address (ICMP)
#   PROBE                       one conversation per host:port/protocol, for
#                               example "10.5.1.10:80/tcp 10.5.1.10:53/udp":
#                               TCP sends a request and reads the whole answer,
#                               UDP sends 512 bytes and waits for the echo
#   (always)                    one HTTPS request to checkip.amazonaws.com and
#                               one to www.google.com, through the NAT instance
#
# As a server:
#
#   LISTEN                      answers on each port/protocol, for example
#                               "80/tcp 53/udp": a TCP connection gets an HTTP
#                               response with 32 KB of body, a UDP datagram
#                               gets itself back. SSH already answers on 22.
#
# Each port is a separate line in the Traffic layer's protocol breakdown, which
# names the well-known ones (22 SSH, 53 DNS, 80 HTTP). What reaches the server
# is decided by its security group, so the lab shows a rule per protocol.
#
# The object is deleted right after it is read, so the bucket stays empty and a
# destroy does not stop on it.

cat >/usr/local/bin/struct8-serve.py <<'EOF'
#!/usr/bin/env python3
"""Answers on every port in LISTEN ("80/tcp 53/udp")."""
import os
import socket
import threading

BODY = b"x" * 32768
HEADER = b"HTTP/1.0 200 OK\r\nContent-Length: %d\r\n\r\n" % len(BODY)


def tcp(port):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", port))
    server.listen(16)
    while True:
        conn, _ = server.accept()
        try:
            conn.settimeout(3)
            conn.recv(4096)
            conn.sendall(HEADER + BODY)
        except OSError:
            pass
        finally:
            conn.close()


def udp(port):
    server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server.bind(("0.0.0.0", port))
    while True:
        data, peer = server.recvfrom(2048)
        server.sendto(data, peer)


for item in os.environ.get("LISTEN", "").split():
    port, _, protocol = item.partition("/")
    serve = udp if protocol == "udp" else tcp
    threading.Thread(target=serve, args=(int(port),)).start()
EOF

cat >/usr/local/bin/struct8-probe.py <<'EOF'
#!/usr/bin/env python3
"""Opens one conversation per item in PROBE ("10.5.1.10:80/tcp 10.5.1.10:53/udp")."""
import os
import socket

for item in os.environ.get("PROBE", "").split():
    address, _, protocol = item.partition("/")
    host, _, port = address.rpartition(":")
    try:
        if protocol == "udp":
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(2)
            sock.sendto(b"q" * 512, (host, int(port)))
            sock.recvfrom(2048)
        else:
            sock = socket.create_connection((host, int(port)), timeout=3)
            sock.settimeout(3)
            sock.sendall(b"GET / HTTP/1.0\r\n\r\n")
            while sock.recv(65536):
                pass
        sock.close()
    except OSError:
        pass
EOF
chmod +x /usr/local/bin/struct8-serve.py /usr/local/bin/struct8-probe.py

cat >/usr/local/bin/struct8-private-traffic.sh <<'EOF'
#!/bin/bash
[ -f /etc/struct8_env ] && . /etc/struct8_env
BUCKET="${AWS_S3_BUCKET_NAME_0:-}"
TABLE="${AWS_DYNAMODB_TABLE_NAME_0:-}"
TARGETS="${PING_TARGET:-}"
PROBES="${PROBE:-}"
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
  for TARGET in $TARGETS; do
    ping -c 10 -i 0.2 -s 1200 -W 2 "$TARGET" >/dev/null 2>&1
  done
  if [ -n "$PROBES" ]; then
    PROBE="$PROBES" python3 /usr/local/bin/struct8-probe.py
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

cat >/etc/systemd/system/struct8-serve.service <<'UNIT'
[Unit]
Description=Ports the VPC flow log lab probes, from LISTEN
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=-/etc/struct8_env
ExecStart=/usr/bin/python3 /usr/local/bin/struct8-serve.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now struct8-private-traffic.service
if grep -q '^LISTEN=' /etc/struct8_env 2>/dev/null; then
  systemctl enable --now struct8-serve.service
fi
