#!/usr/bin/env bash
# Build the production export and start the repo's own preview server on a free
# loopback port. Prints `BASE_URL=http://127.0.0.1:<port>` on success.
# Usage: .cursor/skills/verify-luinbytes-dev/bin/launch.sh
#   SKIP_BUILD=1  reuse an existing out/ (doctor will warn if it is stale)
source "$(dirname "$0")/_common.sh"
cd "$REPO_ROOT"

if [ -f "$STATE_ENV" ]; then
  # shellcheck disable=SC1090
  source "$STATE_ENV"
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "REFUSING: an instance for this checkout is already running ($BASE_URL, pid $SERVER_PID)." >&2
    echo "Run cleanup.sh first, or drive that instance only if YOU started it." >&2
    exit 2
  fi
  rm -rf "$STATE_DIR"   # stale state from a dead instance
fi

[ -d node_modules ] && [ -x "$VENV_PY" ] || { echo "Run bin/setup.sh first." >&2; exit 3; }
mkdir -p "$STATE_DIR"

BUILT=0
if [ -z "${SKIP_BUILD:-}" ]; then
  echo "building (npm run build) ..." >&2
  npm run build > "$STATE_DIR/build.log" 2>&1 || { echo "BUILD FAILED, see $STATE_DIR/build.log" >&2; tail -30 "$STATE_DIR/build.log" >&2; exit 4; }
  BUILT=1
fi

PORT="$("$VENV_PY" -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
# setsid => the server is its own process-group leader, so cleanup can kill exactly this group.
setsid npm run preview -- --host 127.0.0.1 --port "$PORT" > "$STATE_DIR/server.log" 2>&1 &
SERVER_PID=$!
cat > "$STATE_ENV" <<STATE
SERVER_PID=$SERVER_PID
PORT=$PORT
BASE_URL=http://127.0.0.1:$PORT
BUILT=$BUILT
HEAD_SHA=$(git rev-parse HEAD)
STARTED_AT=$(date -Iseconds)
STATE

# Ready = log says "Ready in" AND / serves the hero AND /privacy serves the policy (usable, not just listening).
for _ in $(seq 1 120); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then echo "server exited early:" >&2; cat "$STATE_DIR/server.log" >&2; "$(dirname "$0")/cleanup.sh" >&2 || true; exit 5; fi
  if grep -q "Ready in" "$STATE_DIR/server.log" \
     && curl -fsS "http://127.0.0.1:$PORT/" | grep -q "stubborn" \
     && curl -fsS "http://127.0.0.1:$PORT/privacy" | grep -q "Privacy Policy"; then
    echo "BASE_URL=http://127.0.0.1:$PORT"
    echo "STATE_DIR=$STATE_DIR  (server.log, build.log live here; scratch, removed by cleanup)"
    exit 0
  fi
  sleep 0.5
done
echo "server never became ready" >&2; cat "$STATE_DIR/server.log" >&2
"$(dirname "$0")/cleanup.sh" >&2 || true
exit 6
