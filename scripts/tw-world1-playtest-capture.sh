#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${TW_WORLD1_CAPTURE_PORT:-4173}"
OUT_DIR="${TW_WORLD1_CAPTURE_OUT_DIR:-$ROOT_DIR/output/playwright/world1-review}"
VIEWPORT="${TW_WORLD1_CAPTURE_VIEWPORT:-1440,1024}"
WAIT_MS="${TW_WORLD1_CAPTURE_WAIT_MS:-1800}"
SERVER_PID=""

mkdir -p "$OUT_DIR"

start_server() {
  if curl -fsS "http://127.0.0.1:${PORT}/index.html" >/dev/null 2>&1; then
    return
  fi

  (
    cd "$ROOT_DIR"
    python3 -m http.server "$PORT" >/dev/null 2>&1
  ) &
  SERVER_PID="$!"

  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${PORT}/index.html" >/dev/null 2>&1; then
      return
    fi
    sleep 0.2
  done

  echo "Failed to start local review server on port ${PORT}" >&2
  exit 1
}

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

start_server

for phase in $(seq -w 1 20); do
  level_id="W1-${phase}"
  echo "Capturing ${level_id}"
  TW_VISUAL_URL="http://127.0.0.1:${PORT}/index.html?tw-debug=1&tw-mode=tentaclewars&tw-autostart=1&tw-level=${level_id}" \
  TW_VISUAL_OUT_FILE="$OUT_DIR/${level_id}.png" \
  TW_VISUAL_VIEWPORT="$VIEWPORT" \
  bash "$ROOT_DIR/scripts/tw-visual-validation.sh" snapshot
  sleep "$(awk "BEGIN { printf \"%.2f\", ${WAIT_MS} / 1000 }")"
done

echo "World 1 captures written to $OUT_DIR"
