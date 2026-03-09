# Shared Burst Mechanics

## Rule

Player cuts and purple AI strategic cuts now enter burst logic through the same tent-level entry point: `Tent.applySliceCut(cutRatio)`.

That helper is the canonical gameplay path for:

- slice flash metadata
- cut-zone interpretation
- clash-side effects
- refund / retract / burst branching
- burst travel and final target impact

## Flow

1. A caller decides the cut ratio.
2. The caller invokes `Tent.applySliceCut(cutRatio)`.
3. `applySliceCut()` records visual cut state and delegates to `Tent.kill(cutRatio)`.
4. `kill()` decides refund, middle cut, or burst.
5. If the result is a burst, `Tent._updateBursting()` delivers the payload later using the normal tent update path.

## Intent

Purple AI still performs decisive near-target cuts, but it no longer owns a separate damage formula. This keeps burst timing and balance aligned with the player mechanic and avoids future drift.

## Frenzy Coupling

The player-only frenzy bonus is intentionally **not** a rolling time-window mechanic.

- it only counts active tentacles cut during the same continuous slice gesture
- starting a new slice resets the frenzy cut set
- separate cuts across different gestures must never accumulate into a delayed frenzy trigger

## Code Anchors

- Canonical entry point: `src/entities/Tent.js`
- Player slice caller: `src/core/Game.js`
- Purple AI strategic cut caller: `src/systems/AI.js`
