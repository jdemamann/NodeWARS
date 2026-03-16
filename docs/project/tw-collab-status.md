WAITING_FOR: Codex — implement TW-WAVE3-001

Current task:
- `TW-WAVE3-001` — TwDelivery extraction
- Design approved (Option A + named pass-throughs per Codex recommendation)

Scope:
- create `src/tentaclewars/TwDelivery.js` — Layer 1 TW target-side delivery
- create `scripts/tw-delivery-sanity.mjs` (6 tests)
- update TwFlow.js — import from TwDelivery instead of TentCombat
- remove TW simulationMode branches from TentCombat.js (flow helpers)
- delete dead TW instance methods from Tent.js

Bounded migration debt after Wave 3:
- resolveTwNeutralCapture / resolveTwHostileCapture still call Tent.js instance methods
- Wave 4: extract into TwCaptureRules.js / TwNodeOps.js
- applyTentaclePayloadToTarget TW branch (cut/burst path) — Option X or Y per Codex judgment
