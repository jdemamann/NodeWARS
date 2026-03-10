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
6. `docs/project/check-matrix.md`
7. `docs/project/development-working-rhythm.md`
8. `docs/project/operational-kanban.md`
9. `docs/project/skill-usage-map.md`

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
- red and purple are one hostile coalition; neutral capture between them is controlled by `GAME_BALANCE.NEUTRAL_CAPTURE_ALLIANCE_MODE`
- tutorials are optional for unlocks in every world, but normal campaign progression can still flow into the next world's tutorial
- fixed campaign layouts must match configured level metadata
- late high-pressure authored phases keep structural player opening support
- progress and settings persist locally and normalize invalid values
- phase skip stays locked behind repeated defeats and remains blocked on tutorials, bosses, and the final phase

## Commands To Run

- mechanics smoke suite:
  - `node scripts/smoke-checks.mjs`
- progression sanity:
  - `node scripts/game-state-progression-sanity.mjs`
- deterministic input harness:
  - `node scripts/input-harness.mjs`
- campaign static sanity:
  - `node scripts/campaign-sanity.mjs`
- release readiness:
  - `node scripts/release-readiness.mjs`
- long-run numeric stability:
  - `node scripts/simulation-soak.mjs`

Run the relevant subset after gameplay, campaign, UI/settings, persistence, or render changes that may affect state. Use `npm run check` for the full local gate.

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
- `docs/project/ai-wave-2026-03-10.md`
- `docs/project/check-matrix.md`
- `docs/project/development-working-rhythm.md`
- `docs/project/operational-kanban.md`
- `docs/project/issue-intake-template.md`
- `docs/project/campaign-balance-wave-b-plan.md`

Domain agents:

- `docs/agents/gameplay-systems-agent.md`
- `docs/agents/ai-behavior-agent.md`
- `docs/agents/campaign-level-agent.md`
- `docs/agents/content-authored-levels-agent.md`
- `docs/agents/meta-progression-agent.md`
- `docs/agents/music-theme-agent.md`
- `docs/agents/narrative-localization-agent.md`
- `docs/agents/render-visual-language-agent.md`
- `docs/agents/ui-ux-agent.md`
- `docs/agents/performance-build-agent.md`
- `docs/agents/qa-checks-agent.md`
- `docs/agents/code-commentary-agent.md`

Installed Codex skills:

- `develop-web-game`
- `doc`
- `imagegen`
- `playwright`
- `playwright-interactive`
- `screenshot`
- `spreadsheet`

## Current Balance Context

- Fixed authored layouts are the default campaign path.
- Balance wave A already adjusted priority numeric pressure.
- Late high-pressure levels `18`, `21`, `30`, and `32` now give the player structural opening support through authored player-owned flank starts.
- Next useful balance work should be based on playtest evidence, not blind global tuning.

## Workflow Expectations

- Prefer small, test-backed changes.
- Start each meaningful wave by checking the relevant domain agent and the check matrix.
- If the task clearly matches an installed Codex skill, use the skill before ad-hoc work.
- If changing gameplay rules, update at least one guardrail or explain why not.
- If changing settings, tutorial, story, or persistence, verify all linked surfaces still agree.
- If changing campaign progression, tutorial completion, or skip flow, keep `GameState` as the canonical source of next-level and unlock rules.
- If changing campaign layouts, run both `smoke-checks` and `campaign-sanity`.
- If changing world systems or simulation math, run `simulation-soak` too.

## Safe Restart Point For New Skills

It is safe to restart Codex whenever these conditions are true:

- the current wave is not in the middle of a code edit
- the relevant checks for the current wave have passed
- any intended handoff docs are already updated

There is no need to prepare extra implementation tasks before restarting just to activate installed skills.
If a wave is already in progress, finish that wave first, then restart.

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

1. evaluate whether `24 RELAY RACE` still needs structural support after Wave B tuning
2. run playtest-driven tuning on the new AI tactical-state and enemy-slice wave
3. keep expanding balance and micro-bug intake from live sessions
4. prepare executable Linux/Android packaging only when port work becomes active
5. only then start a Tentacle Wars fidelity wave
