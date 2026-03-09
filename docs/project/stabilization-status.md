# Stabilization Status

## Goal

Track what has already been stabilized in the current game, what is partially complete, and what remains before moving into a Tentacle Wars fidelity phase.

## Current Status Summary

Overall stabilization state: `completed for architecture / ongoing for balance`

Current documentation reconciliation state: `completed`

The codebase is materially more organized than the original baseline in five areas:

- canonical gameplay rule ownership
- relay / slice / ownership correctness
- input modularization
- naming clarity in critical systems
- grouped configuration surfaces

The repository is no longer in the high-risk drift phase for core gameplay. Structural decomposition, long-run confidence checks, and instrumentation are in place. Remaining work is concentrated in playtest-driven balance, product polish, and selective cleanup.

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
- tentacle lifecycle split and final tentacle decomposition
- purple AI strategic-cut scheduling outside the build-think interval
- immediate clash creation now commits full tentacle build cost
- core simulation-adjacent visuals moved off `Date.now()` onto frame-driven `game.time`
- primary documentation for relay, burst, ownership, AI relay targeting, energy, tentacle lifecycle, input flow, config taxonomy, and naming
- roadmap/backlog/workstream reconciliation

### Well Advanced

- grouped configuration migration across gameplay, input, AI, world, and render surfaces
- `Game.js` orchestration reduction through extracted input and command helpers
- high-impact naming cleanup in `Tent.js`, `AI.js`, and input helpers
- world-mechanics boundary extraction into dedicated setup and runtime modules
- world-layer runtime split into dedicated `src/systems/world/*` modules under `WorldSystems`
- owner 3 faction differentiation, with stronger kill-confirm and pressure-follow scoring

### Remaining

- heavy structural decomposition work is complete; remaining work is mostly playtest, balance, and selective polish
- continue campaign wave-by-wave tuning with real fail-case observation
- optionally reduce remaining wall-clock timing in non-critical UX/audio paths
- keep docs and `AGENTS.md` aligned after each balance wave

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

`src/entities/Tent.js` is much more readable than before, but it still remains the densest gameplay-critical file.

What is already improved:

- clash logic split into smaller helpers
- growth and cut paths renamed locally
- geometry/cache names cleaned up
- descriptive aliases coexist with old short getters

What is still incomplete:

- additional decomposition would now be optional polish, not required stabilization work
- some lifecycle and rendering adjacency still live in the same file by design

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

### 1. Campaign Balance and Playtest Execution

Still needed:

- execute the next balance waves on late authored phases and tutorial pacing
- collect real fail reasons, not just config guesses

Reason:

- this is now the highest-value product work after the stabilization pass

### 2. Selective Product Polish

Still needed:

- refine the remaining UX seams found in playtest
- adjust audio/visual noise and pacing only where evidence warrants it

Reason:

- the architecture is stable enough that polish should now be evidence-driven

### 3. Documentation and Agent Handoff Maintenance

Status:

- completed for the current stabilization phase snapshot

Reason:

- this work only needs maintenance after future balance waves

### 4. Optional Additional Confidence Layer

Still needed:

- add more campaign- and balance-oriented checks only if they catch real regressions seen in playtest

Reason:

- invariant, soak, campaign sanity, and render instrumentation already exist; further automation should stay lightweight

## Recommended Next Step

The highest-value next move is:

1. execute the next concrete balance wave on priority phases
2. run focused playtests on tutorials, World 2 pressure, and late multi-front phases
3. only then decide whether any remaining structural cleanup is justified by evidence

That ordering keeps the project moving on product value instead of architecture churn.
