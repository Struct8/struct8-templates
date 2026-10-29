#!/bin/bash
# Uptime Kuma via Docker on AWS (user_data), Google Cloud (metadata_startup_script) and Azure
# (custom_data). Picks the package manager of the image it runs on:
#   apt-get  Debian, Ubuntu
#   dnf      Amazon Linux 2023, AlmaLinux, Rocky Linux, RHEL, Fedora
#   tdnf     Azure Linux
# Runs Uptime Kuma on port 3001 and restarts it on reboot. Safe to run again: Google Cloud
# runs a startup script on every boot, while AWS and Azure run it once.
set -uo pipefail
LOGFILE="/var/log/user-data.log"
exec >>"$LOGFILE" 2>&1
set -x

have() { command -v "$1" >/dev/null 2>&1; }

install_docker_apt() {
  export DEBIAN_FRONTEND=noninteractive
  # A new Ubuntu or Debian image may still hold the dpkg lock for its first updates.
  apt-get -o DPkg::Lock::Timeout=180 update -y &&
    apt-get -o DPkg::Lock::Timeout=180 install -y docker.io
}

install_docker_dnf() {
  # Amazon Linux and Fedora have the `docker` package; AlmaLinux, Rocky Linux and RHEL do not.
  dnf install -y docker && return 0
  cat >/etc/yum.repos.d/docker-ce.repo <<'EOF'
[docker-ce-stable]
name=Docker CE Stable
baseurl=https://download.docker.com/linux/rhel/$releasever/$basearch/stable
enabled=1
gpgcheck=1
gpgkey=https://download.docker.com/linux/rhel/gpg
EOF
  dnf install -y docker-ce
}

install_docker_tdnf() {
  tdnf install -y moby-engine moby-cli
}

install_docker() {
  have docker && return 0
  # Retry to ride out a network path that is briefly not ready at first boot.
  for attempt in 1 2 3 4 5; do
    if have apt-get; then
      install_docker_apt && return 0
    elif have dnf; then
      install_docker_dnf && return 0
    elif have tdnf; then
      install_docker_tdnf && return 0
    else
      echo "No supported package manager (apt-get, dnf, tdnf) on this image."
      return 2
    fi
    echo "Docker install failed (attempt $attempt), retrying in 10s..."
    sleep 10
  done
  return 1
}

echo "Installing Docker..."
install_docker || { echo "Docker was not installed."; exit 1; }

systemctl enable docker
systemctl start docker

echo "Waiting for the Docker daemon..."
for _ in $(seq 1 30); do
  docker info >/dev/null 2>&1 && break
  sleep 2
done

echo "Running Uptime Kuma..."
if docker ps -a --format '{{.Names}}' | grep -qx uptime-kuma; then
  docker start uptime-kuma
else
  docker run -d \
    --name uptime-kuma \
    --restart unless-stopped \
    -p 3001:3001 \
    -v uptime-kuma:/app/data \
    louislam/uptime-kuma:1
fi

echo "Done. Uptime Kuma is starting on port 3001."
