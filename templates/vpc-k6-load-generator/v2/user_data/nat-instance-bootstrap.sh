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
# ORDER MATTERS -- this bit the lab once. On AL2023 iptables is the nft backend, and installing
# iptables-services pulls in and switches that backend. Rules added BEFORE the package is installed
# are lost when the install swaps the backend, so the box logs "NAT is up" while POSTROUTING is in
# fact empty and nothing routes. So the package goes in FIRST, the service is started, and only then
# are the rules added and saved. The script verifies the MASQUERADE rule is really present at the
# end and fails loudly if it is not, instead of reporting a success it did not achieve.
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

# 3) Install and start iptables-services FIRST, before touching any rule. This is the fix for the
#    backend-swap trap described in the header: once the package is installed and the service owns
#    the tables, rules added afterwards survive and are what gets saved. The retry covers a NAT box
#    whose own egress is briefly not ready yet at first boot.
for attempt in 1 2 3 4 5; do
  if dnf install -y iptables-services; then break; fi
  echo "dnf install iptables-services failed (attempt $attempt), retrying in 5s..."
  sleep 5
done
systemctl enable --now iptables

# 4) Masquerade everything leaving that interface, so replies find their way back to the private
#    hosts. POSTROUTING/MASQUERADE is the whole of the NAT. Insert idempotently (-C then -A) so a
#    reboot that re-runs this, or a manual re-run, does not stack duplicate rules.
add_rule() {
  local table_args=()
  if [ "$1" = "-t" ]; then table_args=(-t "$2"); shift 2; fi
  iptables "${table_args[@]}" -C "$@" 2>/dev/null || iptables "${table_args[@]}" -A "$@"
}
add_rule -t nat POSTROUTING -o "$PRIMARY_IF" -j MASQUERADE
add_rule FORWARD -i "$PRIMARY_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT
add_rule FORWARD -o "$PRIMARY_IF" -j ACCEPT

# 5) Persist the rules so a reboot does not quietly stop routing. iptables-services restores
#    /etc/sysconfig/iptables at boot; saving now writes the live rules there.
iptables-save > /etc/sysconfig/iptables

# 6) Verify, rather than trust. The lab failed once with a log that claimed success while the rule
#    was absent, so confirm the MASQUERADE rule is really in the live table and say the truth.
if iptables -t nat -S POSTROUTING | grep -q -- "-A POSTROUTING -o ${PRIMARY_IF} -j MASQUERADE"; then
  echo "NAT is up: ip_forward on, MASQUERADE on ${PRIMARY_IF}, rules persisted."
else
  echo "ERROR: the MASQUERADE rule is NOT present after setup. NAT is NOT working." >&2
  echo "Current nat POSTROUTING:" >&2
  iptables -t nat -S POSTROUTING >&2
  exit 1
fi
