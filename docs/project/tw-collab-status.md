WAITING_FOR: Codex — implement TW-WAVE4-001

Current task:
- `TW-WAVE4-001` — TwOwnership extraction
- No design consultation needed; scope follows directly from Wave 3 bounded debt

Scope:
- create `src/tentaclewars/TwOwnership.js` — TW ownership transition primitives
- create `scripts/tw-ownership-sanity.mjs` (5 tests)
- update TwDelivery.js — private helpers use TwOwnership; add applyTwBurstDelivery
- update TwFlow.js — applyTwPayloadToTarget calls applyTwBurstDelivery
- remove TW branch from TentCombat.applyTentaclePayloadToTarget (NW-only after this)
- remove TW branches from Tent._captureNeutralTarget + _defeatEnemyTarget
- delete legacy TW clash shell from Tent._updateClashState

After Wave 4:
- TentCombat.js fully NW-only (no simulationMode checks)
- Tent._captureNeutralTarget + _defeatEnemyTarget NW-only
- All TW delivery and ownership routes through TwDelivery + TwOwnership
