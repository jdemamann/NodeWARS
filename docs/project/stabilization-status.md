# Stabilization Status

## Goal

Track what has already been stabilized in the current game, what is partially complete, and what remains before moving into a Tentacle Wars fidelity phase.

## Current Status Summary

Overall stabilization state: `late-stage`

Current documentation reconciliation state: `completed`

The codebase is materially more organized than the original baseline in five areas:

- canonical gameplay rule ownership
- relay / slice / ownership correctness
- input modularization
- naming clarity in critical systems
- grouped configuration surfaces

The repository is no longer in the high-risk drift phase for core gameplay. Remaining work is concentrated in final decomposition, long-run confidence, and campaign tuning.

## Progress Matrix

### Completed

- gameplay-critical hardening for relay energy, shared burst flow, ownership side effects, and relay targeting
- smoke-check baseline and run notes
- simulation soak-check baseline and run notes
- debug-facing render performance instrumentation
- conservative campaign balance wave A on the priority authored phases
- audio event density audit with cooldown-based de-duplication for high-chaos SFX
- final render palette canonicalization through shared owner-palette helpers
- screen composition split for world metadata, level-select badges, and result summaries
- primary documentation for relay, burst, ownership, AI relay targeting, energy, tentacle lifecycle, input flow, config taxonomy, and naming
- roadmap/backlog/workstream reconciliation

### Well Advanced

- grouped configuration migration across gameplay, input, AI, world, and render surfaces
- `Game.js` orchestration reduction through extracted input and command helpers
- high-impact naming cleanup in `Tent.js`, `AI.js`, and input helpers
- world-mechanics boundary extraction into dedicated setup and runtime modules
- world-layer runtime split into dedicated `src/systems/world/*` modules under `WorldSystems`

### Remaining

- heavy structural decomposition work is complete; remaining work is mostly playtest, balance, and selective polish
- finish the remaining palette/screen cleanup
- extend confidence further with playtest-driven balance iteration

## Completed or Largely Completed

### Gameplay Hardening

- relay nodes no longer create free energy
- owner 3 palette handling was unified through shared owner-color helpers
- AI can target relay nodes
- purple AI strategic cuts use the same canonical slice path as the player
- ownership change side effects were centralized
- neutral contest logic is no longer hard-coded for only owners 1 and 2
- player relay interaction paths were reopened across click / hover / touch
- current README slice behavior was aligned to the implemented rules

### Canonical Rule Ownership

- canonical slice entry point exists in `Tent.applySliceCut(...)`
- canonical ownership helper exists in `src/systems/Ownership.js`
- canonical energy-budget helper exists in `src/systems/EnergyBudget.js`
- owner color resolution was consolidated in `src/theme/ownerPalette.js`

### Lightweight Regression Layer

- smoke checks exist and are runnable with `node scripts/smoke-checks.mjs`
- simulation soak checks exist and are runnable with `node scripts/simulation-soak.mjs`
- campaign sanity checks exist and are runnable with `node scripts/campaign-sanity.mjs`
- current smoke coverage verifies:
  - relay nodes do not create free energy
  - owner 3 palette selection is correct
  - AI can evaluate relays as targets
  - shared burst path is used by player and AI
  - ownership and contest logic use canonical paths
  - player relay interaction remains enabled

### Input / Game Orchestration Modularization

`Game.js` is significantly thinner than before.

Modularized input surfaces now exist for:

- node hit testing
- tentacle command helpers
- player click resolution
- player tentacle interaction rules
- build preview model assembly
- gesture state transitions
- slice detection
- slice side effects
- raw game input binding

### Naming and Readability Progress

Significant naming cleanup has already been applied to:

- AI target scoring and move creation flow
- tentacle active flow / clash / growth paths
- input command and gesture helpers

Compatibility aliases still remain where full renaming would create unnecessary churn, but the critical paths are substantially easier to read.

### Parameterization Progress

Grouped config domains now exist for:

- energy / gameplay balance
- build rules
- tentacle rules
- cut rules
- input tuning
- progression rules
- AI rules
- world rules
- render rules

Compatibility aliases are still present for older modules.

## Partially Complete

### Tentacle Cleanup

`src/entities/Tent.js` is much more readable than before, but it still remains a dense gameplay-critical file.

What is already improved:

- clash logic split into smaller helpers
- growth and cut paths renamed locally
- geometry/cache names cleaned up
- descriptive aliases coexist with old short getters

What is still incomplete:

- full separation of clash behavior into its own module
- full migration away from older compatibility aliases like `es`, `et`, `tt`, `d`
- remaining visual / lifecycle responsibilities are still mixed in one file

### Config Migration

The taxonomy exists and several consumers already use grouped config directly.

Still incomplete:

- many old aliases are still imported in older modules
- world-specific level defaults still live mostly in level data and spawning code
- render config is only partially migrated

### Documentation Consolidation

Subsystem documentation now exists for the key stabilized areas, and the planning/status docs now reflect the current implementation state.

Still incomplete:

- some subsystem docs still mention future extraction work that has now partially happened
- the final stabilization exit review has not been written yet

## Remaining High-Value Work

### 1. World Mechanics Boundary

Still needed:

- make the boundary between core gameplay and world-specific mechanics more explicit
- isolate hazard / pulsar / signal / fog tuning and ownership from the core loop as much as possible

Reason:

- this is the cleanest bridge toward a future Tentacle Wars-faithful mode

### 2. Final Tentacle Decomposition

Still needed:

- decide whether clash and burst behavior should move into dedicated helper modules
- reduce remaining mixed concerns in `Tent.js`

Reason:

- `Tent.js` is still the single densest gameplay file

### 3. Backlog and Roadmap Reconciliation

Status:

- completed for the current stabilization phase snapshot

Reason:

- this work is done, but it will need one more pass before the fidelity phase starts

### 4. Expanded Confidence Layer

Still needed:

- add performance-oriented checks and instrumentation on top of the current smoke + soak suite

Reason:

- invariant and soak coverage now exist, but performance confidence is still mostly observational

## Recommended Next Step

The highest-value next move is:

1. finish the last concentrated structural seams
2. add long-run/performance guardrails
3. run the first concrete balance wave on priority phases

That ordering closes stabilization with evidence before any larger fidelity push.
