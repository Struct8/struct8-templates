#!/bin/bash
# Instance Info web page for Amazon Linux 2023.
#
# Serves a styled HTML page that reports the EC2 instance's own metadata, read
# LIVE from the Instance Metadata Service v2 (IMDSv2, token-required) on every
# request. Placed behind a load balancer, refreshing the page shows a different
# instance each time -- id, AZ, subnet, private IP, instance type, disks, etc.
#
# Reusable across templates: it takes no arguments and hard-codes nothing about
# the environment. Point an EC2/Launch Template user_data field at this file.
#
# Listens on port 80.
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

echo "Installing Apache (httpd)..."
dnf install -y httpd

# The page is generated per-request by a CGI script so a browser refresh always
# shows fresh metadata (and, behind a load balancer, a different instance).
cat > /var/www/cgi-bin/info << 'CGI_EOF'
#!/bin/bash
# Reads this instance's metadata via IMDSv2 and prints an HTML page.

# --- IMDSv2: get a session token first (this is what makes it "v2 secure") ---
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")

# Helper: read one metadata path with the token; prints empty string if absent.
meta() {
  curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    "http://169.254.169.254/latest/meta-data/$1"
}

INSTANCE_ID=$(meta instance-id)
INSTANCE_TYPE=$(meta instance-type)
AMI_ID=$(meta ami-id)
HOSTNAME_LOCAL=$(meta local-hostname)
PRIVATE_IP=$(meta local-ipv4)
PUBLIC_IP=$(meta public-ipv4)
AZ=$(meta placement/availability-zone)
AZ_ID=$(meta placement/availability-zone-id)
REGION=$(meta placement/region)
MAC=$(meta network/interfaces/macs/ | head -n1 | tr -d '/')
VPC_ID=$(meta "network/interfaces/macs/$MAC/vpc-id")
SUBNET_ID=$(meta "network/interfaces/macs/$MAC/subnet-id")
SECURITY_GROUPS=$(meta security-groups | tr '\n' ' ')
ARCH=$(uname -m)
KERNEL=$(uname -r)
UPTIME=$(uptime -p)

# Disks and memory come from the OS, not from IMDS.
DISKS=$(lsblk -o NAME,SIZE,TYPE,MOUNTPOINT --noheadings 2>/dev/null | sed 's/^/    /')
ROOT_DISK=$(df -h / | awk 'NR==2 {print $2" total, "$3" used, "$4" free ("$5")"}')
MEM_TOTAL=$(free -h | awk '/^Mem:/ {print $2}')
MEM_USED=$(free -h | awk '/^Mem:/ {print $3}')
CPU_COUNT=$(nproc)
NOW=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

# CGI header, then the HTML body.
echo "Content-type: text/html"
echo ""

cat << HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EC2 Instance Info</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(1200px 600px at 20% -10%, #1e3a5f 0%, #0b1220 55%, #070b14 100%);
      color: #e6edf3; display: flex; align-items: center; justify-content: center; padding: 32px;
    }
    .card {
      width: 100%; max-width: 880px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px 36px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.45); backdrop-filter: blur(6px);
    }
    .head { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: #3fb950; box-shadow: 0 0 12px #3fb950; }
    h1 { font-size: 22px; margin: 0; font-weight: 650; letter-spacing: .2px; }
    .sub { color: #8b98a5; font-size: 13px; margin: 2px 0 24px 28px; }
    .hero {
      display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 26px;
    }
    .chip {
      background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff;
      padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .chip.alt { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
    .chip.az  { background: linear-gradient(135deg, #0891b2, #0e7490); }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 28px; }
    .row { display: flex; flex-direction: column; gap: 3px; padding: 12px 14px;
      background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
    .k { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: #8b98a5; }
    .v { font-size: 15px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
    .v.empty { color: #6b7684; font-style: italic; }
    .full { grid-column: 1 / -1; }
    pre { margin: 0; font-size: 13px; line-height: 1.5; white-space: pre-wrap; color: #c9d5e0; }
    .foot { margin-top: 24px; display: flex; justify-content: space-between; align-items: center;
      color: #6b7684; font-size: 12px; flex-wrap: wrap; gap: 8px; }
    .refresh { color: #58a6ff; text-decoration: none; font-weight: 600; }
    .refresh:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="head"><span class="dot"></span><h1>EC2 Instance Info</h1></div>
    <div class="sub">Live metadata read via IMDSv2 &middot; refresh to hit another instance behind the load balancer</div>

    <div class="hero">
      <span class="chip">$INSTANCE_ID</span>
      <span class="chip alt">$INSTANCE_TYPE</span>
      <span class="chip az">$AZ</span>
    </div>

    <div class="grid">
      <div class="row"><span class="k">Availability Zone</span><span class="v">${AZ:-n/a}</span></div>
      <div class="row"><span class="k">AZ ID</span><span class="v">${AZ_ID:-n/a}</span></div>
      <div class="row"><span class="k">Region</span><span class="v">${REGION:-n/a}</span></div>
      <div class="row"><span class="k">Instance Type</span><span class="v">${INSTANCE_TYPE:-n/a}</span></div>
      <div class="row"><span class="k">Private IPv4</span><span class="v">${PRIVATE_IP:-n/a}</span></div>
      <div class="row"><span class="k">Public IPv4</span><span class="v ${PUBLIC_IP:+ }${PUBLIC_IP:-empty}">${PUBLIC_IP:-none (private subnet)}</span></div>
      <div class="row"><span class="k">VPC</span><span class="v">${VPC_ID:-n/a}</span></div>
      <div class="row"><span class="k">Subnet</span><span class="v">${SUBNET_ID:-n/a}</span></div>
      <div class="row"><span class="k">Local Hostname</span><span class="v">${HOSTNAME_LOCAL:-n/a}</span></div>
      <div class="row"><span class="k">MAC</span><span class="v">${MAC:-n/a}</span></div>
      <div class="row"><span class="k">AMI</span><span class="v">${AMI_ID:-n/a}</span></div>
      <div class="row"><span class="k">Architecture</span><span class="v">$ARCH</span></div>
      <div class="row"><span class="k">vCPUs</span><span class="v">$CPU_COUNT</span></div>
      <div class="row"><span class="k">Memory</span><span class="v">$MEM_USED / $MEM_TOTAL</span></div>
      <div class="row"><span class="k">Root Disk</span><span class="v">$ROOT_DISK</span></div>
      <div class="row"><span class="k">Kernel</span><span class="v">$KERNEL</span></div>
      <div class="row full"><span class="k">Security Groups</span><span class="v">${SECURITY_GROUPS:-n/a}</span></div>
      <div class="row full"><span class="k">Block Devices</span><pre>$DISKS</pre></div>
    </div>

    <div class="foot">
      <span>Uptime: $UPTIME</span>
      <a class="refresh" href="/cgi-bin/info">&#8635; Refresh</a>
      <span>Rendered $NOW</span>
    </div>
  </div>
</body>
</html>
HTML
CGI_EOF

chmod +x /var/www/cgi-bin/info

# Make "/" serve the CGI page instead of the default Apache test page.
cat > /etc/httpd/conf.d/instance-info.conf << 'CONF_EOF'
# Redirect the site root to the live info CGI.
RedirectMatch ^/$ /cgi-bin/info
CONF_EOF

echo "Enabling and starting Apache..."
systemctl enable --now httpd

echo "Done. Instance info page is live on port 80 (root redirects to /cgi-bin/info)."
