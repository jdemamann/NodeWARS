# General Multi-Agent Review

## Scope

This review was performed after the current stabilization, balance, UI, and coalition waves were already in place.

It uses the current agent model as a lens:

- gameplay systems
- AI behavior
- campaign/level
- meta-progression
- UI/UX
- render language
- performance/build
- QA/checks
- code commentary

The goal is not to reopen broad refactors. The goal is to identify the next highest-value work that still makes sense in the current codebase.

## Executive Summary

The project is in a strong state.

Core gameplay, campaign progression, tutorial optionality, coalition behavior, UI flow, and automated checks are all substantially healthier than they were earlier in development.

The main remaining work is no longer foundational stabilization. It is now concentrated in:

1. a few maintainability hotspots
2. a few quality-of-life infrastructure seams
3. targeted check expansion where it adds real signal

No new critical gameplay defect was found in this review.

## Current Strengths

### Gameplay systems

- energy, retract, relay, slice, burst, clash, and coalition capture now have canonical owners
- red and purple now behave as one coalition
- neutral capture between coalition members is parameterized and documented

### Meta-progression

- tutorials are optional for unlock in every world
- natural progression can still route into the next world's tutorial
- `GameState` is the canonical source for unlock and next-level logic

### UI / UX

- settings/menu behavior is guarded by UI source checks and DOM-lite checks
- font selection is local-first and UI-wide
- ending flow, result flow, tutorial exit/pause, and debug preview now have explicit guardrails

### QA

- the check suite is broad enough to catch many regressions early
- command entry points are already grouped by domain

## Findings By Agent

### Gameplay Systems Agent

Status: `good`

No critical mechanics issue was identified in this pass.

The remaining concern is not correctness. It is readability and future change cost in a few large files:

- `src/core/Game.js`
- `src/entities/Tent.js`
- `src/systems/Tutorial.js`

These are stable enough to leave alone unless a future wave adds more complexity.

### AI Behavior Agent

Status: `acceptable, but approaching the next extraction threshold`

`src/systems/AI.js` is only `424` lines, but it now owns:

- candidate generation
- coalition-aware context
- scoring
- purple behavior
- relay origin handling
- overcommit control

That is still manageable, but it is close to the point where the next heuristic wave should split target scoring and move-candidate construction into dedicated helpers.

This supports `TASK-031`.

### Campaign / Content Agents

Status: `good`

Campaign structure and progression are coherent.

No new authored-layout bug was found.

The next real work here is evidence-driven:

- more balance waves
- more playtest notes
- optional authored refinements if needed

No new urgent campaign task is required beyond ongoing balance work.

### Meta-Progression Agent

Status: `good, but still worth deeper dedicated checks`

The runtime rules look correct.

The remaining gap is confidence granularity:

- progression rules are currently protected mostly through smoke and campaign sanity
- a dedicated mini-suite for `GameState` transitions would reduce reliance on broader checks

This supports `TASK-034`.

### UI / UX Agent

Status: `good, but ScreenController remains a hotspot`

`src/ui/ScreenController.js` is still `506` lines and still owns substantial HTML assembly through:

- `buildWorldTabs()`
- `buildGrid()`
- `buildStory()`
- `endLevel()`
- `showCampaignEnding()`
- `refreshSettingsUI()`
- credits/story composition

This is no longer a crisis, but it is still one of the clearest remaining UI maintenance risks.

This supports `TASK-033`.

### Render / Visual Language Agent

Status: `good`

No urgent structural work is required here.

The render language is already coherent enough for current product goals.

Future work should remain playtest-driven:

- readability tweaks
- mobile clarity
- HIGH/LOW polish only when evidence justifies it

### Performance / Build Agent

Status: `good, with one clean-up seam`

The most relevant remaining issue here is the audio layer.

`src/audio/SoundEffects.js` still uses:

- chained `setTimeout(...)` for many compound sounds
- cooldown timing based on `performance.now()` with `Date.now()` fallback

This is not a severe bug, but it is still a relatively ad-hoc scheduling model compared to how far the rest of the project has evolved.

This supports `TASK-032`.

### QA / Checks Agent

Status: `strong`

The suite is now well structured:

- smoke
- UI action sanity
- UI DOM sanity
- campaign sanity
- simulation soak

The most valuable next check expansion is not “more smoke”.
It is a focused progression-state mini-suite.

This supports `TASK-034`.

### Code Commentary Agent

Status: `good, but still worth one selective sweep`

The code is much more readable than before.

The remaining opportunity is not broad renaming. It is a focused comment and constant-block alignment sweep on the remaining hotspots:

- `src/config/gameConfig.js`
- `src/core/Game.js`
- `src/systems/AI.js`
- `src/systems/Tutorial.js`
- `src/ui/ScreenController.js`

This supports `TASK-036`.

## Priority Recommendations

### Medium Priority

#### TASK-032 Audio Scheduling and Cooldown Canonicalization

Why:

- current audio scheduling is functional but still ad hoc
- it is a portability and maintainability seam
- it is narrow enough to fix without reopening broad architecture

Expected gains:

- cleaner audio timing ownership
- lower chance of future drift in sound event timing
- better fit for desktop/mobile packaging

#### TASK-033 ScreenController Composition Split Phase 2

Why:

- `ScreenController.js` still contains too much markup assembly
- this is one of the most likely UI regression sources in future waves

Expected gains:

- smaller UI ownership boundaries
- easier future menu/result/story changes
- lower regression risk in settings and campaign screens

#### TASK-034 GameState Progression Sanity Mini-Suite

Why:

- progression is currently correct but checked through broader suites
- a dedicated check layer would catch unlock/next-level regressions faster

Expected gains:

- sharper signal on progression bugs
- lower debugging cost
- better confidence around tutorials, skip, and manual world overrides

### Low-To-Medium Priority

#### TASK-035 Tutorial State Machine Extraction Review

Why:

- `Tutorial.js` is now stable but still large
- the next extraction should happen only if it reduces risk cleanly

Expected gains:

- clearer separation between copy, gating, and ghost guidance
- easier future onboarding changes

#### TASK-036 Commentary and Constant-Tuning Alignment Sweep

Why:

- the code is already readable, but some hotspots still deserve one surgical alignment pass

Expected gains:

- easier tuning and maintenance
- fewer stale comments in future waves

## Tasks Already In The Right Place

These continue to make sense and do not need redefinition:

- `TASK-028 Deterministic Input Harness`
- `TASK-029 Release Readiness Wave`
- `TASK-031 AI Scoring Module Extraction`

## What Does Not Need A New Task Right Now

- another broad gameplay refactor
- another large naming wave
- another large render restructuring wave
- more campaign mechanics before fresh playtest evidence

## Final Recommendation

The best next sequence is:

1. `TASK-032 Audio Scheduling and Cooldown Canonicalization`
2. `TASK-033 ScreenController Composition Split Phase 2`
3. `TASK-034 GameState Progression Sanity Mini-Suite`
4. then choose between:
   - `TASK-031 AI Scoring Module Extraction`
   - `TASK-035 Tutorial State Machine Extraction Review`
   - `TASK-029 Release Readiness Wave`

This sequence preserves the current strengths of the project and improves the remaining seams without reopening heavy structural work.
