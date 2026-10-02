#!/bin/bash
# NAT instance on Amazon Linux 2023 -- a cheaper stand-in for a managed NAT Gateway.
#
# WHY THIS EXISTS
# A managed NAT Gateway bills roughly $0.045/hour plus $0.045/GB processed, which dominates the
# cost of a short-lived load-test lab that only needs the private subnets to reach the internet
# (image pulls, package installs, telemetry). A single small EC2 doing the same NAT job costs the
# instance-hour and nothing per GB. This script turns a plain AL2023 instance into that NAT box.
#
# The Amazon-provided "amzn-ami-vpc-nat" images were retired, so NAT is not something the AMI does
# any more -- it has to be set up by hand, which is all this script does: turn on IPv4 forwarding
# and masquerade everything leaving the primary interface.
#
# WHAT THE INSTANCE ALSO NEEDS (set on the Struct8 node, not here)
#   * source_dest_check = false        -- or the ENI drops packets whose destination is not itself,
#                                         which is every packet it is meant to route.
#   * a public IP (associate_public_ip_address = true) in a PUBLIC subnet (route to the IGW).
#   * the private route table's 0.0.0.0/0 route pointing at THIS instance (already wired).
#   * a security group that allows inbound traffic from the private subnet CIDRs.
#
# It is architecture-neutral: nothing here assumes x86_64 or arm64, so the instance family can be
# swapped without touching the script.
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

echo "Configuring this instance as a NAT router..."

# 1) Turn on IPv4 forwarding, now and across reboots.
sysctl -w net.ipv4.ip_forward=1
cat > /etc/sysctl.d/99-nat.conf <<'SYSCTLEOF'
net.ipv4.ip_forward = 1
SYSCTLEOF

# 2) Find the primary network interface by name rather than assuming eth0: AL2023 on Nitro names it
#    ens5/enX0, and hard-coding eth0 is the usual reason a hand-rolled NAT silently forwards nothing.
PRIMARY_IF="$(ip -o -4 route show to default | awk '{print $5; exit}')"
echo "Primary interface: ${PRIMARY_IF:-unknown}"
if [ -z "$PRIMARY_IF" ]; then
  echo "Could not determine the primary interface; cannot set up NAT." >&2
  exit 1
fi

# 3) Masquerade everything leaving that interface, so replies find their way back to the private
#    hosts. POSTROUTING/MASQUERADE is the whole of the NAT.
iptables -t nat -A POSTROUTING -o "$PRIMARY_IF" -j MASQUERADE
iptables -A FORWARD -i "$PRIMARY_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -o "$PRIMARY_IF" -j ACCEPT

# 4) Persist the rules so a reboot does not quietly stop routing. iptables-services restores
#    /etc/sysconfig/iptables at boot.
dnf install -y iptables-services
iptables-save > /etc/sysconfig/iptables
systemctl enable iptables

echo "NAT is up: ip_forward on, MASQUERADE on ${PRIMARY_IF}, rules persisted."
