#!/usr/bin/env bash
# Read-only: is the instance started by launch.sh worth driving? Exit 0 = yes.
# Usage: .cursor/skills/verify-luinbytes-dev/bin/doctor.sh
source "$(dirname "$0")/_common.sh"
cd "$REPO_ROOT"
fail=0
ok()   { echo "ok    $*"; }
bad()  { echo "FAIL  $*"; fail=1; }
warn() { echo "warn  $*"; }

[ -f "$STATE_ENV" ] || { bad "no state at $STATE_ENV (run launch.sh)"; exit 1; }
# shellcheck disable=SC1090
source "$STATE_ENV"

kill -0 "$SERVER_PID" 2>/dev/null && ok "server pid $SERVER_PID alive" || bad "server pid $SERVER_PID dead"
# Port must be owned by a process in OUR process group (setsid made pid == pgid).
owner="$(ss -ltnpH "sport = :$PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)"
if [ -n "$owner" ] && [ "$(ps -o pgid= -p "$owner" | tr -d ' ')" = "$SERVER_PID" ]; then ok "port $PORT owned by our process group (pid $owner)"; else bad "port $PORT not owned by our server (owner pid: ${owner:-none})"; fi

[ "$(git rev-parse HEAD)" = "$HEAD_SHA" ] && ok "build is from HEAD ${HEAD_SHA:0:9}" || warn "HEAD moved since launch (${HEAD_SHA:0:9} -> $(git rev-parse --short=9 HEAD)); rebuild via cleanup + launch"
if [ -n "$(git status --porcelain -- app components lib public/images index.html 2>/dev/null)" ]; then warn "uncommitted app changes; served build may be stale unless launched after them"; fi

body="$(curl -fsS "$BASE_URL/" || true)"
echo "$body" | grep -q "Hi, I" && echo "$body" | grep -q "stubborn" && ok "GET / serves the hero" || bad "GET / missing hero copy"
curl -fsS "$BASE_URL/privacy" | grep -q "Privacy Policy" && ok "GET /privacy serves the policy" || bad "GET /privacy broken"
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/definitely-not-a-route")"
[ "$code" = 404 ] && ok "unknown route -> 404" || bad "unknown route returned $code (want 404)"

"$VENV_PY" -c 'import playwright' 2>/dev/null && ok "python playwright importable" || bad ".venv lacks playwright (run setup.sh)"
"$VENV_PY" - <<'PY' && ok "headless chromium launches" || bad "chromium cannot launch (run setup.sh)"
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); b.close()
PY
mkdir -p "$EVIDENCE_ROOT" 2>/dev/null && [ -w "$EVIDENCE_ROOT" ] && ok "evidence root writable: $EVIDENCE_ROOT" || bad "evidence root not writable: $EVIDENCE_ROOT"
[ $fail = 0 ] && echo "DOCTOR: PASS ($BASE_URL)" || echo "DOCTOR: FAIL"
exit $fail
