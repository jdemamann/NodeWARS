# Tent Structure Notes

## Current Direction

`Tent.js` is still a dense gameplay-critical file, so cleanup is being applied incrementally without broad behavioral refactors.

Recent readability work keeps backward compatibility while introducing clearer terminology in critical paths:

- `effectiveSourceNode` alongside `es`
- `effectiveTargetNode` alongside `et`
- `travelDuration` alongside `tt`
- `distance` alongside `d`
- `pipeCapacity` alongside `pCap`

## Why Dual Names Exist

Short aliases are still referenced across renderer, AI, and older gameplay code.

The current rule is:

- keep short aliases for compatibility
- prefer descriptive aliases in newly touched gameplay logic
- migrate high-risk paths first instead of renaming the entire repository at once

## High-Value Tent Cleanup Targets

- extract clash front resolution if that logic grows further
- centralize the remaining tentacle geometry/cache naming around the same convention
- decide whether the remaining clash helpers should move to a dedicated tentacle-clash module later

## Cleanup Applied

Recent incremental cleanup also:

- extracted `_resolveClashPartnerOnCut()` out of `kill()`
- renamed growing-state locals like `opp` and `prevT` to descriptive names
- started preferring descriptive aliases in clash/growth code without removing compatibility getters
- split clash handling into preparation, front update, and outcome resolution helpers
- renamed control-point cache fields and target-owner tracking to descriptive internal names
- extracted cut-zone classification into `src/entities/TentRules.js`
- extracted growing mid-air collision resolution into `src/entities/TentRules.js`
- extracted payload/flow/clash math helpers into `src/entities/TentCombat.js`
- unified immediate payload impact and burst payload impact through `_applyPayloadToTarget(...)`
- split active-flow target handling into friendly / neutral / enemy helpers
- split clash budget draining and force calculation into dedicated helpers

## Current Boundary

`Tent.js` still owns:

- active flow
- clash update orchestration
- burst impact
- ownership/capture side effects triggered by tentacle payloads

`src/entities/TentRules.js` now owns:

- cut-zone classification
- growing-phase mid-air collision setup

`src/entities/TentCombat.js` now owns:

- payload application math
- active-flow application math
- clash force comparison math

The current internal canonical target-impact helper is:

- `Tent._applyPayloadToTarget(...)`

The current internal active-flow helpers are:

- `Tent._applyFriendlyFlow(...)`
- `Tent._applyNeutralCaptureFlow(...)`
- `Tent._applyEnemyAttackFlow(...)`

The current internal clash helpers are:

- `Tent._drainClashSourceBudget(...)`
- `Tent._computeClashForces(...)`
