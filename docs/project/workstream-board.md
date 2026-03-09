# Workstream Board

## Purpose

This board organizes the stabilization phase of NodeWARS before any serious Tentacle Wars fidelity push.

Priority order:

1. stabilize the current game
2. remove bugs and inconsistencies
3. canonicalize rules and module boundaries
4. parameterize and document
5. only then move toward high-fidelity Tentacle Wars behavior

## Operating Rules

- No large mechanic rewrites without a baseline document and a smoke check.
- Every workstream must define one canonical owner for each rule it touches.
- Every meaningful change must update at least one of:
  - smoke checks
  - subsystem implementation doc
  - naming/convention docs
- Refactors must preserve behavior unless the task explicitly authorizes a gameplay change.
- Prefer extracting shared helpers over duplicating logic in AI, UI, or world systems.

## Owners

- `tech-lead`
  - approves rule decisions
  - resolves tradeoffs between stability and fidelity
- `simulation-owner`
  - energy, tentacles, capture, clash, ownership transitions
- `ai-owner`
  - target scoring, action selection, shared action usage
- `input-owner`
  - mouse, touch, gestures, selection, slicing responsiveness
- `render-owner`
  - owner palettes, HUD consistency, readable feedback
- `config-owner`
  - centralization of tunables and removal of magic numbers
- `docs-owner`
  - implementation docs, conventions, roadmap hygiene
- `test-owner`
  - smoke checks and lightweight behavior checks

## Phase Plan

### Phase 0. Baseline and Guardrails

Goal:
- freeze understanding of current behavior before large edits

Tasks:
- maintain `docs/implementation/codex-audit.md`
- maintain `docs/implementation/current-gameplay-baseline.md`
- keep `scripts/smoke-checks.mjs` green
- define canonical gameplay rules by subsystem

Definition of done:
- baseline doc exists and is current
- smoke checks run locally in one command

### Phase 1. Critical Gameplay Hardening

Goal:
- remove current gameplay bugs and contradictions without broad redesign

Tasks:
- fix incorrect or duplicated rule paths
- align code comments and docs with the real implementation
- normalize ownership change side effects
- normalize relay and burst behavior
- close input inconsistencies across mouse and touch

Definition of done:
- no known critical gameplay bug remains open
- every fixed bug has a note or check

### Phase 2. Canonical Rule Extraction

Goal:
- make every major mechanic have a single obvious entry point

Tasks:
- single canonical path for slice / burst
- single canonical path for ownership changes
- single canonical path for energy budgeting
- single canonical path for owner color selection
- single canonical path for AI actions equivalent to player actions

Definition of done:
- rule duplication is intentionally minimized
- subsystem docs identify canonical entry points

### Phase 3. Parameterization

Goal:
- remove magic numbers and move tunables into domain config

Tasks:
- create grouped config sections by domain
- attach unit-aware comments to every gameplay constant
- eliminate hidden thresholds from simulation code

Definition of done:
- gameplay-critical tuning is centralized
- constants are named by intent and unit

### Phase 4. Modularization

Goal:
- reduce `Game.js` and split simulation by responsibility

Tasks:
- extract command handling from `Game.js`
- extract tentacle sub-resolvers from `Tent.js`
- isolate world rule modules from core gameplay modules
- make dependencies explicit

Definition of done:
- `Game.js` is primarily coordination
- core rules are readable without cross-file guesswork

### Phase 5. Naming and Documentation Cleanup

Goal:
- make the codebase understandable to a new engineer without oral context

Tasks:
- apply naming convention
- reduce opaque abbreviations
- maintain subsystem docs
- keep glossary of domain terms

Definition of done:
- new names are consistent
- docs explain the rule owner for each subsystem

### Phase 6. Tentacle Wars Fidelity Track

Goal:
- after stabilization, move toward a Tentacle Wars-faithful mode

Tasks:
- evaluate `KEEP / REWORK / REMOVE` from fidelity spec
- isolate non-fidelity world mechanics
- shift input toward draw-to-connect
- simplify toward core pillars

Definition of done:
- fidelity work no longer competes with stabilization work

## Active Workstreams

### WS-01 Gameplay Core

Owner:
- `simulation-owner`

Status:
- `largely stabilized`

Scope:
- energy budget
- tentacle lifecycle
- capture and ownership transitions
- slice and burst behavior

Depends on:
- Phase 0 baseline

### WS-02 Input and Feel

Owner:
- `input-owner`

Status:
- `largely stabilized`

Scope:
- click/tap/drag consistency
- gesture recognition
- selection and hover correctness
- responsive touch behavior

Depends on:
- gameplay rule clarity from WS-01

### WS-03 AI Consistency

Owner:
- `ai-owner`

Status:
- `largely stabilized`

Scope:
- heuristic quality
- relay scoring
- shared mechanic usage
- removal of AI-only drift

Depends on:
- canonical action entry points from WS-01

### WS-04 Render and Feedback

Owner:
- `render-owner`

Status:
- `well underway`

Scope:
- owner palette consistency
- relay/signal visuals
- HUD truthfulness
- readable tactical feedback

Depends on:
- canonical ownership and rule docs

### WS-05 Config and Naming

Owner:
- `config-owner`

Status:
- `well underway`

Scope:
- grouped configs
- unit naming
- magic number removal
- vocabulary normalization

Depends on:
- stabilized rules from WS-01 through WS-04

### WS-06 Docs and Tests

Owner:
- `docs-owner`
- `test-owner`

Status:
- `well underway`

Scope:
- implementation docs
- conventions
- smoke checks
- workstream hygiene

Depends on:
- every other workstream

## Execution Cadence

For each task:

1. define the rule being changed
2. identify the canonical owner module
3. implement the smallest coherent change
4. add or update a smoke check if behavior matters
5. update the subsystem doc
6. update this board if scope changed

## Ready Queue

- isolate world mechanics more explicitly from the core gameplay loop
- decide the final decomposition boundary for `Tent.js`
- continue migrating remaining touched systems to grouped config and clearer naming
- optionally extend lightweight checks beyond the current smoke suite
