#!/bin/bash
# tw-inbox-watch-codex.sh
#
# Watches inbox-codex.md for TYPE: SPEC messages from Claude and auto-triggers
# a headless Codex session via `claude -p`.
#
# Usage:
#   bash scripts/tw-inbox-watch-codex.sh          # live auto-trigger mode
#   bash scripts/tw-inbox-watch-codex.sh --dry-run # preview only, no execution
#
# Requirements:
#   inotify-tools: sudo apt install inotify-tools
#   claude CLI in PATH
#
# Logs: tmp/codex-autorun.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INBOX="$PROJECT_DIR/docs/project/inbox-codex.md"
INBOX_DIR="$(dirname "$INBOX")"
INBOX_BASENAME="$(basename "$INBOX")"
LOCKFILE="/tmp/nodewars-codex-autorun.lock"
LOG="$PROJECT_DIR/tmp/codex-autorun.log"
DRY_RUN="${1:-}"

mkdir -p "$PROJECT_DIR/tmp"

echo "[codex-watch] project: $PROJECT_DIR"
echo "[codex-watch] inbox:   $INBOX"
echo "[codex-watch] mode:    ${DRY_RUN:-live}"
echo "[codex-watch] log:     $LOG"

# --- prerequisite checks ---

if ! command -v inotifywait &>/dev/null; then
  echo "[codex-watch] ERROR: inotifywait not found. Install: sudo apt install inotify-tools"
  exit 1
fi

if [[ "$DRY_RUN" != "--dry-run" ]] && ! command -v claude &>/dev/null; then
  echo "[codex-watch] ERROR: claude CLI not found in PATH"
  exit 1
fi

echo "[codex-watch] ready — waiting for SPECs..."

# --- main watch loop ---
# Use -m (monitor mode) + pipe to avoid command-substitution exit-code issues.
# Watches the parent directory to catch atomic replace writes (moved_to/create).

inotifywait -m -e close_write -e moved_to -e create \
  --format '%e %f' "$INBOX_DIR" 2>/dev/null |
while read -r EVENT FILE; do

  # Only react to our inbox file
  if [[ "$FILE" != "$INBOX_BASENAME" ]]; then
    continue
  fi

  # Settle: let any buffered writes complete
  sleep 0.5

  TS="$(date '+%H:%M:%S')"

  # Only act on TYPE: SPEC — skip _READ markers, CONFIRMs, standby
  TYPE_LINE=$(grep "^TYPE:" "$INBOX" 2>/dev/null | head -1 || echo "")
  if [[ "$TYPE_LINE" != "TYPE: SPEC" ]]; then
    echo "[$TS][codex-watch] skip — not a SPEC (got: '$TYPE_LINE')"
    continue
  fi

  TASK=$(grep "^TASK:" "$INBOX" 2>/dev/null | head -1 | sed 's/^TASK: //' || echo "unknown-task")
  echo "[$TS][codex-watch] SPEC detected: $TASK"

  # --- lock check: prevent parallel Codex runs ---
  if [ -f "$LOCKFILE" ]; then
    LOCK_CONTENTS=$(cat "$LOCKFILE" 2>/dev/null || echo "unreadable")
    echo "[$TS][codex-watch] WARN: lock active — Codex may already be running"
    echo "[$TS][codex-watch] lock: $LOCK_CONTENTS"
    notify-send "Codex Automation" \
      "WARN: new SPEC but Codex is already running: $TASK" \
      --urgency=critical 2>/dev/null || true
    echo -e "\a\a"
    continue
  fi

  # --- dry run ---
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[$TS][codex-watch] DRY RUN — would trigger claude -p for: $TASK"
    continue
  fi

  # --- trigger Codex in background ---
  echo "[$TS][codex-watch] triggering Codex: $TASK"
  printf "task=%s\nstarted=%s\n" "$TASK" "$(date -Iseconds)" > "$LOCKFILE"
  notify-send "Codex Auto-Starting" "$TASK" --urgency=low 2>/dev/null || true

  (
    cd "$PROJECT_DIR"

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
      --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Agent" \
      >> "$LOG" 2>&1

    EXIT_CODE=$?
    rm -f "$LOCKFILE"

    DONE_TS="$(date '+%H:%M:%S')"
    if [ "$EXIT_CODE" -eq 0 ]; then
      echo "[$DONE_TS][codex-watch] Codex completed: $TASK" | tee -a "$LOG"
      notify-send "Codex Done ✓" "$TASK — check inbox-claude.md" \
        --urgency=normal 2>/dev/null || true
      echo -e "\a"
    else
      echo "[$DONE_TS][codex-watch] ERROR: Codex exited $EXIT_CODE for: $TASK" | tee -a "$LOG"
      notify-send "Codex FAILED ✗" \
        "$TASK — exit $EXIT_CODE — see tmp/codex-autorun.log" \
        --urgency=critical 2>/dev/null || true
      echo -e "\a\a\a"
    fi
  ) &

done
