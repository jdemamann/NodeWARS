# TentacleWars AI Phase 1

## Scope

This wave adds the first mode-specific enemy behavior for the TentacleWars
sandbox without touching the stable NodeWARS AI path.

## What Changed

- added [TwAI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/TwAI.js)
- added [TwAIScoring.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/TwAIScoring.js)
- extended [TwBalance.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/TwBalance.js) with:
  - hostility mode
  - AI energy thresholds
  - support-triangle bonuses
  - overflow-ready source bonuses
  - purple slice tuning
- made [OwnerTeams.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/OwnerTeams.js) mode-aware so:
  - NodeWARS keeps red and purple as a coalition
  - TentacleWars can treat red and purple as separate hostiles
- updated [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) so the TentacleWars sandbox instantiates `TwAI`

## Behavior Goals

Phase 1 does not try to solve packet-native AI perfectly. It aims to make the
 sandbox prototype feel directionally correct by favoring:

- overflow-ready launches
- stacked pressure on weak hostile nodes
- support toward allied nodes under pressure
- support-triangle shaping
- purple slice denial through the canonical slice path

## Frozen Defaults

- `TW_BALANCE.ENEMY_RELATION_MODE = 'all_hostile'`
- `TW_BALANCE.AI_PURPLE_ENABLES_SLICE = true`
- purple slice still routes through `Tent.applySliceCut(...)`

## Validation

- `69/69 smoke checks passed`
- `6/6 UI DOM sanity checks passed`
- `7/7 campaign sanity checks passed`
- `1/1 simulation soak checks passed`
- `1/1 commentary policy checks passed`

## Next Useful Work

The TentacleWars branch now has enough core mechanics to justify:

1. sandbox playtest and tuning
2. a dedicated TentacleWars mini-suite beyond smoke checks
3. deciding whether the next wave should focus on:
   - packet-native runtime replacement
   - TentacleWars-specific rendering and lane feel
   - authored prototype content
