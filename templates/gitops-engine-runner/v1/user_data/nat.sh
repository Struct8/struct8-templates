#!/bin/bash
# NAT instance bootstrap for Amazon Linux 2023, for the gitops-engine-runner template.
# Routes outbound traffic from the VPC to the internet (source NAT / MASQUERADE) and
# keeps the FORWARD chain on DROP by default, so the box is not an open router.
# Notes:
#   - A t3.nano has 512 MB and dnf can be OOM-killed, so a little swap goes in first.
#   - AL2023 already ships the `iptables` command; the heavy iptables-services package
#     is avoided, and a small systemd unit restores the rules on reboot.
#   - Needs source_dest_check disabled on the instance (the template does that).
set -uo pipefail
exec >/var/log/user-data.log 2>&1

if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=512 2>/dev/null
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi

command -v iptables >/dev/null 2>&1 || dnf install -y iptables

echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-nat.conf
sysctl -p /etc/sysctl.d/99-nat.conf

PRIMARY_IF=$(ip route | awk '/default/ {print $5; exit}')

TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
MAC=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/mac)
VPC_CIDR=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  "http://169.254.169.254/latest/meta-data/network/interfaces/macs/${MAC}/vpc-ipv4-cidr-block")
echo "IF=$PRIMARY_IF  VPC=$VPC_CIDR"

iptables -t nat -F
iptables -F FORWARD
iptables -P FORWARD DROP
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -s "$VPC_CIDR" -o "$PRIMARY_IF" -j ACCEPT
iptables -t nat -A POSTROUTING -s "$VPC_CIDR" -o "$PRIMARY_IF" -j MASQUERADE

iptables-save > /etc/sysconfig/iptables
cat > /etc/systemd/system/nat-restore.service <<'EOF'
[Unit]
Description=Restore iptables NAT rules
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
ExecStart=/bin/sh -c 'iptables-restore < /etc/sysconfig/iptables'
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
EOF
systemctl enable nat-restore.service
echo "Done."
