#!/bin/bash
# Uptime Kuma on Amazon Linux 2023 via Docker.
# Boots Docker, runs louislam/uptime-kuma on port 3001, and restarts it on reboot.
LOGFILE="/var/log/user-data.log"
exec >$LOGFILE 2>&1

echo "Updating the system..."
dnf update -y

echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

echo "Running Uptime Kuma..."
docker run -d \
  --name uptime-kuma \
  --restart unless-stopped \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  louislam/uptime-kuma:1

echo "Done. Uptime Kuma is starting on port 3001."
