# AI Structure Notes

## Current Direction

The AI heuristic remains intentionally lightweight, but the code is now organized around clearer responsibilities:

- `update()` handles pacing and adaptive interval changes
- owner `3` runs `_checkStrategicCuts()` every update tick, independently of the build-think interval
- `_buildRelayContext()` gathers relay-local strategic signals
- `_scoreRelayTarget()` scores relay captures and relay contests
- `_buildMoveScore()` selects the scoring path for each target category
- `_createTentacleMove()` owns the actual tentacle creation side effects
- `_checkStrategicCuts()` keeps the purple-only burst behavior on the shared canonical slice path

## Purple Faction Identity

The current owner-3 direction is intentionally simple but more differentiated than the red AI:

- strategic cuts are checked every frame, not only on build-think ticks
- target scoring gives extra weight to kill-confirm situations on player cells
- existing pressure on a player cell increases purple follow-up interest
- relay launches are allowed when a relay has real upstream budget, but remain conservatively scored

This keeps the purple faction readable as the more opportunistic and lethal personality without turning it into a full planner.

## Naming Pass Applied

Recent cleanup replaced opaque local names in the critical AI path:

- `src` -> `sourceNode`
- `tgt` -> `targetNode`
- `sc` -> `score`
- `tot` -> `totalBuildCost`
- `ctx` -> `relayContext`
- `pers` -> `personality`
- `defensive` -> `isDefensive`

## Next AI Cleanup Targets

- extract move candidate construction into a dedicated helper module if AI heuristics keep growing
- centralize target scoring constants if balancing starts changing frequently
- align remaining `Tent.js` naming with the same convention so AI and tentacle systems read consistently
