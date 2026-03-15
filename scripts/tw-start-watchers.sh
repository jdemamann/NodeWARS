#!/bin/bash
# tw-start-watchers.sh
#
# Starts both inbox watchers for the Claude <-> Codex automation protocol.
# Run once at the start of each working session.
#
# Usage: bash scripts/tw-start-watchers.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Kill any stale watcher processes from a previous session
pkill -f "tw-inbox-watch" 2>/dev/null && echo "[start] stopped stale watchers" || true

sleep 0.5

# Start both watchers in background
bash scripts/tw-inbox-watch.sh 2>&1 | tee -a tmp/claude-watch.log &
CLAUDE_PID=$!

bash scripts/tw-inbox-watch-codex.sh 2>&1 | tee -a tmp/codex-watch.log &
CODEX_PID=$!

sleep 1

# Verify both are running
echo ""
echo "=== Watcher Status ==="
if kill -0 "$CLAUDE_PID" 2>/dev/null; then
  echo "✓ claude-watch  PID $CLAUDE_PID  (inbox-claude.md)"
else
  echo "✗ claude-watch  FAILED to start"
fi

if kill -0 "$CODEX_PID" 2>/dev/null; then
  echo "✓ codex-watch   PID $CODEX_PID  (inbox-codex.md)"
else
  echo "✗ codex-watch   FAILED to start"
fi

echo ""
echo "Logs:"
echo "  tail -f tmp/claude-watch.log"
echo "  tail -f tmp/codex-watch.log"
echo "  tail -f tmp/codex-autorun.log   (Codex headless runs)"
echo ""
echo "To stop: pkill -f tw-inbox-watch"
echo "To check: pgrep -fa tw-inbox-watch"
