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
- `docs/implementation/*.md`
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

- `docs/project/*.md`
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
