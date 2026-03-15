# TentacleWars Decision Brief

## Purpose

This document turns the current TentacleWars comparison work into three explicit product decisions.

It is intentionally short.
The goal is to choose the mechanic direction before more implementation work continues.

## Decision 1: Tentacle Slot Table By Grade

### Why This Must Be Decided First

This affects:

- gameplay limits
- AI move legality
- cards and HUD
- player expectation
- balance

Right now the branch still assumes a fixed TentacleWars cap of `3`, while the comparison evidence suggests grade-linked slot progression may be the correct fidelity target.

### Option A

Keep the current fixed cap:

- all TentacleWars grades can use up to `3` outgoing tentacles

Pros:

- simplest implementation
- matches the current sandbox
- no broad retune required immediately

Cons:

- likely drifts from the original game feel
- keeps UI confusion alive when external references suggest grade-linked slot limits
- may flatten early and mid-grade tactical identity

### Option B

Adopt an explicit slot table by grade.

Pros:

- better fidelity potential
- cleaner progression fantasy
- resolves card/HUD semantics properly

Cons:

- requires one authoritative table
- affects AI, balance, and some current sandbox expectations

### Recommendation

Choose `Option B`.

Reason:

Even if the exact table still needs confirmation, the project should move toward a grade-owned slot-cap model instead of treating `3` as a permanent cap for all grades.

### Required Follow-up

- complete `TASK-TW-023 TentacleWars Grade Slot Table Reconciliation`

## Decision 2: Energy Model

### Why This Is Critical

This changes the entire economy of the mode.

The user-provided report suggests:

- cells generate energy independently
- transfer does not consume source energy

The current sandbox uses:

- packetized transfer
- real source spend for emitted packets

### Option A

Keep the current packet budget model:

- packetized transfer
- emitted packets consume source energy

Pros:

- already implemented
- deterministic
- preserves energy conservation strongly

Cons:

- may diverge from the Android report
- may understate the “free production pressure” feeling of the original game if that report is right

### Option B

Switch to independent production plus non-consuming transfer.

Pros:

- closer to the new report
- may feel more like autonomous cell pressure

Cons:

- large systemic change
- likely major rebalance required
- risks re-opening multiple already-stabilized systems

### Recommendation

Stay on `Option A` for now.

Reason:

This is too large a change to make based on one comparison report alone.
It should only change if the team explicitly decides the new report is more authoritative than the local TentacleWars documentation used so far.

### Required Follow-up

- if desired, open a dedicated `TentacleWars Economy Model Reconciliation` design wave before any code change

## Decision 3: Slice Semantics

### Why This Is Critical

Slice is one of the identity mechanics of the mode.

The user-provided report implies:

- the cut injects the exact target-side stored segment count immediately

The current sandbox uses:

- committed payload = build energy + in-transit energy
- geometric split between source and target
- progressive visual payout during retraction

### Option A

Keep the current geometric committed-payload rule.

Pros:

- already integrated
- coherent with the current sandbox docs
- visually expressive and mechanically deterministic

Cons:

- may diverge from the original Android feel if the report is correct

### Option B

Move to segment-count immediate burst semantics.

Pros:

- closer to the user-provided report
- potentially closer to the intuitive “cut releases what was in the severed half” fantasy

Cons:

- large rewrite of an already integrated rule
- affects combat, capture, and visual pacing

### Recommendation

Keep `Option A` until the slot-table issue is resolved.

Reason:

The slot table is the more actionable and lower-risk fidelity decision first.
Changing slice now would stack too many moving parts at once.

### Required Follow-up

- if still needed after slot and HUD alignment, open a dedicated `TentacleWars Slice Semantics Reconciliation` review

## Recommended Order Of Work

1. `TASK-TW-023 TentacleWars Grade Slot Table Reconciliation`
2. finish `TASK-TW-019 TentacleWars HUD and Card Fidelity Contract`
3. `TASK-TW-017 TentacleWars Controlled Scenario Presets`
4. `TASK-TW-020 TentacleWars Node Grade Silhouette Pass`
5. `TASK-TW-021 TentacleWars Tentacle Motion and Material Pass`
6. `TASK-TW-022 TentacleWars Visual Regression Matrix`
7. only then reconsider energy-model or slice-rule rewrites if still necessary

## Final Recommendation

The next concrete implementation should not be:

- a general visual polish pass
- a balance pass
- or a slice rewrite

It should be:

- freezing the authoritative slot progression by grade

That decision unlocks cleaner UI, cleaner AI expectations, and a more trustworthy TentacleWars fidelity path.
