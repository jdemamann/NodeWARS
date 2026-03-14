#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${TW_VISUAL_OUT_DIR:-$ROOT_DIR/output/playwright/matrix}"

mkdir -p "$OUT_DIR"

run_capture() {
  local preset_id="$1"
  local action_name="$2"
  local wait_ms="$3"
  local output_file="$OUT_DIR/${preset_id}-${action_name}.png"
  TW_VISUAL_OUT_FILE="$output_file" bash "$ROOT_DIR/scripts/tw-visual-validation.sh" scenario "$preset_id" "$action_name" "$wait_ms"
}

run_capture "grade-showcase" "none" "1200"
run_capture "grade-showcase" "pin-node:5" "1200"
run_capture "capture-lab" "pin-node:3" "1400"
run_capture "slice-lab" "slice-primary" "1200"
run_capture "clash-lab" "none" "1400"
run_capture "density-lab" "none" "1600"

echo "TentacleWars visual matrix written to $OUT_DIR"
