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

1. `AGENTS.md` — stable rules and structure (this file)
2. `docs/project/RESUME.md` — live state: current phase, open tracks, what to ignore
3. `docs/project/inbox-codex.md` — current task
4. `docs/project/tw-collab-status.md` — handoff state

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
- commentary policy for changed source files:
  - `node scripts/commentary-policy.mjs`

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
- `docs/project/linux-audio-extraction-playbook.md`
- `docs/project/commentary-header-template.md`
- `docs/project/lessons-codex.md`

Domain agents:

- `docs/agents/audio-reconstruction-agent.md`
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
- `figma`
- `figma-implement-design`
- `imagegen`
- `jupyter-notebook`
- `pdf`
- `playwright`
- `playwright-interactive`
- `screenshot`
- `sentry`
- `spreadsheet`

Priority superpowers:

- `systematic-debugging`
  - default for bugs, regressions, and unexpected runtime behavior
- `test-driven-development`
  - default for bugfixes and guarded gameplay changes
- `verification-before-completion`
  - required before claiming a wave is validated
- `writing-plans`
  - default for medium or large multi-step waves
- `requesting-code-review`
  - use before closing sensitive gameplay, campaign, or TentacleWars waves
- `using-git-worktrees`
  - use when isolating parallel or high-risk workstreams

## Audio Reconstruction Workflow

When rebuilding a soundtrack track from an authored audio file:

1. read `docs/agents/audio-reconstruction-agent.md`
2. follow `docs/project/linux-audio-extraction-playbook.md`
3. keep the extraction package in:
   - `tmp/audio-analysis/<track-slug>/`
4. preserve the canonical package layout:
   - `source/`
   - `stems/`
   - `midi/`
   - `analysis/`
   - `notes.txt`
5. only then rewrite the procedural track in `src/audio/Music.js`

## Current Balance Context

- Fixed authored layouts are the default campaign path.
- Balance wave A already adjusted priority numeric pressure.
- Late high-pressure levels `18`, `21`, `30`, and `32` now give the player structural opening support through authored player-owned flank starts.
- Next useful balance work should be based on playtest evidence, not blind global tuning.

## Workflow Expectations

- Prefer small, test-backed changes.
- Start each meaningful wave by checking the relevant domain agent and the check matrix.
- If the task clearly matches an installed Codex skill, use the skill before ad-hoc work.
- For any multi-step wave, use `update_plan` at the start and keep it current as steps move from `in_progress` to `completed`.
- All file-based collaboration protocol content (`inbox-codex.md`, `inbox-claude.md`, `tw-collab-status.md`) must stay in English.
- Default superpowers stack:
  - `systematic-debugging` for bugs
  - `test-driven-development` for fixes and guarded behavior changes
  - `writing-plans` for non-trivial waves
  - `verification-before-completion` before claiming success
  - `requesting-code-review` before closing sensitive waves
- Before closing any design or planning wave (spec, implementation plan, or major architectural decision), send the spec to Codex via the async inbox protocol and wait for Codex considerations before finalizing. Do not write the implementation plan until Codex has reviewed the design.
- When the user reports a bug, do not start by fixing it. Start by adding or extending a test/guardrail that reproduces the bug, then fix it, then prove the fix with the passing test.
- Keep source comments in English only.
- If a touched source `.js` file still lacks a module header, add one in the same wave.
- If a created or materially changed function in a source `.js` file lacks a short block header, add one in the same wave.
- Reuse `docs/project/commentary-header-template.md` instead of inventing ad-hoc header styles.
- If changing gameplay rules, update at least one guardrail or explain why not.
- If changing settings, tutorial, story, or persistence, verify all linked surfaces still agree.
- If changing campaign progression, tutorial completion, or skip flow, keep `GameState` as the canonical source of next-level and unlock rules.
- If changing campaign layouts, run both `smoke-checks` and `campaign-sanity`.
- If changing world systems or simulation math, run `simulation-soak` too.
- Before reporting a task result as validated, check that your evidence directly measures what you claim, not a proxy or a window that includes unrelated phases (build time, travel time, warm-up).
- For browser validation in this repo, prefer `bash scripts/tw-visual-validation.sh ...` and the Chromium-backed `scripts/tw-visual-playwright.mjs` flow.
- Do not default to the older `playwright-cli` + Firefox path here; this Linux environment has a documented history of Firefox instability and the project-local Chromium workflow is the canonical browser-validation path.

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
4. keep the `TentacleWars` mode work isolated on its own branch and use the sandbox playtest/tuning wave after `TASK-TW-006`
5. prepare executable Linux/Android packaging only when port work becomes active
6. after restarting with the new skills, update the skill-driven workflow and start `TASK-TW-007 Packet-Native Lane Runtime`
