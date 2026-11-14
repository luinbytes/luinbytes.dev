#!/usr/bin/env bash
# Tear down ONLY what launch.sh started. Never touches evidence. Idempotent.
# Usage: .cursor/skills/verify-luinbytes-dev/bin/cleanup.sh
source "$(dirname "$0")/_common.sh"
cd "$REPO_ROOT"
[ -f "$STATE_ENV" ] || { echo "nothing to clean (no state)"; exit 0; }
# shellcheck disable=SC1090
source "$STATE_ENV"

if kill -0 "$SERVER_PID" 2>/dev/null; then
  # Kill the process group we created with setsid (pid == pgid), not anything by name.
  if [ "$(ps -o pgid= -p "$SERVER_PID" | tr -d ' ')" = "$SERVER_PID" ]; then
    kill -TERM -- "-$SERVER_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do kill -0 "$SERVER_PID" 2>/dev/null || break; sleep 0.25; done
    kill -0 "$SERVER_PID" 2>/dev/null && kill -KILL -- "-$SERVER_PID" 2>/dev/null || true
  else
    echo "pid $SERVER_PID is not our process-group leader; refusing to kill it" >&2
  fi
fi
ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q . && echo "WARN port $PORT still listening" >&2

if [ "$BUILT" = 1 ]; then
  # Build scaffolding: gitignored dirs plus the sitemap lastmod that `prebuild` rewrites.
  rm -rf "$REPO_ROOT/out" "$REPO_ROOT/.prerender"
  git checkout -- public/sitemap.xml
fi
rm -rf "$STATE_DIR"
echo "cleanup ok (evidence under $EVIDENCE_ROOT untouched)"
