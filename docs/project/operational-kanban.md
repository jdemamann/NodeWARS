# Operational Kanban

## Purpose

This is the lightweight local board for continuing development without depending on an external project-management tool.

Use it as the local source of truth when:

- planning the next wave
- handing off between sessions
- deciding what is truly active now

---

## Inbox

- investigate additional tutorial playtest feedback once new sessions are recorded
- evaluate whether `24 RELAY RACE` needs structural player opening support

## Planned

Phase A — Pre-Implementation Design:
- `TASK-TWL-001 TentacleWars Campaign Product Spec` ← **done**
- `TASK-TWL-002 TentacleWars Level Data Schema` (co-developed with schema tests)
- `TASK-TWL-003 TentacleWars Progression and Score Spec` (blocks TWL-005, TWL-006)
- `TASK-TWL-004 TentacleWars Obstacle Spec` (must close complexity decision)

Phase B — Runtime and Tooling:
- none

Phase C — World 1:
- none

Phase D — World 2:
- `TASK-TWL-010 TentacleWars World 2 Authoring Pack`
- `TASK-TWL-011 TentacleWars World 2 Playtest and Reconstruction Review`

Phase E — World 3:
- `TASK-TWL-012 TentacleWars World 3 Authoring Pack`
- `TASK-TWL-013 TentacleWars World 3 Playtest and Reconstruction Review`

Phase F — World 4:
- `TASK-TWL-014 TentacleWars World 4 Authoring Pack`
- `TASK-TWL-015 TentacleWars World 4 Playtest and Reconstruction Review`

Phase G — Polish Final:
- `TASK-TWL-018 TentacleWars Phase Editor Feasibility Review`

## In Progress

- none

## Needs Validation

- `TASK-TWL-009 TentacleWars World 1 Playtest and Reconstruction Review`
  - reconstruction complete (TWL-009 + TWL-009b): mechanics, energyCap, initialEnergy all correct
  - remaining: live playtest of W1-01..W1-05 in browser to validate feel under corrected model
  - static checks all pass: 9/9 + 85/85 + 1/1
  - can be closed to Done after one live session confirms W1-01..W1-05 feel correct

## Done Recently

- `TASK-TWL-009b TentacleWars World 1 energyCap Alignment Pass`
  - output: `src/tentaclewars/levels/TwWorld1.js` (W1-06..W1-20 corrected), `docs/tentaclewars/tw-balance-matrix.csv`
  - validation: 9/9 + 85/85 + 1/1 PASS
  - all 15 caps corrected to original PL curve; W1-16 cap=30 range-constraint mechanic restored

- `TASK-TWL-008b TentacleWars World 1 Complete`
  - output: `src/tentaclewars/levels/TwWorld1.js` (W1-01..W1-20), gate doc
  - validation: 9/9 + 4/4 + 2/2 + 84/84 PASS
  - World 1 authored end-to-end, curve verified

- `TASK-TWL-008a TentacleWars World 1 Prototype`
  - output: `src/tentaclewars/levels/TwWorld1.js` (W1-01..W1-05), gate doc
  - validation: 2/2 + 8/8 + 4/4 + 5/5 + 2/2 + 84/84 PASS
  - pipeline gate confirmed — TWL-008b open

- `TASK-TWL-016 TentacleWars Level Preview and Jump Tools`
  - output: `src/tentaclewars/TwCampaignPreview.js`, `scripts/tw-preview-jump-sanity.mjs`
  - validation: 5/5 + 84/84 PASS

- `TASK-TWL-017 TentacleWars Spreadsheet Balance Matrix`
  - output: `docs/tentaclewars/tw-balance-matrix.csv`, `scripts/tw-balance-matrix-sanity.mjs`
  - validation: 2/2 PASS

- `TASK-TWL-006 TentacleWars Campaign State Namespace`
  - output: `src/core/GameState.js`, `src/tentaclewars/TwModeRuntime.js`, `scripts/game-state-progression-sanity.mjs`
  - validation: 11/11 + 9/9 + 84/84 PASS

- `TASK-TWL-005 TentacleWars Campaign Loader`
  - output: `src/tentaclewars/TwCampaignLoader.js`, `TwObstacleRuntime.js`, `scripts/tw-campaign-loader-sanity.mjs`
  - validation: 4/4 + 6/6 + 84/84 PASS

- `TASK-TWL-007 TentacleWars Campaign Sanity Suite`
  - output: `src/tentaclewars/TwCampaignFixtures.js`, `scripts/tw-campaign-sanity.mjs`
  - validation: 6/6 + 2/2 PASS

- `TASK-TWL-004 TentacleWars Obstacle Spec`
  - output: `docs/tentaclewars/tw-obstacle-spec.md`
  - decision: Option A (static circles), no TWL-004b needed for W1-2

- `TASK-TWL-003 TentacleWars Progression and Score Spec`
  - output: `docs/tentaclewars/tw-progression-score-spec.md`
  - validation: all blocking criteria confirmed

- `TASK-TWL-002 TentacleWars Level Data Schema`
  - output: `src/tentaclewars/TwLevelSchema.js`, `docs/tentaclewars/tw-level-data-schema.md`, `scripts/tw-level-schema-sanity.mjs`
  - validation: `node scripts/tw-level-schema-sanity.mjs` → 2/2 PASS

- `TASK-TWL-001 TentacleWars Campaign Product Spec`
  - output: `docs/tentaclewars/tw-campaign-product-spec.md`

- `TASK-TW-022 TentacleWars Visual Regression Matrix`
- `TASK-TW-021 TentacleWars Tentacle Motion and Material Pass`
- `TASK-TW-020 TentacleWars Node Grade Silhouette Pass`
- `TASK-TW-019 TentacleWars HUD and Card Fidelity Contract`
- `TASK-TW-018 TentacleWars Sandbox Playtest and Tuning Wave B`
- `TASK-TW-017 TentacleWars Controlled Scenario Presets`
- `TASK-TW-023 TentacleWars Grade Slot Table Reconciliation`
- `TASK-TW-016 TentacleWars Fidelity Safety Rails`
- `TASK-TW-015 TentacleWars Visual Density Wave B`
- `TASK-TW-010 TentacleWars Lane and Packet Visual Language`
- `TASK-TW-009 TentacleWars Sandbox Playtest and Tuning Wave A`
- `TASK-TW-014 TentacleWars Focused Sanity Suites`
- `TASK-TW-013 TentacleWars Draw-Connect Fidelity Input`
- `TASK-TW-012 Browser Visual Validation Framework`
- `TASK-TW-011 TentacleWars Sandbox UX and Debug Tools`
- `TASK-TW-008 TentacleWars Capture Runtime Integration`
- `TASK-TW-007 Packet-Native Lane Runtime`
- `TASK-TW-006 TentacleWars AI Phase 1`
- `TASK-TW-005 TentacleWars Sandbox Prototype`
- `TASK-TW-004 TentacleWars Overflow and Capture Core`
- `TASK-TW-003 TentacleWars Tentacle Cost and Refund`
- `TASK-TW-002 TentacleWars Grade Table and Packet Core`

- `TASK-041 AI Playtest and Tuning Matrix`
- `TASK-TW-001 TentacleWars Mode Skeleton`
- `TASK-040 Purple Faction Identity Wave`
- `TASK-039 AI Structural Weakness Scoring`
- `TASK-038 AI Tactical State Profiles`
- `TASK-037 Enemy Slice Pressure Wave`
- `TASK-026 Tutorial and Onboarding Playtest Sweep`
- `TASK-027 Gameplay Micro-Bug Intake Wave`
- `TASK-025 Campaign Balance Wave B`
- `TASK-030 AI Quality and Faction Behavior Wave`
- `TASK-028 Deterministic Input Harness`
- `TASK-029 Release Readiness Wave`
- `TASK-031 AI Scoring Module Extraction`
- `TASK-032 Audio Scheduling and Cooldown Canonicalization`
- `TASK-033 ScreenController Composition Split Phase 2`
- `TASK-034 GameState Progression Sanity Mini-Suite`
- `TASK-035 Tutorial State Machine Extraction Review`
- `TASK-036 Commentary and Constant-Tuning Alignment Sweep`
- canonical campaign progression
- optional tutorials with rigid gating
- red/purple coalition support
- neutral coalition capture modes
- campaign ending screen and debug preview
- local bundled fonts and `woff2` packaging
- UI action sanity and DOM-lite menu checks

---

## Usage rule

Whenever a new wave starts:

1. move the task into `In Progress`
2. note the exact checks to run
3. after implementation, move it to `Needs Validation`
4. only move it to `Done Recently` after checks and docs are updated
