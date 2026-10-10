#!/bin/bash
# Gateway Load Balancer inspection appliance for Amazon Linux 2023 (arm64 or x86_64).
# Traffic arrives from the GWLB inside GENEVE tunnels (UDP 6081). gwlbtun (the AWS sample
# tunnel handler) unwraps it into one interface pair per GWLB endpoint: gwi-<X> receives the
# packets, gwo-<X> sends them back to the GWLB. Between the two the packet goes through the
# normal Linux forwarding path, so nftables sees it in the `forward` chain.
#
# What it sets up:
#   1. forwarding sysctls (and rp_filter off, because the packets are not addressed to us);
#   2. gwlbtun from the AWS release page, run by systemd, with a TCP health check on
#      HEALTH_PORT (default 8060). The GWLB target group must health check that port;
#   3. a hook that gwlbtun runs for every endpoint tunnel: it routes everything that enters on
#      gwi-<X> out of gwo-<X> (one policy routing table per endpoint);
#   4. an nftables ruleset in the forward chain. Default policy is ACCEPT with a short deny
#      list (telnet, SMB, RDP) and counters, so a flow whose return path does not come
#      through this appliance is never dropped for looking half-open;
#   5. optional Suricata in inline mode (NFQUEUE) when the node variable SURICATA is 1.
#
# Notes:
#   - Not tested with SURICATA=1: Amazon Linux 2023 does not ship a suricata package, so the
#     step installs it only if a repository the instance can reach provides it.
#   - gwlbtun comes from the `latest` release of aws-samples/aws-gateway-load-balancer-tunnel-handler,
#     which moves. Copy the binary to a bucket and change GWLBTUN_URL to pin a version.
#   - The instance needs outbound internet at boot (dnf and the binary download).
#   - Source/destination check can stay enabled: the outer GENEVE packets are addressed to
#     this instance, and the inner packets leave through the tunnel, not through eth0.
#   - Node variables are read from /etc/profile.d/struct8_vars.sh: HEALTH_PORT, SURICATA.
set -uo pipefail
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1

# The generator writes the variables as  export KEY   = "value"  (spaces + quotes), which is
# not valid shell to source, so parse the value out instead of sourcing.
VARS=/etc/profile.d/struct8_vars.sh
getvar() { [ -f "$VARS" ] && awk -F= -v k="$1" '$0 ~ k {gsub(/[ "]/,"",$2); print $2; exit}' "$VARS"; }
HEALTH_PORT=$(getvar HEALTH_PORT)
HEALTH_PORT=${HEALTH_PORT:-8060}
SURICATA=$(getvar SURICATA)
SURICATA=${SURICATA:-0}

ARCH=$(uname -m)   # aarch64 or x86_64, the two names the release uses
GWLBTUN_URL="https://github.com/aws-samples/aws-gateway-load-balancer-tunnel-handler/releases/download/latest/gwlbtun-linux-${ARCH}"
echo "arch=$ARCH health_port=$HEALTH_PORT suricata=$SURICATA"

# A little swap so dnf does not get OOM-killed while Suricata or other packages install.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=512 2>/dev/null
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi

echo "Installing nftables..."
command -v nft >/dev/null 2>&1 || dnf install -y nftables

echo "Forwarding sysctls..."
cat > /etc/sysctl.d/99-gwlb-inspection.conf <<'EOF'
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
EOF
sysctl -p /etc/sysctl.d/99-gwlb-inspection.conf

echo "Downloading gwlbtun..."
curl -fsSL --retry 5 --retry-delay 5 -o /usr/local/bin/gwlbtun "$GWLBTUN_URL"
chmod +x /usr/local/bin/gwlbtun

echo "Writing the tunnel hook..."
cat > /usr/local/bin/gwlb-hook.sh <<'EOF'
#!/bin/bash
# gwlbtun calls this with: $1 CREATE|DESTROY, $2 ingress interface (gwi-X),
# $3 egress interface (gwo-X), $4 GWLB endpoint ENI id in base 16.
MODE=$1
IN=$2
OUT=$3
# One routing table per endpoint tunnel; the interface name decides the number.
TABLE=$((1000 + $(printf '%s' "$IN" | cksum | cut -d' ' -f1) % 4000))

ip rule del iif "$IN" lookup "$TABLE" priority "$TABLE" 2>/dev/null
ip -6 rule del iif "$IN" lookup "$TABLE" priority "$TABLE" 2>/dev/null

if [ "$MODE" = "CREATE" ]; then
  echo "tunnel up: in=$IN out=$OUT eni=$4 table=$TABLE"
  sysctl -qw "net.ipv4.conf.${IN}.rp_filter=0"
  ip link set "$IN" up
  ip link set "$OUT" up
  ip rule add iif "$IN" lookup "$TABLE" priority "$TABLE"
  ip route replace default dev "$OUT" table "$TABLE"
  ip -6 rule add iif "$IN" lookup "$TABLE" priority "$TABLE"
  ip -6 route replace default dev "$OUT" table "$TABLE"
else
  echo "tunnel down: in=$IN out=$OUT"
  ip route flush table "$TABLE" 2>/dev/null
  ip -6 route flush table "$TABLE" 2>/dev/null
fi
exit 0
EOF
chmod +x /usr/local/bin/gwlb-hook.sh

echo "Writing the nftables ruleset..."
mkdir -p /etc/nftables
cat > /etc/nftables/gwlb-inspect.nft <<'EOF'
flush ruleset

table inet gwlb_inspect {
  chain forward {
    type filter hook forward priority 0; policy accept;

    # Deny list. Add rules above the final counter; `nft list ruleset` shows the hit counters.
    ip protocol tcp tcp dport { 23, 445, 3389 } counter drop comment "telnet, SMB, RDP"
    ip6 nexthdr tcp tcp dport { 23, 445, 3389 } counter drop comment "telnet, SMB, RDP (IPv6)"

    counter comment "forwarded"
  }
}
EOF

if [ "$SURICATA" = "1" ]; then
  echo "Installing Suricata..."
  if dnf install -y suricata; then
    # Inline mode: the forward chain hands the packets to Suricata through NFQUEUE and
    # `bypass` lets traffic through if Suricata is down, so a crash does not cut the path.
    sed -i 's|^    counter comment "forwarded"|    queue num 0 bypass\n    counter comment "forwarded"|' /etc/nftables/gwlb-inspect.nft
    cat > /etc/systemd/system/suricata-inline.service <<'EOF'
[Unit]
Description=Suricata inline (NFQUEUE 0)
After=network-online.target nftables.service
[Service]
ExecStart=/usr/sbin/suricata -q 0 -c /etc/suricata/suricata.yaml
Restart=always
[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable --now suricata-inline.service
  else
    echo "Suricata is not available from the repositories of this instance; continuing with nftables only."
  fi
fi

nft -f /etc/nftables/gwlb-inspect.nft
# Load the same ruleset at every boot.
cat > /etc/sysconfig/nftables.conf <<'EOF'
include "/etc/nftables/gwlb-inspect.nft"
EOF
systemctl enable nftables.service

echo "Starting gwlbtun..."
cat > /etc/systemd/system/gwlbtun.service <<EOF
[Unit]
Description=GWLB tunnel handler
After=network-online.target nftables.service
Wants=network-online.target
[Service]
ExecStart=/usr/local/bin/gwlbtun -c /usr/local/bin/gwlb-hook.sh -r /usr/local/bin/gwlb-hook.sh -p ${HEALTH_PORT} -s
Restart=always
RestartSec=2
LimitNOFILE=65536
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now gwlbtun.service
echo "Done."
