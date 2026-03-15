#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_CACHE_DIR="${TW_VISUAL_CACHE_DIR:-$ROOT_DIR/tmp/pw-cache}"
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
PLAYWRIGHT_BIN="${TW_PLAYWRIGHT_BIN:-}"
PLAYWRIGHT_NODE_MODULE="${TW_PLAYWRIGHT_NODE_MODULE:-}"
URL="${TW_VISUAL_URL:-http://127.0.0.1:4173/index.html}"
OUT_DIR="${TW_VISUAL_OUT_DIR:-output/playwright}"
OUT_FILE="${TW_VISUAL_OUT_FILE:-$OUT_DIR/tentaclewars-sandbox.png}"
BROWSER="${TW_VISUAL_BROWSER:-chromium}"
VIEWPORT="${TW_VISUAL_VIEWPORT:-1440,1024}"
PID_FILE="$PROJECT_CACHE_DIR/tw-visual-open.pid"
LOG_FILE="$PROJECT_CACHE_DIR/tw-visual-open.log"

mkdir -p "$OUT_DIR"
mkdir -p "$PROJECT_CACHE_DIR"

if [[ -z "$PLAYWRIGHT_BIN" ]]; then
  PLAYWRIGHT_BIN="$(find "$HOME/.npm/_npx" -path '*/node_modules/.bin/playwright' 2>/dev/null | tail -n 1 || true)"
fi

if [[ -z "$PLAYWRIGHT_BIN" || ! -x "$PLAYWRIGHT_BIN" ]]; then
  echo "No Playwright CLI binary found in ~/.npm/_npx." >&2
  echo "Run: npx playwright install chromium" >&2
  exit 1
fi

if [[ -z "$PLAYWRIGHT_NODE_MODULE" ]]; then
  PLAYWRIGHT_NODE_MODULE="$(cd "$(dirname "$(readlink -f "$PLAYWRIGHT_BIN")")/.." && pwd)"
fi

run_pwbin() {
  XDG_CACHE_HOME="$PROJECT_CACHE_DIR" \
  PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" \
  "$PLAYWRIGHT_BIN" "$@"
}

run_pwscript() {
  XDG_CACHE_HOME="$PROJECT_CACHE_DIR" \
  PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" \
  TW_PLAYWRIGHT_NODE_MODULE="$PLAYWRIGHT_NODE_MODULE" \
  node "$ROOT_DIR/scripts/tw-visual-playwright.mjs" "$@"
}

cleanup_visual_session() {
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
    rm -f "$PID_FILE"
  fi

  pkill -f "$PLAYWRIGHT_BROWSERS_PATH/chromium-[^/]*/chrome-linux/chrome" >/dev/null 2>&1 || true
  pkill -f "$PLAYWRIGHT_BROWSERS_PATH/chromium_headless_shell-[^/]*/chrome-headless-shell-linux64/chrome-headless-shell" >/dev/null 2>&1 || true
  pkill -f "$PLAYWRIGHT_BROWSERS_PATH/firefox-[^/]*/firefox/firefox" >/dev/null 2>&1 || true
  pkill -f "$PLAYWRIGHT_BROWSERS_PATH/webkit-[^/]*/pw_run.sh" >/dev/null 2>&1 || true
}

COMMAND="${1:-snapshot}"

case "$COMMAND" in
  install)
    shift || true
    run_pwbin install chromium
    ;;
  open)
    shift || true
    cleanup_visual_session
    (
      run_pwbin open -b "$BROWSER" --viewport-size "$VIEWPORT" "$URL"
    ) >"$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Started Playwright browser with PID $(cat "$PID_FILE")"
    echo "Log: $LOG_FILE"
    ;;
  snapshot)
    shift || true
    cleanup_visual_session
    run_pwscript snapshot "$URL" "$OUT_FILE" "$BROWSER" "$VIEWPORT"
    ;;
  scenario)
    shift || true
    PRESET_ID="${1:-grade-showcase}"
    ACTION_NAME="${2:-none}"
    WAIT_MS="${3:-1400}"
    cleanup_visual_session
    SCENARIO_OUT_FILE="${TW_VISUAL_OUT_FILE:-$OUT_DIR/tw-scenario-${PRESET_ID}-${ACTION_NAME}.png}"
    run_pwscript scenario "$URL" "$SCENARIO_OUT_FILE" "$BROWSER" "$VIEWPORT" "$PRESET_ID" "$ACTION_NAME" "$WAIT_MS"
    ;;
  smoke)
    shift || true
    cleanup_visual_session
    run_pwscript smoke "$URL" "$OUT_DIR" "$BROWSER" "$VIEWPORT"
    ;;
  close)
    shift || true
    cleanup_visual_session
    ;;
  cleanup)
    shift || true
    cleanup_visual_session
    ;;
  *)
    echo "Usage: $0 {install|open|snapshot|scenario|smoke|close|cleanup}" >&2
    exit 1
    ;;
esac
