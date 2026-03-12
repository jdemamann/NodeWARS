# Session Handoff

## Purpose

Provide a clean restart point for the current `TentacleWars` branch so the next session can resume immediately without rediscovering branch state, skill state, or next tasks.

---

## Current Branch

- branch: `feature/tentaclewars-mode`

The stable `main` branch remains the reference for normal `NodeWARS`.
All TentacleWars mode work should continue on the dedicated feature branch.

---

## What Is Already Done On This Branch

Completed TentacleWars backlog items:

- `TASK-TW-001 TentacleWars Mode Skeleton`
- `TASK-TW-002 TentacleWars Grade Table and Packet Core`
- `TASK-TW-003 TentacleWars Tentacle Cost and Refund`
- `TASK-TW-004 TentacleWars Overflow and Capture Core`
- `TASK-TW-005 TentacleWars Sandbox Prototype`
- `TASK-TW-006 TentacleWars AI Phase 1`

The sandbox runtime is already partially live and can be used for:

- grade-threshold feel
- overflow-pressure feel
- linear lane-cost feel
- hostile red/purple TentacleWars behavior

It is **not yet fully packet-native**.

---

## Immediate Next Task

Start with:

- `TASK-TW-007 Packet-Native Lane Runtime`

Follow-up order:

1. `TASK-TW-007 Packet-Native Lane Runtime`
2. `TASK-TW-008 TentacleWars Capture Runtime Integration`
3. `TASK-TW-009 TentacleWars Sandbox Playtest and Tuning Wave A`
4. `TASK-TW-010 TentacleWars Lane and Packet Visual Language`
5. `TASK-TW-011 TentacleWars Sandbox UX and Debug Tools`

---

## Installed Skills After This Session

Previously available:

- `develop-web-game`
- `doc`
- `imagegen`
- `playwright`
- `playwright-interactive`
- `screenshot`
- `spreadsheet`

Installed in this session:

- `jupyter-notebook`
- `figma`
- `figma-implement-design`
- `sentry`
- `pdf`

These require a Codex restart to become active in-session.

---

## First Files To Reopen After Restart

1. `AGENTS.md`
2. `docs/project/skill-usage-map.md`
3. `docs/project/task-backlog.md`
4. `docs/project/operational-kanban.md`
5. `docs/project/tentacle-wars-mode-architecture-proposal-2026-03-11.md`
6. `docs/project/tentaclewars-sandbox-runtime-integration-2026-03-11.md`

---

## Recommended Skill Use For The Next Wave

For `TASK-TW-007`:

1. `develop-web-game`
2. `jupyter-notebook`
3. `spreadsheet`
4. `doc`

Use `jupyter-notebook` and `spreadsheet` to compare packet cadence, overflow distribution, and lane pressure before finalizing runtime tuning.

---

## Validation Baseline Before New Work

Before starting the next implementation wave, confirm the current branch still passes:

- `node scripts/commentary-policy.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`
- `node scripts/game-state-progression-sanity.mjs`
- `node scripts/input-harness.mjs`
- `node scripts/campaign-sanity.mjs`
- `node scripts/release-readiness.mjs`
- `node scripts/simulation-soak.mjs`

Use `npm run check` if a full gate is preferred.

---

## Local-Only Artifacts

These may exist locally and should not be treated as project source:

- `.playwright-cli/`
- `progress.md`
- `tmp/`

---

## Safe Exit Status

This is a safe exit point because:

- no implementation wave is mid-edit
- the latest Settings UI regrouping already passed:
  - commentary policy
  - UI action sanity
  - UI DOM sanity
  - smoke
- the new skills are installed
- the restart path and next wave are documented
