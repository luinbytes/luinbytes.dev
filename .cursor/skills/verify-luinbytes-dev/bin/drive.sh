#!/usr/bin/env bash
# Drive mapped features in headless Chromium against the instance launch.sh started.
# Usage: drive.sh <feature-id>|all [run-id]
#   feature ids: landing-nav | pond-feeding | pond-view | contact-email | privacy-404
# Evidence: $EVIDENCE_ROOT/<run-id>/<feature-id>/{NN-*.png,*.aria.txt,result.json}; exit 0 only if every journey passed.
source "$(dirname "$0")/_common.sh"
[ -f "$STATE_ENV" ] || { echo "no running instance; run launch.sh" >&2; exit 2; }
# shellcheck disable=SC1090
source "$STATE_ENV"
RUN_ID="${2:-$(date +%Y%m%d-%H%M%S)}"
export BASE_URL EVIDENCE_DIR="$EVIDENCE_ROOT/$RUN_ID" HEAD_SHA
mkdir -p "$EVIDENCE_DIR"
echo "evidence -> $EVIDENCE_DIR"
exec "$VENV_PY" "$(dirname "$0")/drive.py" "${1:?feature id or all}"
