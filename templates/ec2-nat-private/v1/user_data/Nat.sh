#!/bin/bash
# Generic NAT instance bootstrap for Amazon Linux 2023 - reusable across templates.
# Always: routes outbound traffic from the VPC to the internet (source NAT / MASQUERADE),
#         with a default-DROP FORWARD chain so the box is not an open router.
# Optional: if FORWARD_PORT and FORWARD_TARGET are set (as environment variables on the
#           node), it also forwards that inbound port to a private host (destination NAT),
#           turning the NAT into a single-port entry point. Leave them unset for pure
#           isolation.
# Requires source_dest_check disabled on the instance (the template does that).
set -uo pipefail
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1

# CloudMan writes node environment variables here; load them if present.
[ -f /etc/environment ] && . /etc/environment || true

echo "Installing iptables-services..."
dnf install -y iptables-services

echo "Enabling IPv4 forwarding..."
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-nat.conf
sysctl -p /etc/sysctl.d/99-nat.conf

PRIMARY_IF=$(ip route | awk '/default/ {print $5; exit}')
echo "Primary interface: $PRIMARY_IF"

# Discover the VPC CIDR from IMDSv2 so MASQUERADE is scoped to the VPC only.
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
MAC=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/mac)
VPC_CIDR=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  "http://169.254.169.254/latest/meta-data/network/interfaces/macs/${MAC}/vpc-ipv4-cidr-block")
echo "VPC CIDR: $VPC_CIDR  |  FORWARD_PORT=${FORWARD_PORT:-<none>}  FORWARD_TARGET=${FORWARD_TARGET:-<none>}"

echo "Base NAT rules (outbound only, scoped to the VPC)..."
iptables -t nat -F
iptables -F FORWARD
iptables -P FORWARD DROP
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -s "$VPC_CIDR" -o "$PRIMARY_IF" -j ACCEPT
iptables -t nat -A POSTROUTING -s "$VPC_CIDR" -o "$PRIMARY_IF" -j MASQUERADE

# Optional port forward (destination NAT) - only if both vars are set.
if [ -n "${FORWARD_PORT:-}" ] && [ -n "${FORWARD_TARGET:-}" ]; then
  echo "Enabling port forward: :${FORWARD_PORT} -> ${FORWARD_TARGET}:${FORWARD_PORT}"
  iptables -t nat -A PREROUTING -i "$PRIMARY_IF" -p tcp --dport "$FORWARD_PORT" \
    -j DNAT --to-destination "${FORWARD_TARGET}:${FORWARD_PORT}"
  iptables -A FORWARD -p tcp -d "$FORWARD_TARGET" --dport "$FORWARD_PORT" -j ACCEPT
fi

echo "Persisting rules..."
service iptables save
systemctl enable iptables
systemctl restart iptables
echo "Done."
