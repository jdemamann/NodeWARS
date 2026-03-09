# AGENTS.md

## Purpose

This file gives future coding agents fast operational context for NodeWARS.

Use it as the top-level entry point before making changes.
It should stay short, current, and action-oriented.

## Project State

- Current phase: `stabilized foundation, active balance/polish`
- Core gameplay is no longer in high-risk drift mode.
- The highest-value work now is:
  - campaign playtest and balance
  - selective polish
  - targeted gameplay bug fixes backed by guardrails

## First Files To Read

1. `docs/project/stabilization-status.md`
2. `docs/project/source-structure.md`
3. `docs/project/task-backlog.md`
4. `docs/implementation/current-gameplay-baseline.md`
5. `docs/implementation/tentaclewars-fidelity-spec.md`

## Code Structure

- `src/core`
  - runtime orchestration and persistent state
- `src/config`
  - campaign data and grouped gameplay config
- `src/entities`
  - simulation entities such as `Tent` and `GameNode`
- `src/systems`
  - gameplay systems and world-layer logic
- `src/systems/world`
  - isolated world-mechanics runtime modules
- `src/input`
  - click, drag, slice, hover, and preview helpers
- `src/rendering`
  - canvas rendering pipeline
- `src/ui`
  - menus, HUD, result screens
- `src/audio`
  - music and sound effects
- `src/math`
  - simulation and geometry helpers
- `src/levels`
  - fixed authored campaign layouts
- `src/localization`
  - localized strings and tutorial/story copy

## Canonical Gameplay Entry Points

- Slice / burst:
  - `src/entities/Tent.js`
  - `Tent.applySliceCut(...)`
- Ownership transition:
  - `src/systems/Ownership.js`
- Energy budget:
  - `src/systems/EnergyBudget.js`
- World-layer orchestration:
  - `src/systems/WorldSystems.js`
- Owner palette:
  - `src/theme/ownerPalette.js`

## Critical Invariants

Do not break these:

- programmatic retract refunds `paidCost + energyInPipe`
- support cells keep partial self-regeneration while feeding allies
- relay nodes do not create free energy
- player and purple AI use the same canonical slice path
- frenzy only triggers from `3` active cuts inside the same continuous slice gesture
- owner `3` is supported symmetrically in gameplay and rendering
- fixed campaign layouts must match configured level metadata
- late high-pressure authored phases keep structural player opening support
- progress and settings persist locally and normalize invalid values
- phase skip stays locked behind repeated defeats and remains blocked on tutorials, bosses, and the final phase

## Commands To Run

- mechanics smoke suite:
  - `node scripts/smoke-checks.mjs`
- campaign static sanity:
  - `node scripts/campaign-sanity.mjs`
- long-run numeric stability:
  - `node scripts/simulation-soak.mjs`

Run all three after gameplay, campaign, UI/settings, persistence, or render changes that may affect state.

## Key Documentation

Gameplay and systems:

- `docs/implementation/energy-model.md`
- `docs/implementation/tentacle-lifecycle.md`
- `docs/implementation/capture-and-ownership.md`
- `docs/implementation/relay-mechanics.md`
- `docs/implementation/shared-burst-mechanics.md`
- `docs/implementation/ai-relay-targeting.md`
- `docs/implementation/world-mechanics-boundary.md`

UX / rendering / persistence:

- `docs/implementation/ui-ux-visual-sweep.md`
- `docs/implementation/graphics-profiles.md`
- `docs/implementation/render-performance-instrumentation.md`
- `docs/implementation/local-persistence-guardrails.md`
- `docs/implementation/content-alignment-review.md`

Planning / balance:

- `docs/project/campaign-balance-wave-a.md`
- `docs/project/playtest-balance-plan.md`
- `docs/project/priority-phase-balance-pass.md`

## Current Balance Context

- Fixed authored layouts are the default campaign path.
- Balance wave A already adjusted priority numeric pressure.
- Late high-pressure levels `18`, `21`, `30`, and `32` now give the player structural opening support through authored player-owned flank starts.
- Next useful balance work should be based on playtest evidence, not blind global tuning.

## Workflow Expectations

- Prefer small, test-backed changes.
- If changing gameplay rules, update at least one guardrail or explain why not.
- If changing settings, tutorial, story, or persistence, verify all linked surfaces still agree.
- If changing campaign layouts, run both `smoke-checks` and `campaign-sanity`.
- If changing world systems or simulation math, run `simulation-soak` too.

## High-Risk Files

- `src/entities/Tent.js`
- `src/entities/TentCombat.js`
- `src/core/Game.js`
- `src/systems/WorldSystems.js`
- `src/config/gameConfig.js`
- `src/levels/FixedCampaignLayouts.js`

Treat changes there as gameplay-sensitive.

## What To Avoid

- broad refactors without guardrails
- duplicate rule paths for player vs AI
- introducing new magic numbers outside grouped config
- letting docs drift from implemented mechanics
- reintroducing old short aliases for core gameplay concepts

## Current Best Next Steps

1. playtest phases `18`, `21`, `30`, and `32`
2. decide whether `24 RELAY RACE` also needs structural player opening support
3. continue campaign balance from evidence
4. only then start a Tentacle Wars fidelity wave
