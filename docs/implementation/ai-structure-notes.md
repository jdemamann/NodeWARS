# AI Structure Notes

## Current Direction

The AI heuristic remains intentionally lightweight, but the code is now organized around clearer responsibilities:

- `update()` handles pacing and adaptive interval changes
- `buildAiTacticalState()` derives a lightweight intent profile before move scoring
- `_checkStrategicCuts()` runs every update tick, independently of the build-think interval
- `buildRelayContext()` gathers relay-local strategic signals
- `scoreRelayTarget()` scores relay captures and relay contests
- `buildMoveScore()` selects the scoring path for each target category
- `scoreStructuralWeakness()` adds player-board-shape punishment
- `scoreSliceOpportunity()` evaluates charged lanes for tactical burst cuts
- `_createTentacleMove()` owns the actual tentacle creation side effects
- `_checkStrategicCuts()` keeps enemy burst behavior on the shared canonical slice path

## Purple Faction Identity

The current owner-3 direction is intentionally simple but more differentiated than the red AI:

- strategic cuts are checked every frame, not only on build-think ticks
- purple slice thresholds and cooldowns are more permissive than red
- target scoring gives extra weight to kill-confirm situations on player cells
- existing pressure on a player cell increases purple follow-up interest
- relay launches are allowed when a relay has real upstream budget, but remain conservatively scored
- finish-state scoring makes purple more likely to convert weak fronts into tempo spikes

This keeps the purple faction readable as the more opportunistic and lethal personality without turning it into a full planner.

## Coalition Quality Improvements

Recent AI quality work also improved the coalition as a whole:

- allied neutral captures with real existing progress are continued more consistently
- allied nodes under visible player pressure now attract stronger support behavior
- weak or overextended player nodes receive stronger kill-confirm priority
- target picking avoids low-value multi-source overcommit unless the target is a strong finish opportunity
- tactical state shifts between `expand`, `pressure`, `support`, `finish`, and `recover`
- enemy slice pressure can now come from the coalition as a real tactical threat, not only as a hidden purple edge case

## Tactical State Profiles

The AI now derives a lightweight tactical state before scoring moves:

- `expand`
  - many neutrals remain; expansion pressure is rewarded
- `pressure`
  - default state; broad player pressure is rewarded
- `support`
  - allied fronts under attack pull more reinforcement
- `finish`
  - weak player nodes under active pressure receive strong focus
- `recover`
  - low-energy coalition fronts reduce reckless player attacks and reinforce more carefully

This is still heuristic-only. It does not turn the AI into a planner.

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

- centralize more score breakdown logging if live play debugging needs finer introspection
- consider extracting slice-candidate construction if enemy slice logic grows beyond the current scoring helper
- align remaining `Tent.js` naming with the same convention so AI and tentacle systems read consistently
