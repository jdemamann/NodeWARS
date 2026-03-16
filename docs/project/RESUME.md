# Project Resume

**Last updated:** 2026-03-16

## Project phase

TW extraction complete. Two-line development strategy active.
- `main` (tag `v-nw-tw-complete`) — frozen NW+TW snapshot, all 4 extraction waves merged
- `tw-pure` — NodeWARS legacy removal in progress, TW-only target

**See `docs/project/FORK-STRATEGY.md` for the full two-line strategy, architecture
overview, and recovery procedures.**

## Current branch

`tw-pure` — NW legacy removal. Branched from `v-nw-tw-complete` (main @ `979548a`).
`main` is frozen as the NW+TW reference. Do not push NW removal work to main.

## Latest validated baseline

At tag `v-nw-tw-complete` (main, commit `979548a`):

- smoke-checks.mjs: 102/102 (post TW-WAVE4)
- tw-campaign-sanity.mjs: 15/15
- tw-channel-sanity.mjs: 16/16
- tw-flow-sanity.mjs: 7/7
- tw-combat-sanity.mjs: 6/6
- tw-energy-sanity.mjs: 6/6
- tw-ownership-sanity.mjs: 5/5
- tw-delivery-sanity.mjs: 6/6

Any agent starting work on `tw-pure` must reproduce this baseline first.

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
3. `docs/project/FORK-STRATEGY.md` — two-line strategy + recovery procedures (READ THIS)
4. `docs/project/inbox-codex.md` — current task
5. `docs/project/tw-collab-status.md` — handoff state

## Stale files — ignore during cold-start

- `docs/archive/session-handoff-2026-03-14.md` — historical, not a live entry point
- `docs/archive/RESUME-CODEX.md` — replaced by this file

## Protocol

- Async collaboration: Claude writes `inbox-codex.md`, Codex writes `inbox-claude.md`
- All inbox content must be in English
- Status tracked in `docs/project/tw-collab-status.md`
- `memory/` is Claude Code system memory (outside this repo) — not a repo directory

## Next recommended action

**Active work (tw-pure branch):** NW legacy removal — 8-step plan:
1. Delete `TentCombat.js` (100% NW-only, 137 lines)
2. Simplify `kill()` from 80 → ~12 lines (only TW paths remain)
3. Delete NW state machine methods from `Tent.js` (~70 lines)
4. Delete NW flow methods from `Tent.js` (~90 lines)
5. Delete NW clash methods from `Tent.js` (~130 lines)
6. Delete NW contest/ownership callbacks from `Tent.js` (~60 lines)
7. Simplify `update()` and constructor (remove all simulationMode checks)
8. Fix `TwCombat.advanceTwClash` to receive `tentRegistry` as parameter

**After tw-pure is stable:** campaign and balance work (TASK-TWL-009, TWL-003, TWL-004)

Start with the brainstorming skill for any new wave.

## Tiebreaker

- If `inbox-codex.md` and this file disagree: trust the inbox for the current task; trust this file for stable cold-start context.
- If the inbox is empty: trust this file's "Next recommended action" field.
