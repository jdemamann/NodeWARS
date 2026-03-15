#!/bin/bash
# tw-codex-worker.sh
#
# Run this in background in the Codex terminal.
# Watches inbox-codex.md for SPECs and executes them via claude -p,
# with all output visible directly in this terminal.
#
# Usage (in the Codex terminal):
#   bash scripts/tw-codex-worker.sh &
#
# To see what's happening: output appears directly here
# To stop: kill %1  (or: pkill -f tw-codex-worker)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INBOX="$PROJECT_DIR/docs/project/inbox-codex.md"
INBOX_DIR="$(dirname "$INBOX")"
INBOX_BASENAME="$(basename "$INBOX")"
LOCKFILE="/tmp/nodewars-codex-autorun.lock"

cd "$PROJECT_DIR"

echo "[$(date '+%H:%M:%S')][codex-worker] ready — watching for SPECs..."

inotifywait -m -e close_write -e moved_to -e create \
  --format '%e %f' "$INBOX_DIR" 2>/dev/null |
while read -r EVENT FILE; do

  if [[ "$FILE" != "$INBOX_BASENAME" ]]; then
    continue
  fi

  sleep 0.5

  TS="$(date '+%H:%M:%S')"

  TYPE_LINE=$(grep "^TYPE:" "$INBOX" 2>/dev/null | head -1 || echo "")
  if [[ "$TYPE_LINE" != "TYPE: SPEC" ]]; then
    echo "[$TS][codex-worker] skip — $TYPE_LINE"
    continue
  fi

  TASK=$(grep "^TASK:" "$INBOX" 2>/dev/null | head -1 | sed 's/^TASK: //' || echo "unknown")
  echo ""
  echo "[$TS][codex-worker] ============================================"
  echo "[$TS][codex-worker] SPEC: $TASK"
  echo "[$TS][codex-worker] ============================================"

  if [ -f "$LOCKFILE" ]; then
    echo "[$TS][codex-worker] WARN: lock activo — tarefa já em execução"
    cat "$LOCKFILE"
    continue
  fi

  printf "task=%s\nstarted=%s\n" "$TASK" "$(date -Iseconds)" > "$LOCKFILE"

  # Executa claude -p com output directamente no terminal
  claude -p \
"You are Codex, the NodeWARS implementation agent. Your inbox has a new task.

Workflow (follow exactly):
1. Read docs/project/inbox-codex.md — this is your SPEC.
2. Read CLAUDE.md for all project rules, critical invariants, and check commands.
3. Execute the spec. If you find an out-of-scope bug, stop and write a BUG_REPORT to docs/project/inbox-claude.md.
4. Run all checks required by the spec and by CLAUDE.md.
5. Write your IMPL_REPORT to docs/project/inbox-claude.md following protocol v2 format:
   - PROTOCOL: v2 / TYPE: IMPL_REPORT / FROM: Codex / TO: Claude / TASK: [name]
   - Checks: [start] -> [end] (+N new)
   - Beyond spec section
   - Review checklist (3-6 items)
6. Update docs/project/tw-collab-status.md to: WAITING_FOR: Claude — [TASK_NAME] review
7. Overwrite docs/project/inbox-codex.md with: _READ by Codex — $(date +%Y-%m-%d)_

Use DECISION defaults from the spec. Do not ask questions. Complete the full workflow." \
    --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Agent"

  EXIT_CODE=$?
  rm -f "$LOCKFILE"
  DONE_TS="$(date '+%H:%M:%S')"

  if [ "$EXIT_CODE" -eq 0 ]; then
    echo ""
    echo "[$DONE_TS][codex-worker] ✓ concluído: $TASK"
    echo "[$DONE_TS][codex-worker] → vai ao Claude e escreve 'leia inbox'"
  else
    echo ""
    echo "[$DONE_TS][codex-worker] ✗ erro (exit $EXIT_CODE): $TASK"
  fi

  echo ""
done
