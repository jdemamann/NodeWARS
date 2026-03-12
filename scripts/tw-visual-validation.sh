#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_CACHE_DIR="${TW_VISUAL_CACHE_DIR:-$ROOT_DIR/tmp/pw-cache}"
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
LOCAL_PWCLI_BIN="${TW_LOCAL_PWCLI_BIN:-$HOME/.npm/_npx/31e32ef8478fbf80/node_modules/.bin/playwright-cli}"
PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"
SESSION="${TW_VISUAL_SESSION:-twvisual}"
URL="${TW_VISUAL_URL:-http://127.0.0.1:4173/index.html}"
OUT_DIR="${TW_VISUAL_OUT_DIR:-output/playwright}"
OUT_FILE="${TW_VISUAL_OUT_FILE:-$OUT_DIR/tentaclewars-sandbox.png}"

mkdir -p "$OUT_DIR"
mkdir -p "$PROJECT_CACHE_DIR"

if [[ -x "$LOCAL_PWCLI_BIN" ]]; then
  PW_RUNNER=("$LOCAL_PWCLI_BIN")
elif [[ -f "$PWCLI" ]]; then
  PW_RUNNER=("bash" "$PWCLI")
else
  echo "No Playwright CLI runner found." >&2
  echo "Checked:" >&2
  echo "  $LOCAL_PWCLI_BIN" >&2
  echo "  $PWCLI" >&2
  exit 1
fi

COMMAND="${1:-snapshot}"

run_pw() {
  XDG_CACHE_HOME="$PROJECT_CACHE_DIR" \
  PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" \
  "${PW_RUNNER[@]}" "$@"
}

case "$COMMAND" in
  open)
    shift || true
    run_pw --session "$SESSION" open "$URL" --browser firefox
    ;;
  goto)
    shift || true
    run_pw --session "$SESSION" goto "$URL"
    ;;
  snapshot)
    shift || true
    run_pw --session "$SESSION" open "$URL" --browser firefox
    run_pw --session "$SESSION" goto "$URL"
    run_pw --session "$SESSION" resize 1440 1024
    run_pw --session "$SESSION" screenshot --filename "$OUT_FILE"
    run_pw --session "$SESSION" snapshot
    ;;
  close)
    shift || true
    run_pw --session "$SESSION" close
    ;;
  *)
    echo "Usage: $0 {open|goto|snapshot|close}" >&2
    exit 1
    ;;
esac
