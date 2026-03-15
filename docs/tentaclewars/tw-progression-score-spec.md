# TentacleWars Progression and Score Spec

## Purpose

Define the progression, save-namespace, and star/par model for the future TentacleWars campaign.

This spec is intentionally narrow:

- it closes the blocking decisions needed before runtime implementation
- it does not yet implement persistence code
- it does not redefine product-shape decisions already owned by `TWL-001`

## Scope

This document owns:

- TentacleWars campaign save namespace
- per-level progression data
- star/par model
- unlock model
- debug override behavior

This document does not own:

- level data schema
- obstacle runtime semantics
- campaign entry UI flow

## Core Decision

TentacleWars campaign progression is independent from NodeWARS progression.

That means:

- separate current-level pointer
- separate completion tracking
- separate star tracking
- separate fail-streak tracking policy
- no save-key collision with `NodeWARS`

## Namespace Strategy

### Decision

Use a dedicated `tw_campaign_` prefix for TentacleWars campaign progression keys.

### Why

This is better than a short `tw_` prefix because:

- it is explicit
- it distinguishes the future campaign track from sandbox/runtime-only TentacleWars state
- it avoids ambiguous future growth if more TentacleWars surfaces are added later

## Canonical Key List

These are the keys the future runtime should own under TentacleWars campaign progression.

- `tw_campaign_completed`
  - highest cleared TentacleWars campaign phase id
- `tw_campaign_curLvl`
  - current TentacleWars campaign phase id
- `tw_campaign_scores`
  - best result record per TentacleWars phase
- `tw_campaign_stars`
  - best star count per TentacleWars phase
- `tw_campaign_levelFailStreaks`
  - fail-streak counters per TentacleWars phase
- `tw_campaign_activeWorldTab`
  - current world-tab selection for TentacleWars campaign UI

## Shared vs Separate State

### Separate

These must stay campaign-specific:

- completion
- current level
- stars
- best score/result data
- fail streaks
- active world tab for the TentacleWars campaign UI

### Shared

These should stay global/shared with the existing product:

- language
- audio settings
- graphics settings
- text zoom
- theme
- font
- debug mode flag
- current selected game mode

### Why

Duplicating global presentation settings per campaign would add noise without adding fidelity.

The thing that needs separation is progression and campaign-facing outcome state, not the whole app settings surface.

## Score Model

### Decision

TentacleWars campaign should use a separate result model from NodeWARS.

For phase 1 implementation, the model should be intentionally simple and reconstruction-compatible:

- result is driven primarily by clear time
- `par` remains the authored target for a strong clear
- stars are not derived from the current NodeWARS `calcScore()` formula

### Why not reuse NodeWARS score directly

The current NodeWARS score includes:

- wasted tentacles penalty
- frenzy bonuses
- cut bonuses

That is tightly tied to NodeWARS-facing pacing and reward language.
It is not a safe default for a reconstruction-oriented TentacleWars campaign.

## Star Model

### Decision

Use a time-band star model:

- `1 star`
  - any successful clear
- `2 stars`
  - successful clear at or below `silverPar`
- `3 stars`
  - successful clear at or below authored `par`

### Derived Threshold

For phase 1, define:

- `silverPar = ceil(par * 1.35)`

### Why

This keeps the system:

- simple to author
- easy to explain
- aligned with the existing product's visible use of `par`
- flexible enough for future adjustment if reconstruction evidence supports a stricter model

### Explicit non-goals for phase 1

Do not require these for stars yet:

- no-cell-loss bonus
- full-neutral-capture bonus
- style bonuses
- cut-count bonuses

Those can be revisited only if reconstruction evidence later shows they are truly needed.

## Unlock Model

### Decision

Stars are mastery-only.
Progression unlocks on clear, not on star count.

### Why

This is the safest and least confusing rollout:

- preserves clean campaign flow
- avoids gating world progression behind an uncalibrated star model
- lets reconstruction work focus on layout and pacing before mastery tuning

## Fail Streak Policy

### Decision

Store fail streaks, but do not use them to unlock campaign skip in TentacleWars phase 1.

### Why

Counterpoint to reusing NodeWARS behavior:

- NodeWARS skip-after-defeats is a product convenience rule from the existing campaign
- TentacleWars campaign is reconstruction-oriented and should not inherit that automatically

Pragmatic compromise:

- keep fail-streak data in the namespace
- use it for analytics, balancing, or future accessibility decisions
- do not make it unlock skips unless the user explicitly approves that later

## Save/Load on Namespace Miss

### Decision

If TentacleWars campaign keys are absent:

- initialize fresh TentacleWars campaign defaults
- do not read or derive from NodeWARS progression keys
- do not write anything back to NodeWARS keys

### Default TentacleWars campaign state

- `completed = 0`
- `curLvl = W1-01`
- `scores = empty / null-filled`
- `stars = empty / zero-filled`
- `levelFailStreaks = zero-filled`
- `activeWorldTab = 1`

## Debug Override Behavior

### Decision

Debug-world visibility overrides should mirror the NodeWARS pattern operationally, but stay isolated to the TentacleWars campaign surface.

That means:

- debug may expose manual world visibility overrides for TentacleWars campaign UI
- turning debug off clears manual TentacleWars world overrides
- debug overrides must not mutate persistent completion state
- TentacleWars debug overrides must not affect NodeWARS world visibility

## Implementation Notes

These are downstream implementation constraints for runtime tasks.

### For `TWL-005`

- loader must read TentacleWars campaign level ids without touching NodeWARS campaign ids
- loader should treat TentacleWars phase ids as their own campaign sequence

### For `TWL-006`

- persistence helpers should add a dedicated TentacleWars campaign state surface instead of overloading the current `nw_*` keys

### For `TWL-007`

- sanity coverage should assert:
  - no key collision with `nw_*`
  - star awards are monotonic per level
  - fresh TentacleWars save does not corrupt NodeWARS save
  - unlock-on-clear logic stays separate from star count

## Counterpoints Considered

### Why not use a single unified progression table for both campaigns?

Because that would:

- blur two separate products
- increase risk of save collisions
- make future UI routing harder to reason about

### Why not define a richer score model now?

Because the project does not yet have enough authored TentacleWars campaign content to calibrate a rich model responsibly.

The right order is:

1. clear reconstruction-oriented levels
2. playtest data
3. only then consider extra star conditions

### Why not omit scores entirely and keep only stars?

Because keeping a per-level best-result slot is still useful for:

- result screen comparisons
- future balancing
- potential best-time UI

But that result data should stay TentacleWars-specific.

## Blocking Decisions Closed

- separate TentacleWars campaign namespace: `yes`
- canonical prefix: `tw_campaign_`
- stars gated by time bands, not NodeWARS score: `yes`
- stars block progression: `no`
- skip unlocked by fail streak in phase 1: `no`
- fresh TentacleWars save falls back to TentacleWars defaults only: `yes`
- debug overrides isolated from NodeWARS: `yes`
