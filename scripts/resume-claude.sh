#!/usr/bin/env bash
# resume-claude.sh — cold-start context dump for Claude
# Run at the start of a new session to get full project state.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

section() { echo; echo "════════════════════════════════════════"; echo "  $1"; echo "════════════════════════════════════════"; echo; }

section "RESUME"
cat docs/project/RESUME.md

section "COLLAB STATUS"
cat docs/project/tw-collab-status.md

section "INBOX (Claude)"
cat docs/project/inbox-claude.md

section "OPERATIONAL KANBAN"
cat docs/project/operational-kanban.md

section "RECENT COMMITS"
git log --oneline -10

section "GIT STATUS"
git status

section "DOC AUDIT"
node scripts/doc-audit.mjs
