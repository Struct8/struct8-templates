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
# TWO THINGS BIT THIS LAB, both fixed here:
#
# 1) BACKEND SWAP. On AL2023 iptables is the nft backend, and installing iptables-services pulls in
#    and switches that backend. Rules added BEFORE the package is installed are lost when the
#    install swaps the backend, so the box logged "NAT is up" while POSTROUTING was empty. Fix: the
#    package goes in FIRST, the service is started, and only then are the rules added and saved.
#
# 2) FORWARD ORDER. The AL2023 default firewall ships a `-A FORWARD -j REJECT` rule. iptables
#    evaluates FORWARD top to bottom and the first match wins, so ACCEPT rules APPENDED (-A) after
#    that REJECT never run -- every forwarded packet is rejected and nothing routes, even with
#    ip_forward on and MASQUERADE in place. Fix: the FORWARD ACCEPT rules are INSERTED at the top
#    (-I FORWARD 1), ahead of the REJECT. This is the difference between "NAT is up" and NAT that
#    actually forwards.
#
# The script verifies BOTH the MASQUERADE rule and that FORWARD accepts before it rejects, and
# fails loudly otherwise, instead of reporting a success it did not achieve.
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

# 4) The NAT rules.
#
#    POSTROUTING/MASQUERADE is the whole of the NAT: appended idempotently (-C then -A), since
#    order does not matter in the nat table here.
#
#    The FORWARD ACCEPT rules, however, MUST sit ABOVE the default `-A FORWARD -j REJECT`. So they
#    are first deleted if present (to avoid a stale copy below the REJECT and to keep the run
#    idempotent across reboots) and then INSERTED at the top with -I FORWARD 1 / 2. Inserting #2
#    after #1 leaves them in the order [RELATED,ESTABLISHED], [out], ..., REJECT.
iptables -t nat -C POSTROUTING -o "$PRIMARY_IF" -j MASQUERADE 2>/dev/null \
  || iptables -t nat -A POSTROUTING -o "$PRIMARY_IF" -j MASQUERADE

# Drop any existing copies first (ignore errors when they are not there), then insert at the top.
iptables -D FORWARD -i "$PRIMARY_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
iptables -D FORWARD -o "$PRIMARY_IF" -j ACCEPT 2>/dev/null || true
iptables -I FORWARD 1 -i "$PRIMARY_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -I FORWARD 2 -o "$PRIMARY_IF" -j ACCEPT

# 5) Persist the rules so a reboot does not quietly stop routing. iptables-services restores
#    /etc/sysconfig/iptables at boot; saving now writes the live rules there.
iptables-save > /etc/sysconfig/iptables

# 6) Verify, rather than trust. The lab failed twice with a log that claimed success while routing
#    was in fact broken, so confirm BOTH conditions and fail loudly otherwise:
#      a) the MASQUERADE rule is in the live nat table, and
#      b) in the FORWARD chain, our ACCEPT rules come BEFORE any REJECT (the AL2023 default REJECT
#         sitting first is exactly what silently blocks forwarding).
ok=1
if ! iptables -t nat -S POSTROUTING | grep -q -- "-A POSTROUTING -o ${PRIMARY_IF} -j MASQUERADE"; then
  echo "ERROR: MASQUERADE rule is NOT present. NAT is NOT working." >&2
  ok=0
fi

# Read FORWARD in order; the first ACCEPT on our interface must appear before the first REJECT.
fwd="$(iptables -S FORWARD)"
accept_line="$(printf '%s\n' "$fwd" | grep -n -- "-A FORWARD .*-o ${PRIMARY_IF} -j ACCEPT" | head -1 | cut -d: -f1)"
reject_line="$(printf '%s\n' "$fwd" | grep -n -- "-j REJECT" | head -1 | cut -d: -f1)"
if [ -z "$accept_line" ]; then
  echo "ERROR: FORWARD has no ACCEPT rule for ${PRIMARY_IF}. NAT is NOT working." >&2
  ok=0
elif [ -n "$reject_line" ] && [ "$accept_line" -gt "$reject_line" ]; then
  echo "ERROR: a REJECT rule precedes our ACCEPT in FORWARD, so forwarding is blocked." >&2
  ok=0
fi

if [ "$ok" = 1 ]; then
  echo "NAT is up: ip_forward on, MASQUERADE on ${PRIMARY_IF}, FORWARD accepts before any reject, rules persisted."
else
  echo "Current nat POSTROUTING:" >&2; iptables -t nat -S POSTROUTING >&2
  echo "Current FORWARD:" >&2; printf '%s\n' "$fwd" >&2
  exit 1
fi
