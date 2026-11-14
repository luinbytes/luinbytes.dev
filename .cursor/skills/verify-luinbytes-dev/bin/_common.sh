#!/usr/bin/env bash
# Shared by launch.sh / doctor.sh / cleanup.sh. Source it; do not run it.
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
KEY="$(printf '%s' "$REPO_ROOT" | md5sum | cut -c1-12)"
# One live instance per checkout: `out/` is a single shared build directory.
STATE_DIR="/tmp/verify-luinbytes-dev-$KEY"
STATE_ENV="$STATE_DIR/state.env"
# Evidence lives OUTSIDE the repo and OUTSIDE STATE_DIR so cleanup never touches it.
EVIDENCE_ROOT="${VERIFY_EVIDENCE_ROOT:-$(dirname "$REPO_ROOT")/evidence/luinbytes.dev}"
VENV_PY="$REPO_ROOT/.venv/bin/python"
