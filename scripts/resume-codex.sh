#!/usr/bin/env bash
# resume-codex.sh — cold-start context dump for Codex
# Run at the start of a new session to get full project state + baseline checks.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

section() { echo; echo "════════════════════════════════════════"; echo "  $1"; echo "════════════════════════════════════════"; echo; }

section "RESUME"
cat docs/project/RESUME.md

section "COLLAB STATUS"
cat docs/project/tw-collab-status.md

section "INBOX (Codex)"
cat docs/project/inbox-codex.md

section "RECENT COMMITS"
git log --oneline -10

section "GIT STATUS"
git status

section "SMOKE CHECKS"
node scripts/smoke-checks.mjs

section "CAMPAIGN SANITY"
node scripts/tw-campaign-sanity.mjs
