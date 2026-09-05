#!/bin/bash
# NAT instance bootstrap for Amazon Linux 2023.
# Turns this instance into a NAT router for a private subnet: it forwards and
# masquerades outbound traffic from the VPC, and forwards nothing else.
# Best-practice notes:
#   - IP forwarding is enabled only for IPv4, persisted across reboots.
#   - FORWARD defaults to DROP; only established replies and traffic from the
#     VPC CIDR are allowed, so the box is not an open router.
#   - MASQUERADE is scoped to the VPC CIDR as source, not 0.0.0.0/0.
#   - The primary interface and the VPC CIDR are discovered from instance
#     metadata (IMDSv2), so the script is not hard-coded to one environment.
#   - Requires the instance to have source_dest_check disabled (the template does that).
set -euo pipefail
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1

echo "Installing iptables-services..."
dnf install -y iptables-services

echo "Enabling IPv4 forwarding..."
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-nat.conf
sysctl -p /etc/sysctl.d/99-nat.conf

# Primary network interface (the one with the default route).
PRIMARY_IF=$(ip route | awk '/default/ {print $5; exit}')
if [ -z "$PRIMARY_IF" ]; then
  echo "ERROR: could not detect the primary interface." >&2
  exit 1
fi
echo "Primary interface: $PRIMARY_IF"

# Discover the VPC CIDR from IMDSv2, so MASQUERADE is scoped to the VPC only.
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
MAC=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/mac)
VPC_CIDR=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  "http://169.254.169.254/latest/meta-data/network/interfaces/macs/${MAC}/vpc-ipv4-cidr-block")
if [ -z "$VPC_CIDR" ]; then
  echo "ERROR: could not read the VPC CIDR from metadata." >&2
  exit 1
fi
echo "VPC CIDR: $VPC_CIDR"

echo "Configuring firewall (default-drop FORWARD, scoped NAT)..."
# NAT: masquerade only traffic that originates inside the VPC.
iptables -t nat -F
iptables -t nat -A POSTROUTING -s "$VPC_CIDR" -o "$PRIMARY_IF" -j MASQUERADE

# FORWARD: drop by default, allow established/related back, allow VPC outbound.
iptables -P FORWARD DROP
iptables -F FORWARD
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -s "$VPC_CIDR" -o "$PRIMARY_IF" -j ACCEPT

echo "Persisting rules..."
service iptables save
systemctl enable iptables
systemctl restart iptables

echo "Done. This instance is now a scoped NAT router for $VPC_CIDR."
