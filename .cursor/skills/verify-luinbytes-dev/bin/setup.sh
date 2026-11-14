#!/usr/bin/env bash
# Idempotent one-time setup: npm deps + Python Playwright venv + Chromium.
# Usage: .cursor/skills/verify-luinbytes-dev/bin/setup.sh
source "$(dirname "$0")/_common.sh"
cd "$REPO_ROOT"
[ -d node_modules ] || npm ci
[ -x "$VENV_PY" ] || python3 -m venv .venv
"$VENV_PY" -c 'import playwright' 2>/dev/null || "$VENV_PY" -m pip install -q -r requirements-test.txt
"$VENV_PY" -m playwright install chromium   # no-op when already installed
echo "setup ok: node_modules + .venv (gitignored) + chromium"
