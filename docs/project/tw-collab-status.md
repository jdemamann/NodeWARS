MERGED: TW-WAVE3-001 — TwDelivery on main

Wave 3 extraction complete:
- TwDelivery.js: applyTwFriendlyDelivery, applyTwNeutralCapture, applyTwEnemyAttack, markNodeUnderAttack
- TwFlow.js: sustained delivery routes through TwDelivery (not TentCombat)
- TentCombat.js: TW simulationMode branches removed from flow helpers (NW-only now)
- Tent.js: dead TW flow/cut helpers deleted (_updateTentacleWarsActiveFlowState, _advanceTwCutRetraction, _applyTentacleWarsSliceCut, and related helpers)

Named pass-throughs in TwDelivery (private):
- resolveTwNeutralCapture → channel._captureNeutralTarget
- resolveTwHostileCapture → channel._defeatEnemyTarget

Option X chosen: applyTentaclePayloadToTarget TW branch retained for cut/burst delivery

Verification on main: 102/102 smoke, 6/6 delivery, 7/7 flow, 6/6 combat, 16/16 channel, 6/6 energy

Bounded migration debt (explicit, named for Wave 4):
- resolveTwNeutral/HostileCapture still delegate to Tent.js instance methods
- applyTentaclePayloadToTarget TW branch for cut/burst delivery
- Legacy TW clash shell in Tent._updateClashState (inert residue; smoke suite probes it directly)

Next wave (Wave 4): Ownership policy extraction
- Extract _captureNeutralTarget / _defeatEnemyTarget into TwCaptureRules.js / TwNodeOps.js
- Remove TW branch from applyTentaclePayloadToTarget (Option Y)
- Delete legacy TW clash shell from Tent._updateClashState
