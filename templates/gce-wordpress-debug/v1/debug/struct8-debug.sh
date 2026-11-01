#!/bin/sh
# Struct8 debug access for Compute Engine (Linux).
# Pulls one command at a time from a Pub/Sub subscription, runs it when the level in the
# struct8-debug-level metadata key allows it, publishes the output and then acknowledges.
# Needs sh, coreutils, sed and curl. Environment: STRUCT8_DEBUG_SUBSCRIPTION and
# STRUCT8_DEBUG_OUTPUT_TOPIC, as projects/<project>/subscriptions|topics/<name>.
#
# The program updates itself from the struct8-debug-program metadata key: when the key holds
# another program, it writes that program over this file and runs it in its place, so an apply
# with a new version takes effect without a reboot.

VERSION=1.0.1-lab-repo

MD=http://metadata.google.internal/computeMetadata/v1
API=https://pubsub.googleapis.com/v1
SUB="$STRUCT8_DEBUG_SUBSCRIPTION"
OUT="$STRUCT8_DEBUG_OUTPUT_TOPIC"
STATE=/var/lib/struct8-debug
# Another state folder, for the test that runs this program.
[ -n "$STRUCT8_DEBUG_STATE" ] && STATE="$STRUCT8_DEBUG_STATE"
# Seconds between two reads of the struct8-debug-program key.
UPDATE_EVERY=60
[ -n "$STRUCT8_DEBUG_UPDATE_EVERY" ] && UPDATE_EVERY="$STRUCT8_DEBUG_UPDATE_EVERY"
MAX_OUTPUT=7000000
DIAGNOSTICS="ping dig nslookup traceroute ss netstat ip route hostname"
PROGRAM="$0"

mkdir -p "$STATE"
touch "$STATE/seen"

md() { curl -sf --max-time 10 -H 'Metadata-Flavor: Google' "$MD/$1"; }

# The value of a JSON string key in one line of JSON.
field() { sed -n "s/.*\"$1\" *: *\"\([^\"]*\)\".*/\1/p" | sed 's/\\u003d/=/g'; }

rank() { case "$1" in probes) echo 1 ;; diagnostics) echo 2 ;; shell) echo 3 ;; *) echo 0 ;; esac; }

matches() { printf '%s\n' "$2" | grep -Eq "$1"; }

api() { curl -sS --max-time 70 -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data-binary "$2" "$API/$1"; }

# The level key gone means the component was removed: the program removes itself. curl -f
# exits with 22 on an HTTP error, which the metadata server returns as 404 for a missing key.
removed() {
  curl -sf -o /dev/null --max-time 10 -H 'Metadata-Flavor: Google' "$MD/instance/attributes/struct8-debug-level"
  [ $? -eq 22 ]
}

uninstall() {
  echo "struct8-debug: the struct8-debug-level key is gone; removing the debug program" >&2
  if command -v systemctl >/dev/null 2>&1; then
    systemctl disable struct8-debug.service >/dev/null 2>&1
    rm -f /etc/systemd/system/struct8-debug.service
    systemctl daemon-reload >/dev/null 2>&1
  fi
  rm -f /etc/struct8-debug.env
  rm -rf "$STATE"
  exit 0
}

# Runs the program in the struct8-debug-program key in place of this one, when the key holds a
# different program that sh can parse. A missing key, a failed read or a program with a syntax
# error leaves this one running.
LAST_UPDATE_CHECK=0
update() {
  now=$(date +%s)
  [ $((now - LAST_UPDATE_CHECK)) -ge "$UPDATE_EVERY" ] || return 0
  LAST_UPDATE_CHECK=$now
  md instance/attributes/struct8-debug-program > "$STATE/program.new" || return 0
  [ -s "$STATE/program.new" ] || return 0
  [ "$(head -n 1 "$STATE/program.new")" = "#!/bin/sh" ] || return 0
  [ "$(cksum < "$STATE/program.new")" = "$(cksum < "$PROGRAM")" ] && return 0
  if ! sh -n "$STATE/program.new" 2>/dev/null; then
    echo "struct8-debug: the program in the struct8-debug-program key does not parse; keeping $VERSION" >&2
    return 0
  fi
  cp "$STATE/program.new" "$PROGRAM" || return 0
  echo "struct8-debug: running the program in the struct8-debug-program key in place of $VERSION" >&2
  exec /bin/sh "$PROGRAM"
}

refuse() { echo "struct8: $1" > "$OUTF"; EXIT=$2; }

run_probe() {
  t=$(printf '%s' "$RESP" | field target)
  p=$(printf '%s' "$RESP" | field port)
  [ -n "$p" ] || p=443
  matches '^[A-Za-z0-9._-]{1,253}$' "$t" || { refuse "the probe target must be a host name or an IP address" 2; return; }
  matches '^[0-9]{1,5}$' "$p" || { refuse "the probe port must be a number" 2; return; }
  {
    echo '--- resolve ---'
    getent hosts "$t" || echo "no DNS answer"
    echo '--- icmp ---'
    if command -v ping >/dev/null 2>&1; then
      ping -c 3 -W 2 "$t" || echo "no ICMP reply (often filtered, not conclusive)"
    else
      echo "ping is not installed on this VM"
    fi
    echo '--- tcp ---'
    if command -v bash >/dev/null 2>&1; then
      if timeout 5 bash -c 'exec 3<>/dev/tcp/"$1"/"$2"' _ "$t" "$p" 2>/dev/null; then echo "port $p open"; else echo "port $p closed or filtered"; fi
    elif command -v nc >/dev/null 2>&1; then
      if nc -z -w 5 "$t" "$p" 2>/dev/null; then echo "port $p open"; else echo "port $p closed or filtered"; fi
    else
      echo "the TCP test needs bash or nc, and this VM has neither"
    fi
  } > "$OUTF" 2>&1
  EXIT=0
}

run_diagnostics() {
  c=$(printf '%s' "$RESP" | field command)
  a=$(printf '%s' "$RESP" | field args)
  case " $DIAGNOSTICS " in *" $c "*) ;; *) refuse "'$c' is not on the diagnostics list: $DIAGNOSTICS" 2; return ;; esac
  if [ -n "$a" ] && ! matches '^[A-Za-z0-9 ._:/=@,+-]{0,200}$' "$a"; then
    refuse "the arguments may hold only letters, digits, spaces and . _ : / = @ , + -" 2; return
  fi
  # ip, route and hostname are read-only only without these operands.
  for tok in $a; do
    case "$tok" in add|del|delete|set|flush|change|replace|append|update|attach|up|down|exec|-b|-batch|-force)
      refuse "operand '$tok' writes; diagnostics is read-only" 2; return ;;
    esac
  done
  if [ "$c" = hostname ]; then
    for tok in $a; do
      case "$tok" in -a|-A|-d|-f|-i|-I|-s|-y|--all-fqdns|--all-ip-addresses|--domain|--fqdn|--ip-address|--short|--long|--alias|--nis) ;;
        *) refuse "hostname takes no name here; diagnostics is read-only" 2; return ;;
      esac
    done
  fi
  command -v "$c" >/dev/null 2>&1 || { refuse "$c is not installed on this VM" 127; return; }
  timeout 20 "$c" $a > "$OUTF" 2>&1
  EXIT=$?
}

run_shell() {
  printf '%s' "$RESP" | field data | base64 -d > "$STATE/script" 2>/dev/null || { refuse "the command is not valid base64" 2; return; }
  timeout 300 sh "$STATE/script" > "$OUTF" 2>&1
  EXIT=$?
}

publish() {
  size=$(wc -c < "$OUTF")
  truncated=false
  [ "$size" -gt "$MAX_OUTPUT" ] && truncated=true
  {
    printf '{"messages":[{"data":"'
    head -c "$MAX_OUTPUT" "$OUTF" | base64 | tr -d '\n'
    printf '","attributes":{"request":"%s","instance":"%s","exit":"%s","truncated":"%s","version":"%s"}}]}' "$REQ" "$INSTANCE" "$EXIT" "$truncated" "$VERSION"
  } > "$STATE/publish.json"
  answer=$(api "$OUT:publish" @"$STATE/publish.json") || return 1
  case "$answer" in *messageIds*) return 0 ;; esac
  echo "struct8-debug: publish failed: $answer" >&2
  return 1
}

acknowledge() { api "$SUB:acknowledge" "{\"ackIds\":[\"$ACK\"]}" > /dev/null; }

handle() {
  MSG_ID=$(printf '%s' "$RESP" | field messageId)
  OUTF="$STATE/output"
  # A command delivered again after its output went out is acknowledged, not run again.
  # One whose output did not go out has the output published again.
  if grep -qx "$MSG_ID" "$STATE/seen"; then
    if [ "$(cat "$STATE/last.id" 2>/dev/null)" = "$MSG_ID" ] && [ -f "$STATE/last.out" ]; then
      OUTF="$STATE/last.out"
      REQ=$(cat "$STATE/last.request")
      EXIT=$(cat "$STATE/last.exit")
      publish || return
    fi
    acknowledge
    return
  fi

  REQ=$(printf '%s' "$RESP" | field request)
  matches '^[A-Za-z0-9._-]{1,64}$' "$REQ" || REQ=unknown
  mode=$(printf '%s' "$RESP" | field mode)
  granted=$(md instance/attributes/struct8-debug-level)
  if [ "$(rank "$mode")" -eq 0 ]; then
    refuse "unknown mode '$mode'" 2
  elif [ "$(rank "$mode")" -gt "$(rank "$granted")" ]; then
    refuse "this VM grants the $granted level, below $mode" 3
  else
    case "$mode" in
      probes) run_probe ;;
      diagnostics) run_diagnostics ;;
      shell) run_shell ;;
    esac
  fi

  echo "$MSG_ID" >> "$STATE/seen"
  tail -n 200 "$STATE/seen" > "$STATE/seen.new" && mv "$STATE/seen.new" "$STATE/seen"
  cp "$OUTF" "$STATE/last.out"
  printf '%s' "$MSG_ID" > "$STATE/last.id"
  printf '%s' "$REQ" > "$STATE/last.request"
  printf '%s' "$EXIT" > "$STATE/last.exit"
  publish || return
  acknowledge
}

# On the first boot the permissions take about 30 seconds to reach Pub/Sub: wait longer
# after each failure, up to five minutes.
DELAY=5
pause() {
  sleep "$DELAY"
  DELAY=$((DELAY * 2))
  [ "$DELAY" -gt 300 ] && DELAY=300
}

INSTANCE=$(md instance/name)
while :; do
  removed && uninstall
  update
  TOKEN=$(md instance/service-accounts/default/token | tr -d '\n' | field access_token)
  if [ -z "$TOKEN" ]; then echo "struct8-debug: no token from the metadata server" >&2; pause; continue; fi
  RESP=$(api "$SUB:pull" '{"maxMessages":1}' | tr -d '\n')
  case "$RESP" in
    *'"error"'*) echo "struct8-debug: pull failed: $RESP" >&2; pause; continue ;;
  esac
  DELAY=5
  ACK=$(printf '%s' "$RESP" | field ackId)
  if [ -z "$ACK" ]; then sleep 1; continue; fi
  handle
done
