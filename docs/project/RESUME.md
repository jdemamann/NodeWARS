# Project Resume

**Last updated:** 2026-03-16

## Project phase

Stabilized foundation — active TentacleWars layer extraction and campaign work.
Core gameplay is not in high-risk drift. TentacleWars 80-level campaign integrated in main.

## Current branch

`main` — all TW work merged. No active feature branch.

## Latest validated baseline

- smoke-checks.mjs: 102/102 (post TW-WAVE4, commit after merge)
- tw-campaign-sanity.mjs: 15/15
- tw-channel-sanity.mjs: 16/16
- tw-flow-sanity.mjs: 7/7
- tw-combat-sanity.mjs: 6/6
- tw-energy-sanity.mjs: 6/6
- tw-ownership-sanity.mjs: 5/5

## Completed waves (this cycle)

- **TW-WAVE1**: TwChannel + TwNodeOps Layer 1 extraction — merged
- **TW-WAVE2**: TwFlow + TwCombat Layer 2 extraction — merged
- **TW-WAVE3**: TwDelivery Layer 1 target-side delivery primitives — merged
- **TW-WAVE4**: TwOwnership Layer 1 ownership transitions + legacy clash shell removal — merged
  - TentCombat.js: fully NW-only. Tent._updateClashState: no TW branches.
  - All TW delivery and ownership routes through TwDelivery + TwOwnership.

## Open tracks

- Tutorial playtest feedback — awaiting sessions
- W24 RELAY RACE structural support — awaiting playtest evidence
- TASK-TWL-BALANCE-CROSS cross-world balance — awaiting timed playtests
- TASK-TWL-009 World 1 Playtest Review — `needs validation`
- TASK-TWL-003 Progression and Score Spec — `planned`, depends on TWL-001 ✓
- TASK-TWL-004 Obstacle Spec — `planned`, depends on TWL-001 ✓

## Cold-start order

1. `AGENTS.md` — stable rules and structure
2. `docs/project/RESUME.md` — this file (live state)
3. `docs/project/inbox-codex.md` — current task
4. `docs/project/tw-collab-status.md` — handoff state

## Stale files — ignore during cold-start

- `docs/archive/session-handoff-2026-03-14.md` — historical, not a live entry point
- `docs/archive/RESUME-CODEX.md` — replaced by this file

## Protocol

- Async collaboration: Claude writes `inbox-codex.md`, Codex writes `inbox-claude.md`
- All inbox content must be in English
- Status tracked in `docs/project/tw-collab-status.md`
- `memory/` is Claude Code system memory (outside this repo) — not a repo directory

## Next recommended action

TW layer extraction pipeline complete (Waves 1–4). Immediate candidates:
1. **TASK-TWL-009** — validate World 1 levels against current runtime
2. **TASK-TWL-003** — Progression and Score Spec (unblocks TWL-005/006)
3. **TASK-TWL-004** — Obstacle Spec

Start with the brainstorming skill for any new wave.

## Tiebreaker

- If `inbox-codex.md` and this file disagree: trust the inbox for the current task; trust this file for stable cold-start context.
- If the inbox is empty: trust this file's "Next recommended action" field.
