#!/bin/bash
# tw-inbox-watch.sh
#
# Watches inbox-claude.md for new messages from Codex.
# Sends a desktop notification when content is not _empty_.
#
# Usage:
#   bash scripts/tw-inbox-watch.sh &         # Option A: notify-send only
#   bash scripts/tw-inbox-watch.sh --auto &  # Option B: invoke Claude CLI (experimental)
#
# Requirements:
#   Option A: inotify-tools (sudo apt install inotify-tools)
#   Option B: inotify-tools + claude CLI in PATH

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INBOX="$PROJECT_DIR/docs/project/inbox-claude.md"
AUTO_MODE="${1:-}"

echo "[tw-inbox-watch] watching: $INBOX"
echo "[tw-inbox-watch] mode: ${AUTO_MODE:-notify}"

if ! command -v inotifywait &>/dev/null; then
  echo "[tw-inbox-watch] ERROR: inotifywait not found"
  echo "  Install with: sudo apt install inotify-tools"
  exit 1
fi

while true; do
  inotifywait -e close_write -e modify "$INBOX" 2>/dev/null || true

  # Brief settle delay to let the full write complete
  sleep 0.3

  FIRST_LINE=$(head -1 "$INBOX" 2>/dev/null || echo "_empty_")

  if [[ "$FIRST_LINE" == "_empty_" || "$FIRST_LINE" == "" ]]; then
    continue
  fi

  FROM=$(grep "^FROM:" "$INBOX" 2>/dev/null | head -1 | sed 's/FROM: //' || echo "Unknown")
  TASK=$(grep "^TASK:" "$INBOX" 2>/dev/null | head -1 | sed 's/TASK: //' || echo "")

  echo "[tw-inbox-watch] new message from: $FROM — $TASK"

  if [[ "$AUTO_MODE" == "--auto" ]]; then
    # Option B: attempt to invoke Claude CLI non-interactively
    if command -v claude &>/dev/null; then
      echo "[tw-inbox-watch] invoking claude..."
      cd "$PROJECT_DIR"
      echo "leia inbox" | claude --no-interactive 2>&1 \
        && echo "[tw-inbox-watch] claude responded" \
        || {
          echo "[tw-inbox-watch] CLI invocation failed, falling back to notification"
          notify-send "Codex → Claude" "$FROM: $TASK" --urgency=normal 2>/dev/null || true
        }
    else
      echo "[tw-inbox-watch] claude CLI not found, falling back to notification"
      notify-send "Codex → Claude" "$FROM: $TASK" --urgency=normal 2>/dev/null || true
    fi
  else
    # Option A: desktop notification only
    if command -v notify-send &>/dev/null; then
      notify-send "Codex → Claude" "$FROM: $TASK" --urgency=normal 2>/dev/null || true
    fi
    echo "[tw-inbox-watch] notification sent — go to Claude and type 'leia inbox'"
  fi
done
