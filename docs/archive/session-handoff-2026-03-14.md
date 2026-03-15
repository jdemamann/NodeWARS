# Session Handoff — 2026-03-14

## Purpose

Fast restart point for the next Codex session.

Use this file if you need to resume TentacleWars work without relying on prior chat context.

## Current state

- Branch: `feature/tentaclewars-mode`
- TentacleWars progress:
  - `TASK-TWL-012` is **done and confirmed by Claude**
  - `TASK-TWL-013 TentacleWars World 3 Playtest and Reconstruction Review` is the **current open task**
- Collaboration mode:
  - manual inbox flow
  - `PROTOCOL: v2`

## Immediate next task

`TASK-TWL-013 TentacleWars World 3 Playtest and Reconstruction Review`

Canonical spec source:
- [inbox-codex.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/inbox-codex.md)

What the next session should do:
- run a live browser playtest for:
  - `W3-01`
  - `W3-05`
  - `W3-10`
  - `W3-15`
  - `W3-16`
  - `W3-20`
- capture stills under:
  - `output/playwright/twl-013/`
- write per-phase notes on:
  - obstacle readability
  - routing clarity
  - energy-cap feel
  - visible affordable opening
  - par plausibility
- only fix:
  - sealed paths
  - unwinnable openings
- do not tune `par` or `energyCap` by feel alone

## Important validated state

Latest validated checks after `TWL-012`:
- `node scripts/smoke-checks.mjs` → `90/90`
- `node scripts/tw-campaign-sanity.mjs` → `13/13`
- `node scripts/commentary-policy.mjs` → `1/1`

World 3 authoring status:
- [TwWorld3.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/levels/TwWorld3.js) exists with `W3-01..W3-20`
- [TwCampaignFixtures.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/TwCampaignFixtures.js) includes World 3
- [TwLevelSchema.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/TwLevelSchema.js) allows `energyCap` up to `500`
- [tw-balance-matrix.csv](/home/jonis/.claude/projects/nodewars-v2-codex/docs/tentaclewars/tw-balance-matrix.csv) includes World 3
- [tw-level-data-schema.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/tentaclewars/tw-level-data-schema.md) is aligned with the live schema

World 3 defect fixes already applied:
- the following phases had sealed openings and were corrected during `TWL-012`:
  - `W3-01`
  - `W3-05`
  - `W3-07`
  - `W3-09`
  - `W3-11`
  - `W3-13`
  - `W3-15`
  - `W3-18`

## Inbox / protocol state

- Claude confirmed `TWL-012` and opened `TWL-013`
- Current source of truth:
  - [inbox-codex.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/inbox-codex.md)
  - [tw-collab-status.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/tw-collab-status.md)

Expected next protocol move:
- Codex executes `TWL-013`
- then writes an `IMPL_REPORT` to:
  - [inbox-claude.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/inbox-claude.md)

## Superpowers note

Superpowers is installed on disk:
- `~/.agents/skills/superpowers -> ~/.codex/superpowers/skills`

But it is **not available in the current already-open Codex session** until Codex is restarted.

## Recommended resume sequence

1. Reopen Codex in this repo.
2. Read:
   - `AGENTS.md`
   - [session-handoff-2026-03-14.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/session-handoff-2026-03-14.md)
   - [inbox-codex.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/inbox-codex.md)
   - [tw-collab-status.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/tw-collab-status.md)
3. Confirm the current skills list now includes `superpowers` after restart.
4. Execute `TWL-013`.
5. Run:
   - `node scripts/smoke-checks.mjs`
   - `node scripts/tw-campaign-sanity.mjs`
   - `node scripts/commentary-policy.mjs`
6. Send the `IMPL_REPORT` to Claude through the inbox files.

## Notes

- Do not reactivate the inbox automation flow. Manual inbox relay is the current agreed mode.
- Prefer fixing only structural authoring defects during `TWL-013`.
- Keep project-board updates in sync with the real wave state to avoid operational drift.
