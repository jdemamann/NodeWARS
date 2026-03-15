# Task Backlog

## Purpose

This backlog turns the stabilization roadmap into concrete, delegable tasks.

The tasks below are intentionally small enough to implement, review, and validate without creating a large uncontrolled refactor.

## Execution Rules

- Complete tasks roughly in dependency order.
- Do not start naming sweeps before the affected rule is stable.
- Prefer finishing one canonical rule path at a time.
- Every task touching gameplay must update smoke checks or explain why it does not need one.

## Active Operational Queue

Use this section first. Older stabilization tasks remain below as historical traceability.

### NOW

#### TASK-025 Campaign Balance Wave B

- Owner: `campaign-level-owner`
- Workstream: `WS-03 Campaign e Level Design`
- Suggested Agent: `docs/agents/campaign-level-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- run the next evidence-driven balance pass on the priority authored phases using the current playtest method

Checks:

- `npm run check:campaign`
- `npm run check:ui` if tutorial/result flow changes

Primary deliverables:

- per-phase observations
- tuning decisions
- updated campaign balance doc

#### TASK-026 Tutorial and Onboarding Playtest Sweep

- Owner: `ui-owner`
- Workstream: `WS-04 UI/UX e Render`
- Suggested Agent: `docs/agents/ui-ux-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- review tutorial clarity, optionality, pacing, and failure recovery in World 1, 2, and 3

Checks:

- `npm run check:ui`
- `npm run check:campaign`

Primary deliverables:

- fail cases
- lockout review
- copy/flow adjustments if needed

#### TASK-027 Gameplay Micro-Bug Intake Wave

- Owner: `gameplay-owner`
- Workstream: `WS-01 Gameplay Core`
- Suggested Agent: `docs/agents/gameplay-systems-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- collect and resolve small gameplay inconsistencies discovered during live play without reopening broad refactor work

Checks:

- `npm run check:gameplay`
- `npm run check:campaign` if campaign data is touched

Primary deliverables:

- targeted fixes
- matching guardrails

### TENTACLEWARS TRACK

#### TASK-TW-001 TentacleWars Mode Skeleton

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/meta-progression-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- add a clean mode boundary for `TentacleWars` without destabilizing `NodeWARS`

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/game-state-progression-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`

Primary deliverables:

- mode selection plumbing
- runtime boundary for the new mode
- no behavior drift in existing NodeWARS mode

#### TASK-TW-002 TentacleWars Grade Table and Packet Core

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- implement the TentacleWars grade table, hysteresis, packet accumulator, and per-grade packet throughput

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- grade thresholds
- packet accumulator model
- parameterized packet throughput table

#### TASK-TW-003 TentacleWars Tentacle Cost and Refund

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- implement linear distance-only tentacle cost, progressive growth payment, and full refund semantics for the new mode

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- distance-only cost rule
- progressive build commitment
- full refund on cancel/retract

#### TASK-TW-004 TentacleWars Overflow and Capture Core

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- implement split-equal overflow, neutral acquisition cost, hostile reset + carryover, and packet-aware lane payout

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- overflow mode parameterization
- neutral capture acquisition model
- hostile capture reset and carryover rule

#### TASK-TW-005 TentacleWars Sandbox Prototype

- Owner: `campaign-level-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/content-authored-levels-agent.md`
  - `docs/agents/meta-progression-agent.md`
  - `docs/agents/render-visual-language-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- ship one randomized TentacleWars sandbox phase with player, red, purple, and neutrals for mechanic validation

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/campaign-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`

Primary deliverables:

- first playable TentacleWars prototype
- randomized sandbox layout
- mode-select flow into the prototype

#### TASK-TW-006 TentacleWars AI Phase 1

- Owner: `ai-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/ai-behavior-agent.md`
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- add red and purple AI behavior adapted to packet flow, overflow pressure, and purple slice identity in the new mode

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- red AI for TentacleWars mode
- purple disruptive slice behavior
- parameterized hostility mode

#### TASK-TW-007 Packet-Native Lane Runtime

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `jupyter-notebook`
  - `spreadsheet`
- Priority: `high`
- Status: `completed`

Goal:

- replace the current partial continuous-lane bridge with real packet-native lane emission and travel in the TentacleWars sandbox

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`
- `node scripts/input-harness.mjs` if input timing changes

Primary deliverables:

- packet-native lane accumulator runtime
- packet travel/update rules
- sandbox packet emission driven by TentacleWars throughput

#### TASK-TW-008 TentacleWars Capture Runtime Integration

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `jupyter-notebook`
- Priority: `high`
- Status: `completed`

Goal:

- make neutral and hostile capture resolve from live TentacleWars packet events instead of the current bridge logic

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- packet-driven neutral acquisition
- packet-driven hostile takeover
- live reset-plus-carryover resolution

#### TASK-TW-009 TentacleWars Sandbox Playtest and Tuning Wave A

- Owner: `campaign-level-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/ai-behavior-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `jupyter-notebook`
  - `spreadsheet`
  - `doc`
- Priority: `high`
- Status: `completed`

Goal:

- run the first real TentacleWars sandbox playtest wave and tune packet, overflow, capture, and AI pressure using live evidence

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`
- `node scripts/ui-dom-sanity.mjs` if sandbox UI changes

Primary deliverables:

- first tuning log for the TentacleWars sandbox
- packet and overflow adjustments backed by playtest notes
- documented follow-up decisions

#### TASK-TW-010 TentacleWars Lane and Packet Visual Language

- Owner: `render-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/ui-ux-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `screenshot`
  - `figma`
- Priority: `medium`
- Status: `completed`

Goal:

- give the TentacleWars sandbox a packet-native lane look that clearly differs from NodeWARS without destabilizing the current render stack

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/ui-dom-sanity.mjs` if HUD or overlays change

Primary deliverables:

- clearer packet motion
- stronger overflow feel
- more readable TentacleWars lane identity

#### TASK-TW-015 TentacleWars Visual Density Wave B

- Owner: `render-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
  - `screenshot`
- Priority: `low`
- Status: `completed`

Goal:

- run a narrower follow-up pass only for very dense late-fight overlap readability after the first full TentacleWars visual identity wave is stable

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- improved corridor separation in high-density fights
- conflict-tested clash / slice readability under overlap
- updated visual comparison captures

#### TASK-TW-016 TentacleWars Fidelity Safety Rails

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
- Priority: `medium`
- Status: `completed`

Goal:

- lock the TentacleWars sandbox away from fidelity-breaking NodeWARS world gimmicks and temporary power systems

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`
- `node scripts/commentary-policy.mjs`

Primary deliverables:

- sandbox-only disablement of hazards, pulsars, fog, signal towers, and auto-retract
- sandbox frenzy disablement in both bookkeeping and node regen flow
- smoke guardrails proving those safety rails stay active

#### TASK-TW-017 TentacleWars Controlled Scenario Presets

- Owner: `campaign-level-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/content-authored-levels-agent.md`
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
- Priority: `medium`
- Status: `completed`

Goal:

- add deterministic sandbox scenario presets for slice, clash, capture, and density validation so future TentacleWars tuning is not bottlenecked by random layouts

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/campaign-sanity.mjs` if config-authoring surfaces change

Primary deliverables:

- preset scenario entry points for debug playtest loops
- at least one dense-overlap repro case and one slice/clash repro case
- documented browser workflow for using those presets

#### TASK-TW-018 TentacleWars Sandbox Playtest and Tuning Wave B

- Owner: `campaign-level-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/ai-behavior-agent.md`
  - `docs/agents/render-visual-language-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
  - `spreadsheet`
- Priority: `medium`
- Status: `completed`

Goal:

- run the next TentacleWars tuning wave on top of controlled scenarios so slice, clash, capture timing, and overlap readability can be judged against repeatable evidence

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- scenario-based playtest notes
- tightened tuning decisions backed by repeatable captures
- follow-up bug list trimmed to residual polish instead of fidelity drift

#### TASK-TW-019 TentacleWars HUD and Card Fidelity Contract

- Owner: `ui-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
  - `screenshot`
- Priority: `high`
- Status: `completed`

Goal:

- replace TentacleWars card and HUD leak-through from NodeWARS with a mode-owned presentation contract for grade, slots, regen, and capture semantics

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`

Primary deliverables:

- grade label rendering based on TentacleWars names and thresholds
- slot presentation that shows the mode-appropriate available-capacity semantics
- removal of remaining NodeWARS-only labels or level scales from TentacleWars cards

#### TASK-TW-020 TentacleWars Node Grade Silhouette Pass

- Owner: `render-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
  - `screenshot`
- Priority: `medium`
- Status: `completed`

Goal:

- give each TentacleWars grade a clearer silhouette and progression read so cells feel closer to the original grade fantasy instead of a soft NodeWARS variant

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- clearer visual distinction between grade states
- mode-specific grade presentation notes
- browser captures for all major grade steps

#### TASK-TW-021 TentacleWars Tentacle Motion and Material Pass

- Owner: `render-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
  - `screenshot`
- Priority: `high`
- Status: `completed`

Goal:

- rework the visual material and motion feel of TentacleWars lanes, slice retraction, and clash so tentacles stop reading as modified NodeWARS pipes

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- cleaner living-tissue lane material
- retraction and clash motion review against TentacleWars feel targets
- browser captures for idle, slice, clash, and dense-overlap cases

#### TASK-TW-022 TentacleWars Visual Regression Matrix

- Owner: `qa-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/qa-checks-agent.md`
  - `docs/agents/render-visual-language-agent.md`
  - `docs/agents/ui-ux-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
  - `screenshot`
- Priority: `medium`
- Status: `completed`

Goal:

- turn the core TentacleWars visual checks into a repeatable capture matrix so future waves stop regressing cards, slots, lane feel, and overlap readability

Checks:

- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- named capture scenarios
- expected artifacts for node grades, cards, clash, slice, and density
- documented visual acceptance checklist

#### TASK-TW-023 TentacleWars Grade Slot Table Reconciliation

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `spreadsheet`
  - `playwright`
- Priority: `high`
- Status: `completed`

Goal:

- reconcile the authoritative TentacleWars per-grade tentacle-cap table against the current fixed-three-slot implementation so mechanics and UI stop relying on assumptions

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/tw-grade-sanity.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/simulation-soak.mjs` if the live slot rules change

Primary deliverables:

- documented authoritative slot-cap table by TentacleWars grade
- mode-owned slot-cap helper updated to that table
- UI and AI surfaces aligned to the same authoritative slot-cap data

Outcome:

- authoritative slot table frozen as `Spore=1`, `Embryo=2`, `Pulsar=2`, `Gamma=2`, `Solar=3`, `Dominator=3`
- `GameNode.maxSlots` now resolves TentacleWars slot caps from grade instead of a fixed `3`
- UI, input, and AI surfaces now read the same grade-owned slot source through `n.maxSlots`

### TENTACLEWARS CAMPAIGN TRACK

#### TASK-TWL-001 TentacleWars Campaign Product Spec

- Owner: `campaign-level-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/content-authored-levels-agent.md`
- Priority: `high`
- Status: `planned`

Goal:

- freeze the product relationship between `NodeWARS campaign`, `TentacleWars sandbox`, and the future `TentacleWars campaign`

Checks:

- none required before implementation work starts

Primary deliverables:

- campaign product spec
- mode coexistence rules
- rollout plan by world

#### TASK-TWL-002 TentacleWars Level Data Schema

- Owner: `content-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/content-authored-levels-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `high`
- Status: `planned`

Goal:

- define the canonical `JS object` schema for TentacleWars campaign level authoring

Checks:

- none required before implementation work starts

Primary deliverables:

- canonical schema doc
- field definitions
- validation expectations for future sanity checks

#### TASK-TWL-003 TentacleWars Progression and Score Spec

- Owner: `ui-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/meta-progression-agent.md`
- Priority: `high`
- Status: `planned`

Goal:

- define the progression, result, star, and save-state rules for the separate TentacleWars campaign

Checks:

- none required before implementation work starts

Primary deliverables:

- progression spec
- scoring/result spec
- save namespace plan

#### TASK-TWL-004 TentacleWars Obstacle Spec

- Owner: `gameplay-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/render-visual-language-agent.md`
- Priority: `medium`
- Status: `planned`

Goal:

- define the first-phase amoeba blocker contract for the TentacleWars campaign

Checks:

- none required before implementation work starts

Primary deliverables:

- obstacle semantics
- geometry contract
- world-one integration notes

#### TASK-TWL-005 TentacleWars Campaign Loader

- Owner: `gameplay-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/meta-progression-agent.md`
- Priority: `high`
- Status: `planned`

Goal:

- add a dedicated level-loading path for TentacleWars campaign content without destabilizing NodeWARS campaign flow

Checks:

- `node scripts/campaign-sanity.mjs`
- `node scripts/game-state-progression-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`

Primary deliverables:

- separate campaign loader
- mode-aware level source routing
- safe coexistence with NodeWARS campaign

#### TASK-TWL-006 TentacleWars Campaign State Namespace

- Owner: `meta-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/meta-progression-agent.md`
  - `docs/agents/ui-ux-agent.md`
- Priority: `high`
- Status: `needs-validation`

Goal:

- isolate TentacleWars campaign save/progression from NodeWARS progression

Checks:

- `node scripts/game-state-progression-sanity.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- separate save namespace
- separate progression rules
- safe debug-world handling

#### TASK-TWL-007 TentacleWars Campaign Sanity Suite

- Owner: `qa-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/qa-checks-agent.md`
  - `docs/agents/campaign-level-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- create campaign sanity coverage for the new TentacleWars campaign track

Checks:

- `node scripts/tw-campaign-sanity.mjs`

Primary deliverables:

- TentacleWars campaign sanity coverage
- world continuity rules
- level metadata validation

#### TASK-TWL-008 TentacleWars World 1 Authoring Pack

- Owner: `content-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/content-authored-levels-agent.md`
  - `docs/agents/campaign-level-agent.md`
- Priority: `high`
- Status: `planned`

Goal:

- author the first TentacleWars world as a reconstructed onboarding world with low-cap pacing and early obstacle introduction

Checks:

- `node scripts/campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- World 1 authored level pack
- world-one pacing notes
- reconstruction references per phase

Outcome:

- `TWL-008` was split into:
  - `TWL-008a` for `W1-01..W1-05` pipeline validation
  - `TWL-008b` for `W1-06..W1-20` after the gate is proven

#### TASK-TWL-009 TentacleWars World 1 Playtest and Reconstruction Review

- Owner: `campaign-level-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `medium`
- Status: `planned`

Goal:

- verify World 1 readability, reconstruction fidelity, and scoring targets before moving to World 2

Checks:

- `node scripts/campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/ui-actions-sanity.mjs` if campaign UI changes

Primary deliverables:

- world-one playtest notes
- reconstruction deviations log
- approved follow-up fixes

#### TASK-TWL-010 TentacleWars World 2 Authoring Pack

- Owner: `content-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/content-authored-levels-agent.md`
  - `docs/agents/ai-behavior-agent.md`
- Priority: `high`
- Status: `planned`

Goal:

- author the second TentacleWars world, including the first purple pressure arc

Checks:

- `node scripts/campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/tw-ai-sanity.mjs`

Primary deliverables:

- World 2 authored level pack
- purple-introduction curve
- reconstruction notes per phase

#### TASK-TWL-011 TentacleWars World 2 Playtest and Reconstruction Review

- Owner: `campaign-level-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/ai-behavior-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- validate World 2 pacing, purple reveal, and mid-game reconstruction before World 3 authoring

Checks:

- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/commentary-policy.mjs`

Primary deliverables:

- world-two playtest log
- purple-fidelity findings
- approved follow-up fixes

#### TASK-TWL-012 TentacleWars World 3 Authoring Pack

- Owner: `content-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/content-authored-levels-agent.md`
  - `docs/agents/render-visual-language-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- author the third TentacleWars world with advanced routing density and labyrinth identity

Checks:

- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/commentary-policy.mjs`

Primary deliverables:

- World 3 authored level pack
- layout-density notes
- reconstruction notes per phase

#### TASK-TWL-013 TentacleWars World 3 Playtest and Reconstruction Review

- Owner: `campaign-level-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/render-visual-language-agent.md`
- Priority: `medium`
- Status: `planned`

Goal:

- validate World 3 readability and density before the final world

Checks:

- `node scripts/campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- world-three playtest log
- density-fidelity findings
- approved follow-up fixes

#### TASK-TWL-014 TentacleWars World 4 Authoring Pack

- Owner: `content-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/content-authored-levels-agent.md`
  - `docs/agents/ai-behavior-agent.md`
- Priority: `high`
- Status: `planned`

Goal:

- author the final TentacleWars world and late-game reconstruction arc

Checks:

- `node scripts/campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/tw-ai-sanity.mjs`

Primary deliverables:

- World 4 authored level pack
- late-game pacing notes
- reconstruction notes per phase

#### TASK-TWL-015 TentacleWars World 4 Playtest and Reconstruction Review

- Owner: `campaign-level-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `medium`
- Status: `planned`

Goal:

- validate the final world and late-game reconstruction before release readiness

Checks:

- `node scripts/campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- world-four playtest log
- final reconstruction gap list
- release-facing follow-up decisions

#### TASK-TWL-016 TentacleWars Level Preview and Jump Tools

- Owner: `tooling-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- add practical debug entry points for previewing TentacleWars campaign levels during authoring

Checks:

- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`
- `node scripts/tw-preview-jump-sanity.mjs`
- `node scripts/game-state-progression-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- level jump tools
- preview entry points
- authoring convenience hooks

#### TASK-TWL-017 TentacleWars Spreadsheet Balance Matrix

- Owner: `tooling-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/campaign-level-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Priority: `low`
- Status: `completed`

Goal:

- maintain a spreadsheet-friendly balance matrix for TentacleWars campaign phase authoring

Checks:

- `node scripts/tw-balance-matrix-sanity.mjs`

Primary deliverables:

- balance matrix
- world-by-world metadata sheet
- tuning support notes

#### TASK-TWL-018 TentacleWars Phase Editor Feasibility Review

- Owner: `tooling-owner`
- Workstream: `WS-TWL TentacleWars Campaign`
- Suggested Agents:
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/content-authored-levels-agent.md`
- Priority: `low`
- Status: `planned`

Goal:

- review whether a dedicated phase editor would actually pay off after the first authored world

Checks:

- none required before implementation work starts

Primary deliverables:

- editor feasibility review
- recommendation to proceed or defer

#### TASK-TW-011 TentacleWars Sandbox UX and Debug Tools

- Owner: `ui-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/meta-progression-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `playwright`
  - `playwright-interactive`
  - `doc`
- Priority: `medium`
- Status: `completed`

Goal:

- add sandbox-specific HUD/debug readouts so packet, overflow, capture, and AI behavior can be tuned quickly without contaminating the stable game mode

Checks:

- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- TentacleWars sandbox debug panel
- packet/overflow readouts
- safer iteration flow for future tuning waves

#### TASK-TW-012 Browser Visual Validation Framework

- Owner: `qa-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/qa-checks-agent.md`
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/gameplay-systems-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
  - `screenshot`
- Priority: `high`
- Status: `completed`

Goal:

- add a reliable browser-driven visual test workflow so Codex can inspect live gameplay mechanics directly on the web page instead of relying only on code-level guardrails

Checks:

- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- stable local browser test entry for gameplay
- reproducible screenshot capture for live mechanic states
- text/debug state export aligned with visible gameplay
- documented Codex workflow for visual validation loops

#### TASK-TW-013 TentacleWars Draw-Connect Fidelity Input

- Owner: `ui-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/ui-ux-agent.md`
  - `docs/agents/gameplay-systems-agent.md`
  - `docs/agents/qa-checks-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `playwright`
- Priority: `medium`
- Status: `completed`

Goal:

- move TentacleWars input closer to draw-to-connect as the primary fantasy while keeping the shared shell stable during phase 1

Checks:

- `node scripts/input-harness.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/smoke-checks.mjs`

Primary deliverables:

- TentacleWars draw-connect primary path
- click-connect compatibility fallback if still desired
- documented mode-specific input semantics

#### TASK-TW-014 TentacleWars Focused Sanity Suites

- Owner: `qa-owner`
- Workstream: `WS-TW TentacleWars Mode`
- Suggested Agents:
  - `docs/agents/qa-checks-agent.md`
  - `docs/agents/gameplay-systems-agent.md`
- Suggested Skills:
  - `develop-web-game`
  - `jupyter-notebook`
- Priority: `medium`
- Status: `completed`

Goal:

- add TentacleWars-focused sanity suites so fidelity work can be verified directly instead of relying only on the broad shared smoke suite

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- `tw-energy-sanity`
- `tw-grade-sanity`
- `tw-ai-sanity`
- documented local check usage for TentacleWars waves

### LATER

#### TASK-037 Enemy Slice Pressure Wave

- Owner: `ai-owner`
- Workstream: `WS-02 AI and Factions`
- Suggested Agent: `docs/agents/ai-behavior-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- make enemy slicing a real tactical mechanic, centered on purple first and conserved through the canonical slice path

Checks:

- `npm run check:gameplay`
- `npm run check:campaign`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- coalition slice pressure
- configurable slice cooldowns and thresholds
- source-side burst cuts used as a real tempo tool

#### TASK-038 AI Tactical State Profiles

- Owner: `ai-owner`
- Workstream: `WS-02 AI and Factions`
- Suggested Agent: `docs/agents/ai-behavior-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- add a lightweight tactical state layer so AI intent shifts between expand, pressure, support, finish, and recover

Checks:

- `npm run check:gameplay`
- `npm run check:campaign`

Primary deliverables:

- explicit tactical state derivation
- score shaping by tactical mode
- more readable intent changes during live play

#### TASK-039 AI Structural Weakness Scoring

- Owner: `ai-owner`
- Workstream: `WS-02 AI and Factions`
- Suggested Agent: `docs/agents/ai-behavior-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- improve punishment of exposed player structure and weakly supported fronts

Checks:

- `npm run check:gameplay`
- `npm run check:campaign`

Primary deliverables:

- isolated node pressure
- weak support punishment
- exposed branching punishment

#### TASK-040 Purple Faction Identity Wave

- Owner: `ai-owner`
- Workstream: `WS-02 AI and Factions`
- Suggested Agent: `docs/agents/ai-behavior-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- broaden purple identity into a more opportunistic, lethal, and slice-driven opponent without adding non-canonical mechanics

Checks:

- `npm run check:gameplay`
- `node scripts/simulation-soak.mjs`

Primary deliverables:

- stronger finish windows
- more decisive slice pressure
- clearer faction differentiation from red AI

#### TASK-041 AI Playtest and Tuning Matrix

- Owner: `ai-owner`
- Workstream: `WS-02 AI and Factions`
- Suggested Agent: `docs/agents/ai-behavior-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- capture the implemented AI wave in a structured tuning doc for later playtest review

Checks:

- `npm run check:gameplay`

Primary deliverables:

- AI wave report
- tuning reference for follow-up playtests

#### TASK-030 AI Quality and Faction Behavior Wave

- Owner: `ai-owner`
- Workstream: `WS-02 AI and Factions`
- Suggested Agent: `docs/agents/gameplay-systems-agent.md`
- Priority: `high`
- Status: `completed`

Goal:

- improve AI quality without turning it into a heavy planner:
  - reduce wasteful overcommit
  - increase kill-confirm pressure
  - improve coalition support behavior
  - improve continuation of allied neutral captures

Checks:

- `npm run check:gameplay`
- `npm run check:campaign`
- `npm run check:full` if shared gameplay rules drift

Primary deliverables:

- stronger faction identity
- less erratic target commitment
- better coalition pressure on player and neutral fronts

#### TASK-028 Deterministic Input Harness

- Owner: `input-owner`
- Workstream: `WS-04 UI/UX e Render`
- Suggested Agent: `docs/agents/ui-ux-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- add a lightweight harness for click / drag / slice transitions beyond current source- and DOM-lite checks

#### TASK-029 Release Readiness Wave

- Owner: `performance-build-owner`
- Workstream: `WS-06 Ports e Build Pipeline`
- Suggested Agent: `docs/agents/performance-build-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- prepare the repo for Linux desktop packaging and Android packaging by turning the current reports into executable build tasks

#### TASK-031 AI Scoring Module Extraction

- Owner: `ai-owner`
- Workstream: `WS-02 AI and Factions`
- Suggested Agent: `docs/agents/gameplay-systems-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- extract move-candidate construction and target scoring into dedicated helpers/modules if AI heuristics continue to grow

Checks:

- `npm run check:gameplay`
- `npm run check:campaign`

Primary deliverables:

- clearer AI ownership boundaries
- easier future balance iteration

#### TASK-032 Audio Scheduling and Cooldown Canonicalization

- Owner: `performance-build-owner`
- Workstream: `WS-05 Performance and Robustness`
- Suggested Agent: `docs/agents/performance-build-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- replace the remaining ad-hoc SFX timing and cooldown scheduling with a cleaner, more portable approach

Checks:

- `npm run check:ui`
- `npm run check:full` if the audio timing layer changes materially

Primary deliverables:

- audio cooldown timing cleanup
- less reliance on wall-clock fallback and chained `setTimeout(...)`
- clearer audio event scheduling ownership

#### TASK-033 ScreenController Composition Split Phase 2

- Owner: `ui-owner`
- Workstream: `WS-04 UI/UX and Render`
- Suggested Agent: `docs/agents/ui-ux-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- continue splitting large screen-composition responsibilities out of `ScreenController.js`

Checks:

- `npm run check:ui`
- `npm run check:content`

Primary deliverables:

- smaller screen-building modules
- less inline HTML assembly in the controller
- lower UI regression risk in settings/story/result/ending surfaces

#### TASK-034 GameState Progression Sanity Mini-Suite

- Owner: `qa-owner`
- Workstream: `WS-05 Performance and Robustness`
- Suggested Agent: `docs/agents/qa-checks-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- add focused progression-state checks for unlock, next-level, tutorial completion, and manual world overrides

Checks:

- `npm run check`

Primary deliverables:

- a dedicated progression sanity layer
- less reliance on broader smoke checks for meta-state regressions

#### TASK-035 Tutorial State Machine Extraction Review

- Owner: `ui-owner`
- Workstream: `WS-04 UI/UX and Render`
- Suggested Agent: `docs/agents/content-authored-levels-agent.md`
- Priority: `medium`
- Status: `completed`

Goal:

- review whether the tutorial state machine should be partially extracted now that the rigid gating model is stable

Checks:

- `npm run check:ui`
- `npm run check:campaign`

Primary deliverables:

- recommendation or extraction plan for the next tutorial refactor seam
- clearer ownership between tutorial copy, gating, and ghost guidance

#### TASK-036 Commentary and Constant-Tuning Alignment Sweep

- Owner: `docs-owner`
- Workstream: `WS-04 UI/UX and Render`
- Suggested Agent: `docs/agents/code-commentary-agent.md`
- Priority: `low`
- Status: `completed`

Goal:

- run a focused pass on comments and tuning notes in the remaining hotspots so the current rules stay easy to read and tune

Checks:

- domain checks touched by the sweep

Primary deliverables:

- comments aligned with current implementation
- constant blocks easier to tune without external context

## Post-Stabilization Follow-Up Tasks

### TASK-023 Campaign Progression Canonicalization

- Owner: `meta-owner`
- Priority: `high`
- Status: `completed`

Problem:

- some menu/result/tutorial flows still derived the next phase from `curLvl + 1`, which was fragile and obscured the intended tutorial rule

Goal:

- centralize next-phase resolution in `GameState`
- keep tutorials optional for unlock while preserving the natural world-to-world transition into the next tutorial

Validation:

- smoke checks protect World 1, 2, and 3 optional tutorial unlocks
- finishing a world still naturally routes to the next world's tutorial

### TASK-024 Result Summary Truthfulness Pass

- Owner: `ui-owner`
- Priority: `medium`
- Status: `completed`

Problem:

- result copy implied that configured enemy starts were literally eliminated during the match

Goal:

- make the summary wording truthful without requiring a full combat telemetry system

Validation:

- result screen copy no longer claims literal eliminations from static config counts

## Wave 1: Critical Gameplay Hardening

### TASK-001 Ownership Transition Canonicalization

- Owner: `simulation-owner`
- Priority: `critical`
- Status: `completed`
- Depends on: `current-gameplay-baseline`

Problem:

- Ownership changes are applied in multiple places with repeated side effects:
  - capture
  - enemy kill
  - burst impact
  - middle-cut direct application

Goal:

- create one canonical helper for ownership transition and invalid-link cleanup

Target files:

- `src/entities/Tent.js`
- possible helper module under `src/domain/capture` or equivalent

Validation:

- ownership flip behavior unchanged
- invalid opposing links are consistently removed
- smoke checks cover at least one capture and one burst-driven flip path

Done criteria:

- repeated ownership-flip logic is materially reduced
- subsystem doc exists or is updated

### TASK-002 Player Relay Interaction Consistency

- Owner: `input-owner`
- Priority: `critical`
- Status: `completed`
- Depends on: `current-gameplay-baseline`

Problem:

- player hover and touch pinning currently exclude relay nodes in some paths
- docs/tutorial/AI now treat relays as meaningful targets

Goal:

- make player interaction with relays consistent across click, hover, and touch paths

Target files:

- `src/core/Game.js`
- `src/rendering/UIRenderer.js`
- any related tutorial or HUD text only if needed

Validation:

- player can meaningfully inspect and target relays
- no regression in normal node selection

Done criteria:

- relay interaction is coherent across input modes

### TASK-003 Contest Logic Generalization for All Owners

- Owner: `simulation-owner`
- Priority: `critical`
- Status: `completed`
- Depends on: `current-gameplay-baseline`

Problem:

- contest cancellation and related ownership assumptions still contain owner-specific shortcuts

Goal:

- make neutral contest resolution fully owner-agnostic for owners 1, 2, and 3

Target files:

- `src/entities/Tent.js`

Validation:

- owner 3 contesting neutral cells behaves symmetrically
- no owner-specific hard-coded rival assumption remains in contest logic

Done criteria:

- contest rules are generic and easier to reason about

### TASK-004 Gameplay Comments and Doc Alignment

- Owner: `docs-owner`
- Priority: `high`
- Status: `largely completed`
- Depends on:
  - `TASK-001`
  - `TASK-002`
  - `TASK-003`

Problem:

- several code comments and docs historically drifted from actual behavior

Goal:

- align code comments and implementation docs with current rule truth

Target files:

- `README.md`
- implementation docs under `docs/implementation/`
- gameplay-critical comments in `src/entities/Tent.js`, `src/core/Game.js`, `src/systems/Physics.js`

Validation:

- no known contradiction remains between docs and current code for fixed systems

Done criteria:

- comments help, not mislead

## Wave 2: Canonical Rule Extraction

### TASK-005 Energy Budget Resolver Extraction

- Owner: `simulation-owner`
- Priority: `high`
- Status: `completed`
- Depends on:
  - `TASK-001`
  - `TASK-003`

Problem:

- energy budgeting is spread across node regen, physics out counts, and tentacle drain

Goal:

- introduce a single explicit energy-budget resolver or helper layer

Target files:

- `src/entities/GameNode.js`
- `src/systems/Physics.js`
- `src/entities/Tent.js`

Validation:

- relay and non-relay feed logic still pass smoke checks
- no hidden duplicated budget formula remains

Done criteria:

- energy budget rule is identifiable from one primary module

### TASK-006 Tentacle Lifecycle Split

- Owner: `simulation-owner`
- Priority: `high`
- Status: `completed`
- Depends on:
  - `TASK-005`

Problem:

- `Tent.js` still owns too many rule concerns in one file

Goal:

- split tentacle lifecycle into clearly named internal helpers or submodules:
  - growth
  - active flow
  - clash
  - cut/burst

Target files:

- `src/entities/Tent.js`
- optional extracted helpers

Validation:

- behavior-preserving refactor
- smoke checks unchanged and green

Done criteria:

- tentacle lifecycle is readable in sections with clear names

### TASK-007 Ownership Color Canonicalization Completion

- Owner: `render-owner`
- Priority: `high`
- Status: `largely completed`
- Depends on:
  - `current-gameplay-baseline`

Problem:

- owner color handling has improved, but render paths still need a final audit for drift

Goal:

- ensure every owner-facing palette path uses the shared owner-color utilities

Target files:

- `src/theme/ownerPalette.js`
- all renderers
- any UI labels or relay-specific visuals still using local fallbacks

Validation:

- owner 1, 2, 3 all render consistently
- smoke palette checks stay green

Done criteria:

- no gameplay-facing owner-color path uses ad hoc palette logic

### TASK-008 AI Action Canonicalization Audit

- Owner: `ai-owner`
- Priority: `high`
- Status: `largely completed`
- Depends on:
  - `TASK-001`
  - `TASK-005`

Problem:

- AI logic is better aligned than before, but still needs a pass to ensure all special actions route through canonical player-equivalent mechanics

Goal:

- identify and remove remaining AI-only mechanic drift

Target files:

- `src/systems/AI.js`

Validation:

- AI uses shared helpers for cuts, ownership consequences, and target validation where applicable

Done criteria:

- no known bespoke AI combat rule remains without explicit justification

## Wave 3: Parameterization

### TASK-009 Domain Config Taxonomy

- Owner: `config-owner`
- Priority: `high`
- Status: `largely completed`
- Depends on:
  - `TASK-005`
  - `TASK-008`

Problem:

- gameplay constants exist, but domains are still mixed and some thresholds remain embedded in code

Goal:

- reorganize config by domain and intent

Target files:

- `src/config/gameConfig.js`
- optional domain config files

Validation:

- no gameplay-critical magic number remains in touched systems
- constants have unit-aware comments

Done criteria:

- gameplay tuning is centralized and legible

### TASK-010 Input Threshold Parameterization

- Owner: `input-owner`
- Priority: `medium`
- Status: `completed`
- Depends on:
  - `TASK-009`

Problem:

- hover, touch, long-press, and slicing thresholds are embedded in event code

Goal:

- move input-feel thresholds into named config values

Target files:

- `src/core/Game.js`
- config files or constants

Validation:

- input feel preserved
- thresholds discoverable and documented

Done criteria:

- input tuning no longer depends on reading event code literals

## Wave 4: Modularization and Naming

### TASK-011 `Game.js` Orchestration Reduction

- Owner: `architecture-owner`
- Priority: `medium`
- Status: `largely completed`
- Depends on:
  - `TASK-006`
  - `TASK-010`

Problem:

- `Game.js` still mixes orchestration with direct rule ownership

Goal:

- move command interpretation and rule-heavy helpers out of `Game.js`

Target files:

- `src/core/Game.js`
- extracted input/command modules

Validation:

- loop order preserved
- behavior unchanged

Done criteria:

- `Game.js` reads primarily as the game coordinator

### TASK-012 Critical Naming Pass

- Owner: `naming-owner`
- Priority: `medium`
- Status: `largely completed`
- Depends on:
  - `TASK-005`
  - `TASK-006`
  - `TASK-009`

Problem:

- critical paths still use opaque abbreviations and inconsistent naming density

Goal:

- rename the highest-impact variables, methods, and helper functions in gameplay-critical paths using `docs/conventions/naming.md`

Target files:

- `src/entities/Tent.js`
- `src/systems/AI.js`
- `src/core/Game.js`
- shared helpers/config

Validation:

- behavior-preserving
- names are more explicit
- smoke checks stay green

Done criteria:

- the critical path is materially easier to read

## Current Completion Snapshot

Completed:

1. `TASK-001 Ownership Transition Canonicalization`
2. `TASK-002 Player Relay Interaction Consistency`
3. `TASK-003 Contest Logic Generalization for All Owners`
4. `TASK-005 Energy Budget Resolver Extraction`
5. `TASK-006 Tentacle Lifecycle Split`
6. `TASK-010 Input Threshold Parameterization`
7. `TASK-014 Final Tentacle Decomposition`
8. `TASK-015 Backlog and Documentation Reconciliation`
9. `TASK-016 Render Palette Canonicalization Final Pass`
10. `TASK-017 Screen Composition Split`
11. `TASK-018 World Systems Decomposition Final Pass`
12. `TASK-019 Long-Run Simulation Soak Checks`
13. `TASK-020 Render Performance Instrumentation`
14. `TASK-021 Campaign Balance Execution Wave A`
15. `TASK-022 Audio Event Density Audit`

Largely completed:

1. `TASK-004 Gameplay Comments and Doc Alignment`
2. `TASK-007 Ownership Color Canonicalization Completion`
3. `TASK-008 AI Action Canonicalization Audit`
4. `TASK-009 Domain Config Taxonomy`
5. `TASK-011 Game.js Orchestration Reduction`
6. `TASK-012 Critical Naming Pass`
7. `TASK-013 World Mechanics Boundary Isolation`

Partially completed:
- none in the original stabilization backlog

## Remaining High-Value Stabilization Tasks

### TASK-013 World Mechanics Boundary Isolation

- Owner: `architecture-owner`
- Priority: `high`
- Status: `largely completed`
- Depends on:
  - `TASK-009`
  - `TASK-011`

Problem:

- world-specific mechanics are cleaner than before, but still sit close to the core loop and core gameplay objects

Goal:

- make the boundary between core gameplay and world systems explicit

Target files:

- `src/core/Game.js`
- `src/systems/Physics.js`
- related world-specific renderers or docs if needed

Validation:

- no regression in hazard / pulsar / signal / fog behavior
- smoke checks remain green

Done criteria:
- world systems read as optional layered mechanics, not implicit core rules

## Wave 5: Focused Finish and Product Readiness

### TASK-016 Render Palette Canonicalization Final Pass

- Owner: `render-owner`
- Priority: `medium`
- Status: `completed`
- Depends on:
  - `TASK-007`
  - `TASK-012`

Problem:

- some render paths still keep local owner palette arrays or fallback theme decisions instead of routing fully through shared palette helpers

Goal:

- make owner palette logic fully canonical in the render layer

Target files:

- `src/theme/ownerPalette.js`
- `src/rendering/NodeRenderer.js`
- any remaining UI/render helpers with local palette duplication

Validation:

- no gameplay-facing owner palette is duplicated unnecessarily
- smoke checks remain green

Done criteria:

- render palette decisions are centralized and easier to evolve

### TASK-017 Screen Composition Split

- Owner: `frontend-owner`
- Priority: `medium`
- Status: `completed`
- Depends on:
  - `TASK-011`
  - `TASK-012`

Problem:

- `ScreenController.js` still mixes screen orchestration, DOM composition, and product-state formatting

Goal:

- extract screen-specific builders/helpers while preserving current behavior

Target files:

- `src/ui/ScreenController.js`
- optional new screen helper modules under `src/ui`

Validation:

- menu, level select, and result flows behave identically
- no theme or localization regression

Done criteria:

- screen logic is easier to change without touching unrelated screens

### TASK-018 World Systems Decomposition Final Pass

- Owner: `architecture-owner`
- Priority: `high`
- Status: `completed`
- Depends on:
  - `TASK-013`

Problem:

- `WorldSystems.js` still groups several layered mechanics into one large runtime module

Goal:

- split world mechanics by concern while keeping one coordinator entry point

Target files:

- `src/systems/WorldSystems.js`
- optional extracted world system modules

Validation:

- no regression in vortex, pulsar, fog, signal, auto-retract, or camera behavior
- smoke checks remain green

Done criteria:

- world mechanics are easier to test and tune independently

### TASK-019 Long-Run Simulation Soak Checks

- Owner: `test-owner`
- Priority: `high`
- Status: `completed`
- Depends on:
  - `TASK-018`

Problem:

- current checks strongly cover invariants, but not long-run simulation health

Goal:

- add a lightweight soak harness that fast-forwards stable scenarios and catches stalls or runaway state

Target files:

- new script under `scripts/`
- docs under `docs/test-notes/`

Validation:

- scripted long-run scenarios complete without energy explosion, deadlock drift, or queue runaway

Done criteria:

- repository has one repeatable long-run confidence check

### TASK-020 Render Performance Instrumentation

- Owner: `performance-owner`
- Priority: `medium`
- Status: `completed`
- Depends on:
  - `TASK-016`

Problem:

- graphics profiles exist, but there is no structured performance instrumentation beyond visible FPS

Goal:

- expose render complexity metrics for debug/perf review

Target files:

- `src/rendering/Renderer.js`
- debug-facing UI or snapshot helpers if needed

Validation:

- debug mode can report useful scene complexity metrics
- no noticeable runtime overhead in normal play

Done criteria:

- performance work can be driven by evidence instead of guesswork

### TASK-021 Campaign Balance Execution Wave A

- Owner: `level-owner`
- Priority: `high`
- Status: `completed`
- Depends on:
  - `campaign balance docs`

Problem:

- the campaign has a good review and tuning plan, but the first actual tuning wave has not been executed yet

Goal:

- run the first concrete balance pass on the critical authored phases

Target files:

- `src/config/gameConfig.js`
- relevant level-design docs

Validation:

- changes are justified phase by phase
- campaign sanity and smoke checks remain green

Done criteria:

- at least the priority phase set has explicit tuning decisions, not just analysis

### TASK-022 Audio Event Density Audit

- Owner: `sound-owner`
- Priority: `low`
- Status: `completed`
- Depends on:
  - `TASK-021`

Problem:

- dense combat moments have not yet been reviewed for event-spam or mix clutter

Goal:

- audit repeated event-triggered sounds and reduce audio mud in chaotic phases

Target files:

- `src/audio/Music.js`
- `src/audio/SoundEffects.js`

Validation:

- repeated cuts, captures, and pulsar events remain readable

Done criteria:

- audio remains clear during high-chaos gameplay

- world systems read as optional layered mechanics, not implicit core rules

### TASK-014 Final Tentacle Decomposition

- Owner: `simulation-owner`
- Priority: `high`
- Status: `completed`
- Depends on:
  - `TASK-006`
  - `TASK-012`

Problem:

- `Tent.js` is significantly cleaner, but still the densest gameplay file in the repository

Goal:

- decide whether clash / burst / geometry helpers should stay internal or move to dedicated modules

Target files:

- `src/entities/Tent.js`
- optional extracted helpers under `src/entities` or `src/systems`

Validation:

- behavior-preserving refactor
- smoke checks unchanged and green

Done criteria:

- remaining tentacle responsibilities are easier to reason about in isolation

### TASK-015 Backlog and Documentation Reconciliation

- Owner: `docs-owner`
- Priority: `high`
- Status: `completed`
- Depends on:
  - `stabilization-status`

Problem:

- planning docs and execution status drifted as implementation advanced

Goal:

- make roadmap, backlog, and implementation docs reflect the current real state

Target files:

- project docs under `docs/project/`
- status-facing implementation docs where needed

Validation:

- no major completed work remains marked only as planned

Done criteria:

- documentation can be used as an accurate handoff for the next phase

### TASK-016 Optional Expanded Behavior Checks

- Owner: `test-owner`
- Priority: `medium`
- Status: `completed`
- Depends on:
  - `TASK-013`
  - `TASK-014`

Problem:

- current smoke checks cover core invariants, but not deeper world-mechanic or edge-case behavior

Goal:

- add a second lightweight check layer only if it materially improves confidence

Target files:

- `scripts/`
- `docs/test-notes/`

Validation:

- checks stay fast and easy to run locally

Done criteria:

- behavior checks exist only where they add real signal

### TENTACLEWARS CAMPAIGN TRACK

Full task definitions with blocking done criteria and explicit dependencies:
`docs/project/tw-campaign-task-definitions.md`

Sequence and current status: `docs/project/operational-kanban.md`

#### TASK-TWL-001 TentacleWars Campaign Product Spec

- Owner: `campaign-level-owner`
- Workstream: `WS-TW TentacleWars Campaign`
- Status: `completed`
- Output: `docs/tentaclewars/tw-campaign-product-spec.md`

#### TASK-TWL-002 TentacleWars Level Data Schema

- Owner: `campaign-level-owner`
- Workstream: `WS-TW TentacleWars Campaign`
- Status: `active`
- Depends on: TWL-001 ✓

Checks:
- schema validator importable
- sample level passes
- one invalid object rejected with descriptive error

Output: `docs/tentaclewars/tw-level-data-schema.md` + `src/tentaclewars/TwLevelSchema.js`

#### TASK-TWL-003 TentacleWars Progression and Score Spec

- Owner: `meta-progression-owner`
- Workstream: `WS-TW TentacleWars Campaign`
- Status: `planned`
- Depends on: TWL-001 ✓
- Blocks: TWL-005, TWL-006

Output: `docs/tentaclewars/tw-progression-score-spec.md`

#### TASK-TWL-004 TentacleWars Obstacle Spec

- Owner: `campaign-level-owner`
- Workstream: `WS-TW TentacleWars Campaign`
- Status: `planned`
- Depends on: TWL-001 ✓
- Must close: static-circle vs composite-blob decision before TWL-008a

Output: `docs/tentaclewars/tw-obstacle-spec.md`

#### TASK-TWL-005 TentacleWars Campaign Loader

- Owner: `gameplay-owner`
- Workstream: `WS-TW TentacleWars Campaign`
- Status: `completed`
- Depends on: TWL-002 + TWL-003

Checks:
- `node scripts/tw-campaign-loader-sanity.mjs`
- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`

#### TASK-TWL-006 TentacleWars Campaign State Namespace

- Owner: `meta-progression-owner`
- Workstream: `WS-TW TentacleWars Campaign`
- Status: `completed`
- Depends on: TWL-003

Checks:
- `node scripts/game-state-progression-sanity.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/smoke-checks.mjs`

#### TASK-TWL-007 TentacleWars Campaign Sanity Suite

- Owner: `qa-owner`
- Workstream: `WS-TW TentacleWars Campaign`
- Status: `completed`
- Depends on: TWL-002
- Note: bootstraps sanity harness against fixture data; does not require authored levels

Checks: `node scripts/tw-campaign-sanity.mjs`

#### TASK-TWL-016 TentacleWars Level Preview and Jump Tools

- Owner: `qa-owner`
- Status: `completed`
- Depends on: TWL-005

Checks:
- `node scripts/tw-preview-jump-sanity.mjs`
- `node scripts/game-state-progression-sanity.mjs`
- `node scripts/ui-actions-sanity.mjs`
- `node scripts/ui-dom-sanity.mjs`
- `node scripts/smoke-checks.mjs`

#### TASK-TWL-017 TentacleWars Spreadsheet Balance Matrix

- Owner: `campaign-level-owner`
- Status: `completed`
- Depends on: TWL-002
- Must complete before TWL-008a

Checks: `node scripts/tw-balance-matrix-sanity.mjs`

#### TASK-TWL-008a TentacleWars World 1 Prototype

- Owner: `campaign-level-owner`
- Status: `completed`
- Depends on: all Phase B done
- Scope: W1-01..W1-05 — pipeline validation gate

Checks:
- `node scripts/tw-level-schema-sanity.mjs`
- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/tw-campaign-loader-sanity.mjs`
- `node scripts/tw-preview-jump-sanity.mjs`
- `node scripts/tw-balance-matrix-sanity.mjs`
- `node scripts/smoke-checks.mjs`

#### TASK-TWL-008b TentacleWars World 1 Complete

- Owner: `campaign-level-owner`
- Status: `completed`
- Depends on: TWL-008a pipeline confirmed
- Scope: W1-06..W1-20

Checks:
- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/tw-campaign-loader-sanity.mjs`
- `node scripts/tw-preview-jump-sanity.mjs`
- `node scripts/tw-balance-matrix-sanity.mjs`
- `node scripts/smoke-checks.mjs`

#### TASK-TWL-009 TentacleWars World 1 Playtest and Reconstruction Review

- Owner: `campaign-level-owner`
- Status: `needs validation`
- Depends on: TWL-008b

Checks:
- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/commentary-policy.mjs`

#### TASK-TWL-010 through TASK-TWL-015

Worlds 2, 3, 4 — same Authoring Pack + Playtest Review structure per world.
Open only after the previous world's playtest review is done.

#### TASK-TWL-018 TentacleWars Phase Editor Feasibility Review

- Status: `planned`
- Phase G — feasibility assessment only, not implementation commitment

---

## Suggested Immediate Execution Order

1. `TASK-015 Backlog and Documentation Reconciliation`
2. `TASK-013 World Mechanics Boundary Isolation`
3. `TASK-014 Final Tentacle Decomposition`
4. `TASK-009 Domain Config Taxonomy`
5. `TASK-011 Game.js Orchestration Reduction`
6. `TASK-012 Critical Naming Pass`
7. `TASK-004 Gameplay Comments and Doc Alignment`
8. `TASK-016 Optional Expanded Behavior Checks`

## Delegation Mechanism

When opening a task for implementation:

1. copy `docs/project/task-template.md`
2. instantiate it as a task note or issue
3. assign a single owner
4. list target files before coding
5. define the canonical rule owner
6. define required smoke checks

This keeps the stabilization effort incremental and auditable.
