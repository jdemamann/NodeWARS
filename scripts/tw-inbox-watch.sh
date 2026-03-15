#!/bin/bash
# tw-inbox-watch.sh
#
# Watches inbox-claude.md for IMPL_REPORTs and BUG_REPORTs from Codex.
# Sends a desktop notification and terminal bell so the user knows to
# go to their Claude session and type "leia inbox".
#
# Claude's review step remains manual by design — design decisions
# and wave approvals require human judgement.
#
# Usage:
#   bash scripts/tw-inbox-watch.sh &
#
# Requirements:
#   inotify-tools: sudo apt install inotify-tools

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INBOX="$PROJECT_DIR/docs/project/inbox-claude.md"
INBOX_DIR="$(dirname "$INBOX")"
INBOX_BASENAME="$(basename "$INBOX")"

echo "[claude-watch] project: $PROJECT_DIR"
echo "[claude-watch] inbox:   $INBOX"

if ! command -v inotifywait &>/dev/null; then
  echo "[claude-watch] ERROR: inotifywait not found. Install: sudo apt install inotify-tools"
  exit 1
fi

echo "[claude-watch] ready — waiting for Codex reports..."

# --- main watch loop ---
# Use -m (monitor mode) + pipe to avoid command-substitution exit-code issues.

inotifywait -m -e close_write -e moved_to -e create \
  --format '%e %f' "$INBOX_DIR" 2>/dev/null |
while read -r EVENT FILE; do

  if [[ "$FILE" != "$INBOX_BASENAME" ]]; then
    continue
  fi

  sleep 0.3

  TS="$(date '+%H:%M:%S')"
  FIRST_LINE=$(head -1 "$INBOX" 2>/dev/null || echo "")

  # Skip _READ markers and empty files — these are not actionable
  if [[ "$FIRST_LINE" == _READ* || -z "$FIRST_LINE" ]]; then
    echo "[$TS][claude-watch] skip — _READ marker or empty"
    continue
  fi

  TYPE_LINE=$(grep "^TYPE:" "$INBOX" 2>/dev/null | head -1 || echo "")
  TASK=$(grep "^TASK:" "$INBOX" 2>/dev/null | head -1 | sed 's/^TASK: //' || echo "")

  case "$TYPE_LINE" in
    "TYPE: IMPL_REPORT")
      echo "[$TS][claude-watch] IMPL_REPORT ready: $TASK"
      notify-send "Codex → Claude" \
        "✅ IMPL_REPORT ready: $TASK — go to Claude and type 'leia inbox'" \
        --urgency=normal 2>/dev/null || true
      echo -e "\a"
      ;;
    "TYPE: BUG_REPORT")
      echo "[$TS][claude-watch] BUG_REPORT: $TASK"
      notify-send "Codex → Claude" \
        "⚠️ BUG_REPORT: $TASK — needs your decision" \
        --urgency=critical 2>/dev/null || true
      echo -e "\a\a"
      ;;
    "TYPE: DESIGN_NOTE")
      echo "[$TS][claude-watch] DESIGN_NOTE: $TASK"
      notify-send "Codex → Claude" \
        "📝 DESIGN_NOTE: $TASK" \
        --urgency=low 2>/dev/null || true
      ;;
    "TYPE: PROTOCOL_PROPOSAL")
      echo "[$TS][claude-watch] PROTOCOL_PROPOSAL: $TASK"
      notify-send "Codex → Claude" \
        "🔧 PROTOCOL_PROPOSAL — go to Claude and review" \
        --urgency=normal 2>/dev/null || true
      echo -e "\a"
      ;;
    "TYPE: SPEC"|"TYPE: CONFIRM"|"TYPE: REJECT"|"TYPE: PROTOCOL_ACK")
      echo "[$TS][claude-watch] skip — non-actionable: $TYPE_LINE"
      ;;
    *)
      echo "[$TS][claude-watch] unknown type '$TYPE_LINE' — skipping"
      ;;
  esac

done
