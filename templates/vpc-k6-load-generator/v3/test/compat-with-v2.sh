#!/bin/bash
# Proves that v3 runs a test exactly like v2 when no scenario is chosen.
#
# It pulls the files the two bootstraps write (the k6 test script and
# /opt/k6/run.sh) out of their heredocs, then runs each run.sh in a Linux
# container with a fake `docker` that prints the command it was given instead of
# starting k6. Each case compares the two commands, the k6 script handed over
# on stdin included.
#
# Usage, from the repository root, with Docker:
#   bash templates/vpc-k6-load-generator/v3/test/compat-with-v2.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HERE/../.."
IMAGE="${COMPAT_IMAGE:-bash:5}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# Docker Desktop on Windows (Git Bash) needs the Windows form of a mount source.
hostpath() { if command -v cygpath >/dev/null; then cygpath -m "$1"; else echo "$1"; fi; }

extract() { # <bootstrap> <heredoc tag> -> the heredoc body
  awk -v tag="$2" 'index($0, "<<'"'"'" tag "'"'"'") { f = 1; next } f && $0 == tag { f = 0 } f' "$1"
}
for v in v2 v3; do
  mkdir -p "$WORK/$v"
  extract "$ROOT/$v/user_data/k6-bootstrap.sh" K6EOF > "$WORK/$v/load-test.js"
  extract "$ROOT/$v/user_data/k6-bootstrap.sh" RUNEOF > "$WORK/$v/run.sh"
done
cp "$ROOT/v3/scenarios/wordpress.js" "$WORK/v3/wordpress.js"

# Runs one run.sh. $1 = v2|v3, $2 = node environment file content, then any
# NAME=value pairs exported for the call. Prints the docker command line by line.
run_case() {
  local version="$1" nodeenv="$2"; shift 2
  printf '%s\n' "$nodeenv" > "$WORK/struct8_env"
  docker run --rm -i \
    -v "$(hostpath "$WORK/$version"):/src:ro" -v "$(hostpath "$WORK/struct8_env"):/etc/struct8_env:ro" \
    "$IMAGE" bash -c '
      mkdir -p /opt/k6/scripts /fakebin
      cp /src/load-test.js /opt/k6/scripts/load-test.js
      [ -f /src/wordpress.js ] && cp /src/wordpress.js /opt/k6/scripts/wordpress.js
      echo linux/arm64 > /opt/k6/platform
      cat > /fakebin/docker <<"EOF"
#!/bin/bash
for a in "$@"; do echo "arg: $a"; done
echo "stdin: $(md5sum | cut -d" " -f1)"
EOF
      chmod +x /fakebin/docker
      env PATH=/fakebin:$PATH "$@" bash /src/run.sh 2>&1
    ' _ "$@"
}

FAIL=0
same() { # <name> <node env> [NAME=value ...]
  local name="$1" nodeenv="$2"; shift 2
  local a b
  a="$(run_case v2 "$nodeenv" "$@" | grep -E '^(arg|stdin):')"
  b="$(run_case v3 "$nodeenv" "$@" | grep -E '^(arg|stdin):')"
  if [ -n "$a" ] && [ "$a" = "$b" ]; then echo "PASS  $name"; else
    echo "FAIL  $name"; diff <(echo "$a") <(echo "$b") || true; FAIL=1; fi
}
expect() { # <name> <pattern> <v3 node env> [NAME=value ...]
  local name="$1" pattern="$2" nodeenv="$3"; shift 3
  # Captured whole first: a refused run exits non-zero, and that is a result here.
  local out
  out="$(run_case v3 "$nodeenv" "$@" || true)"
  if grep -qE -- "$pattern" <<< "$out"; then echo "PASS  $name"; else
    echo "FAIL  $name (no line matches: $pattern)"; sed 's/^/      /' <<< "$out"; FAIL=1; fi
}

echo "== v3 without a scenario runs what v2 runs"
same "defaults, target from the node" 'TARGET_URL="http://alb.example/"'
same "Hub load test: POST with a fixed rate" 'TARGET_URL="http://alb.example/loadtest?ms=80"
METHOD="POST"
RPS="50"
VUS="40"
DURATION="2m"'
same "curve and body" 'TARGET_URL="http://alb.example/"
METHOD="POST"
BODY="{\"a\":1}"
STAGES="[{\"target\":5,\"duration\":\"10s\"}]"
START_VUS="1"'
same "target given only for the call" '' TARGET_URL=http://other.example/ VUS=3
same "K6_SCENARIO=url on the node" 'TARGET_URL="http://alb.example/"
K6_SCENARIO="url"'

echo "== what v3 adds"
expect "wordpress scenario hands k6 its knobs" 'arg: PEAK=20' \
  'TARGET_URL="https://wp.example/"
K6_SCENARIO="wordpress"
PROFILE="steps"
PEAK="20"'
expect "wordpress scenario runs wordpress.js" "stdin: $(md5sum < "$WORK/v3/wordpress.js" | cut -d' ' -f1)" \
  'TARGET_URL="https://wp.example/"
K6_SCENARIO="wordpress"'
expect "a value set for the call wins over the node" 'arg: TARGET_URL=http://other.example/' \
  'TARGET_URL="http://alb.example/"' TARGET_URL=http://other.example/
expect "unknown scenario is refused" 'Unknown K6_SCENARIO=bogus' \
  'TARGET_URL="http://alb.example/"
K6_SCENARIO="bogus"'
expect "missing target is refused" 'TARGET_URL is required' ''

exit $FAIL
