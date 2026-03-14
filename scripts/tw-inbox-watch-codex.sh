#!/bin/bash
# tw-inbox-watch-codex.sh
#
# Watches inbox-codex.md for new messages from Claude.
# Sends a desktop notification so the user knows to switch to the Codex session.
#
# Usage:
#   bash scripts/tw-inbox-watch-codex.sh &
#
# Requirements:
#   inotify-tools: sudo apt install inotify-tools

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INBOX="$PROJECT_DIR/docs/project/inbox-codex.md"

echo "[tw-inbox-watch-codex] watching: $INBOX"

if ! command -v inotifywait &>/dev/null; then
  echo "[tw-inbox-watch-codex] ERROR: inotifywait not found"
  echo "  Install with: sudo apt install inotify-tools"
  exit 1
fi

while true; do
  inotifywait -e close_write -e modify "$INBOX" 2>/dev/null || true
  sleep 0.3

  FIRST_LINE=$(head -1 "$INBOX" 2>/dev/null || echo "_empty_")
  if [[ "$FIRST_LINE" == "_empty_" || "$FIRST_LINE" == "" ]]; then
    continue
  fi

  TASK=$(grep "^TASK:" "$INBOX" 2>/dev/null | head -1 | sed 's/TASK: //' || echo "")
  echo "[tw-inbox-watch-codex] Claude wrote to Codex: $TASK"

  if command -v notify-send &>/dev/null; then
    notify-send "Claude → Codex" "$TASK" --urgency=low 2>/dev/null || true
  fi
done
