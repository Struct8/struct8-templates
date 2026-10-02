#!/bin/bash
# Uptime Kuma on Amazon Linux 2023 via Docker.
# Boots Docker, runs louislam/uptime-kuma on port 3001, and restarts it on reboot.
#
# This instance is a t3.nano (512 MB) in a PRIVATE subnet, reaching the internet only through the
# NAT instance. Two things that bit this before are handled here:
#   1. OOM: `dnf update` + `dnf install docker` peaks over what 512 MB has free, and the kernel
#      OOM-kills dnf mid-install (seen as "Killed" in the log), so Docker never installs and the
#      container never starts -- nothing then listens on 3001 and the NAT's port-forward lands on a
#      dead target (connection refused). A temporary swapfile gives dnf the headroom. We also skip
#      the heavy `dnf update` and just install docker.
#   2. Docker not ready yet: wait for the daemon before `docker run`.
set -uo pipefail
LOGFILE="/var/log/user-data.log"
exec >"$LOGFILE" 2>&1
set -x

# A temporary 1G swapfile so dnf is not OOM-killed on a 512 MB instance. Removed afterwards; on a
# bigger instance it simply goes unused.
if ! swapon --show | grep -q /swapfile; then
  echo "Adding a temporary 1G swapfile..."
  fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
fi

echo "Installing Docker..."
# No `dnf update` -- it is heavy and unnecessary just to get Docker, and it was part of what pushed
# the nano into OOM. Retry to ride out a NAT path that is briefly not ready at first boot.
for attempt in 1 2 3 4 5; do
  if dnf install -y docker; then break; fi
  echo "dnf install docker failed (attempt $attempt), retrying in 5s..."
  sleep 5
done
systemctl enable docker
systemctl start docker

# The swap was only needed for the install; drop it so nothing lingers.
swapoff /swapfile 2>/dev/null && rm -f /swapfile

echo "Waiting for the Docker daemon..."
for i in $(seq 1 30); do
  if docker info >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "Running Uptime Kuma..."
docker rm -f uptime-kuma 2>/dev/null || true
# Image tag: `2` is the project's recommended tag -- the latest of the v2 series, which gets
# the fixes and security updates. NOT `latest` (deprecated, still points at the unmaintained v1,
# which makes the UI show an "outdated version" warning) and NOT `1` (the v1 series, also no longer
# maintained). `2` tracks v2 without ever jumping to a future major that could break.
docker run -d \
  --name uptime-kuma \
  --restart unless-stopped \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  louislam/uptime-kuma:2

# Verify the container is actually up, rather than trust: a dead container is exactly what makes
# the NAT port-forward answer "connection refused".
sleep 3
if docker ps --filter name=uptime-kuma --filter status=running | grep -q uptime-kuma; then
  echo "Done. Uptime Kuma is running on port 3001."
else
  echo "ERROR: the uptime-kuma container is NOT running. Recent docker state:" >&2
  docker ps -a >&2
  exit 1
fi
