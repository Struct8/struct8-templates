#!/bin/bash
# Turns a fresh Ubuntu 24.04 instance into a self-hosted GitHub Actions runner for the
# Struct8 engine, for the gitops-engine-runner template. Runs once, as root, from
# cloud-init; the output goes to /var/log/cloud-init-output.log.
#
# It reads three values the template writes to /etc/struct8_env:
#   RUNNER_GITHUB_REPOSITORY  OWNER/REPOSITORY of the GitOps repository (set on the node)
#   RUNNER_LABEL              label the engine job asks for (set on the node)
#   AWS_SSM_PARAMETER_NAME_*  the SSM parameter that receives the registration token
#
# The machine reproduces what the engine relies on in GitHub's ubuntu-24.04 image: a
# "runner" user with passwordless sudo (pipeline.sh renames the host with sudo so the
# Terraform lock names the run, and release-locks.sh only releases a lock owned by
# runner@gh-<run>), plus the tools the engine and the generated Terraform call: git, jq,
# curl, unzip (setup-terraform extracts with it), the AWS CLI, the GitHub CLI, Node.js
# (the engine's .mjs scripts) and Docker with buildx (the ECR image seed builds with
# --provenance=false).
#
# It runs on amd64 and on arm64 (Graviton). On arm64, Docker builds for linux/amd64
# through QEMU: the ECR image seed runs a plain `docker build`, which builds for the
# machine it runs on, and the image has to be the one the hosted runner (amd64) builds,
# because a function or task that does not choose arm64 cannot start any other.
#
# Every download is pinned and checked against a SHA-256 before it runs: what is
# installed here runs in every job, with the job's OIDC token within reach. The versions
# are the ones on the hosted image of 2026-09-27, with one hash per architecture. The
# AWS CLI hashes were taken after checking each zip against the AWS CLI team's PGP
# signature (key FB5DB77F...4672475C).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

VARS=/etc/struct8_env
var() { sed -n "s/^$1=\"\(.*\)\"\$/\1/p" "$VARS" | head -n1; }
REPOSITORY=$(var RUNNER_GITHUB_REPOSITORY)
RUNNER_LABELS=$(var RUNNER_LABEL)
AWS_REGION=$(var REGION)
TOKEN_PARAMETER=$(sed -n 's/^AWS_SSM_PARAMETER_NAME_[^=]*="\(.*\)"$/\1/p' "$VARS" | head -n1)
RUNNER_LABELS=${RUNNER_LABELS:-struct8-engine}

RUNNER_VERSION=2.337.0
NODE_VERSION=22.23.3
GH_VERSION=2.101.0
AWSCLI_VERSION=2.37.4
DOCKER_KEY_FINGERPRINT=9DC858229FC7DD38854AE2D88D81803C0EBFCD88

# Each project spells the architecture its own way; dpkg's spelling is the one apt and
# the GitHub CLI use.
ARCH=$(dpkg --print-architecture)
case "$ARCH" in
  amd64)
    RUNNER_ARCH=x64 NODE_ARCH=x64 AWSCLI_ARCH=x86_64
    RUNNER_SHA256=70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613
    NODE_SHA256=df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de
    GH_SHA256=9bca2d1c16825f109907a23307628a2f0698fbf99662b73a5cf0b020293072b8
    AWSCLI_SHA256=0c59444563f4df735eeb5481f6165f95dae546c33761760d8be9855d5cfe2d12
    ;;
  arm64)
    RUNNER_ARCH=arm64 NODE_ARCH=arm64 AWSCLI_ARCH=aarch64
    RUNNER_SHA256=9b1dc70626422526e3c94767cf024896beb15da5342a3f4819bf2feac13e0393
    NODE_SHA256=a44aeb94849a299b22df10b9e622ec2f605c2183501bc40590705131de7c740f
    GH_SHA256=b57e8063f18862647c9d22727c32e9da1b963f8bf9db648fe123a6975695640f
    AWSCLI_SHA256=869aa72b9bdb931a9158d0cea9f4f0dc3f7aecf24ea1552da549b87907d28ab2
    ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

apt_get() { apt-get -o DPkg::Lock::Timeout=600 -y -q "$@"; }
fetch() {  # url sha256 file
  curl -fsSL --retry 5 --retry-all-errors --retry-delay 3 -o "$3" "$1"
  echo "$2  $3" | sha256sum --check --quiet -
}

# The runner sits in a private subnet and leaves through the NAT instance, which is
# created in the same apply and may still be configuring itself. Wait for the way out.
deadline=$((SECONDS + 900))
until curl -fsS --max-time 10 -o /dev/null https://github.com; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "No route to the internet after 15 minutes: check the NAT instance and the private route table." >&2
    exit 1
  fi
  sleep 10
done

tmp=$(mktemp -d)

apt_get update
apt_get install --no-install-recommends \
  ca-certificates curl git gnupg jq python3 sudo unzip xz-utils zip

install -m 0755 -d /etc/apt/keyrings
curl -fsSL --retry 5 --retry-all-errors -o /etc/apt/keyrings/docker.asc \
  https://download.docker.com/linux/ubuntu/gpg
gpg --show-keys --with-colons /etc/apt/keyrings/docker.asc \
  | grep -q "^fpr:*${DOCKER_KEY_FINGERPRINT}:" \
  || { echo "Docker's apt key does not have the expected fingerprint" >&2; exit 1; }
. /etc/os-release
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt_get update
apt_get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# amd64 builds on arm64 (see the header). The package registers its emulators with the
# F flag, which loads the emulator when it is registered, so it also runs inside the
# build's containers. Without the registration every amd64 build fails, so stop here.
DOCKER_PLATFORM=""
if [ "$ARCH" = arm64 ]; then
  apt_get install --no-install-recommends qemu-user-static
  systemctl restart systemd-binfmt
  [ -e /proc/sys/fs/binfmt_misc/qemu-x86_64 ] \
    || { echo "QEMU is not registered for x86_64, so Docker cannot build amd64 images." >&2; exit 1; }
  DOCKER_PLATFORM=linux/amd64
fi

fetch "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
  "$NODE_SHA256" "$tmp/node.tar.xz"
tar -xJf "$tmp/node.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  --exclude=CHANGELOG.md --exclude=LICENSE --exclude=README.md

fetch "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${ARCH}.tar.gz" \
  "$GH_SHA256" "$tmp/gh.tar.gz"
tar -xzf "$tmp/gh.tar.gz" -C "$tmp"
install -m 0755 "$tmp/gh_${GH_VERSION}_linux_${ARCH}/bin/gh" /usr/local/bin/gh

fetch "https://awscli.amazonaws.com/awscli-exe-linux-${AWSCLI_ARCH}-${AWSCLI_VERSION}.zip" \
  "$AWSCLI_SHA256" "$tmp/awscli.zip"
unzip -q "$tmp/awscli.zip" -d "$tmp"
"$tmp/aws/install" --update

id runner >/dev/null 2>&1 || useradd --create-home --shell /bin/bash runner
usermod -aG docker runner
echo 'runner ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/runner
chmod 0440 /etc/sudoers.d/runner

# Swap, as on the hosted image: without it, a plan that peaks above the instance's
# memory is killed by the kernel.
if [ ! -f /swapfile ] && fallocate -l 4G /swapfile && chmod 600 /swapfile \
    && mkswap /swapfile >/dev/null && swapon /swapfile; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# needrestart restarts services after a library update, and restarting the runner kills
# the job it is running.
mkdir -p /etc/needrestart/conf.d
echo '$nrconf{override_rc}{qr(^actions\.runner\.)} = 0;' \
  > /etc/needrestart/conf.d/struct8-runner.conf

RUNNER_DIR=/home/runner/actions-runner
fetch "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" \
  "$RUNNER_SHA256" "$tmp/runner.tar.gz"
install -d -o runner -g runner "$RUNNER_DIR" /home/runner/work
tar -xzf "$tmp/runner.tar.gz" -C "$RUNNER_DIR"
chown -R runner:runner "$RUNNER_DIR"
"$RUNNER_DIR/bin/installdependencies.sh"

# An unset repository (the template ships OWNER/REPOSITORY) leaves RUNNER_URL empty, and
# the registration service then refuses to start instead of registering somewhere wrong.
RUNNER_URL=""
if [[ "$REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] && [ "$REPOSITORY" != "OWNER/REPOSITORY" ]; then
  RUNNER_URL="https://github.com/${REPOSITORY}"
fi

install -d -m 0755 /opt/struct8-runner
printf "RUNNER_URL='%s'\nRUNNER_LABELS='%s'\nTOKEN_PARAMETER='%s'\nAWS_REGION='%s'\nDOCKER_PLATFORM='%s'\n" \
  "$RUNNER_URL" "$RUNNER_LABELS" "$TOKEN_PARAMETER" "$AWS_REGION" "$DOCKER_PLATFORM" \
  > /opt/struct8-runner/runner.conf

cat > /opt/struct8-runner/job-started.sh <<'HOOK'
#!/bin/bash
# Before every job (ACTIONS_RUNNER_HOOK_JOB_STARTED). A non-zero exit fails the job, so
# nothing here may fail.
rm -rf /home/runner/.aws /home/runner/.docker/config.json /home/runner/.gitconfig \
  /home/runner/.config/git /home/runner/.config/gh 2>/dev/null
sudo -n hostname -F /etc/hostname 2>/dev/null
exit 0
HOOK

cat > /opt/struct8-runner/job-completed.sh <<'HOOK'
#!/bin/bash
# After every job (ACTIONS_RUNNER_HOOK_JOB_COMPLETED). Removes what the engine leaves on
# the machine: the temporary AWS credentials that scripts/auth/aws.sh writes to ~/.aws,
# the ECR login in ~/.docker, git configuration, the work folder (workspaces, downloaded
# actions, tool cache) and Docker images and build cache. The runner empties
# _work/_temp itself. This cleans up after the engine; it cannot contain a job that
# wants to stay, since a job runs as this user, with sudo.
rm -rf /home/runner/.aws /home/runner/.docker/config.json /home/runner/.gitconfig \
  /home/runner/.config/git /home/runner/.config/gh /home/runner/.terraform.d 2>/dev/null
sudo -n hostname -F /etc/hostname 2>/dev/null
find /home/runner/work -mindepth 1 -maxdepth 1 ! -name _temp \
  -exec sudo -n rm -rf {} + 2>/dev/null
timeout 600 docker system prune --all --force --volumes >/dev/null 2>&1
exit 0
HOOK

cat > /opt/struct8-runner/register.sh <<'REGISTER'
#!/bin/bash
# Registers the runner with the GitOps repository and starts it as a service.
# Usage: sudo /opt/struct8-runner/register.sh <registration-token> [OWNER/REPOSITORY]
set -euo pipefail
token="${1:?usage: register.sh <registration-token> [OWNER/REPOSITORY]}"
. /opt/struct8-runner/runner.conf
url="$RUNNER_URL"
[ -n "${2:-}" ] && url="https://github.com/$2"
[ -n "$url" ] || { echo "No repository: pass OWNER/REPOSITORY as the second argument." >&2; exit 1; }
cd /home/runner/actions-runner
imds=$(curl -fsS -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
  http://169.254.169.254/latest/api/token)
instance=$(curl -fsS -H "X-aws-ec2-metadata-token: $imds" \
  http://169.254.169.254/latest/meta-data/instance-id)
sudo -u runner ./config.sh --unattended --replace --url "$url" --token "$token" \
  --name "struct8-engine-$instance" --labels "$RUNNER_LABELS" --work /home/runner/work
grep -q '^ACTIONS_RUNNER_HOOK_JOB_STARTED=' .env 2>/dev/null || cat >> .env <<'ENV'
ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/struct8-runner/job-started.sh
ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/opt/struct8-runner/job-completed.sh
ENV
grep -q '^LANG=' .env || echo 'LANG=C.UTF-8' >> .env
# The platform every job's `docker build` targets; empty on amd64.
if [ -n "${DOCKER_PLATFORM:-}" ]; then
  grep -q '^DOCKER_DEFAULT_PLATFORM=' .env 2>/dev/null \
    || echo "DOCKER_DEFAULT_PLATFORM=$DOCKER_PLATFORM" >> .env
fi
./svc.sh install runner
./svc.sh start
REGISTER

cat > /opt/struct8-runner/wait-for-token.sh <<'WAIT'
#!/bin/bash
# Runs as a service until the runner is registered. Every 30 seconds it reads the SSM
# parameter; the template ships a placeholder with hyphens, and a GitHub registration
# token has only letters and digits, so anything else is "not pasted yet". A token that
# registration refused (expired, wrong repository) is not tried again.
set -uo pipefail
. /opt/struct8-runner/runner.conf
if [ -z "$RUNNER_URL" ]; then
  echo "RUNNER_GITHUB_REPOSITORY was not set on the runner node, so the repository is unknown." >&2
  echo "Register by hand: sudo /opt/struct8-runner/register.sh <token> OWNER/REPOSITORY" >&2
  exit 0
fi
refused=""
while [ ! -f /home/runner/actions-runner/.runner ]; do
  value=$(aws ssm get-parameter --region "$AWS_REGION" --name "$TOKEN_PARAMETER" \
    --with-decryption --query Parameter.Value --output text 2>/dev/null) || value=""
  if [[ "$value" =~ ^[A-Za-z0-9]{20,}$ ]] && [ "$value" != "$refused" ]; then
    if /opt/struct8-runner/register.sh "$value"; then
      echo "Runner registered with $RUNNER_URL."
      exit 0
    fi
    refused="$value"
    echo "Registration refused this token; waiting for a new one in $TOKEN_PARAMETER." >&2
  fi
  sleep 30
done
WAIT

cat > /etc/systemd/system/struct8-runner-register.service <<'UNIT'
[Unit]
Description=Registers the GitHub Actions runner once the token is in SSM
After=network-online.target
Wants=network-online.target
ConditionPathExists=!/home/runner/actions-runner/.runner

[Service]
Type=simple
ExecStart=/opt/struct8-runner/wait-for-token.sh
Restart=no

[Install]
WantedBy=multi-user.target
UNIT

chmod 0755 /opt/struct8-runner/*.sh
rm -rf "$tmp"

systemctl daemon-reload
systemctl enable --now struct8-runner-register.service
echo "Runner installed. Paste the registration token into SSM parameter '${TOKEN_PARAMETER}' to register it."
