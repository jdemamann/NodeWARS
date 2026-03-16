MERGED: TW-LAYER1-001 — TwChannel + TwNodeOps on main

Layer 1 extraction complete:
- TwChannel.js: economic primitives + lifecycle state machine
- TwNodeOps.js: commitOwnershipTransfer (only layer that writes node.owner)
- Tent.js: delegates TW update(dt) to TwChannel.advanceLifecycle
- Ownership.js: routes ownership-state mutation through TwNodeOps

Verification on main: 102/102 smoke, 6/6 energy, 16/16 channel-sanity

Next wave (Wave 2): TwFlow.js + TwCombat.js extraction
- TwFlow: extract _updateTentacleWarsActiveFlowState + flow helpers from Tent.js + TentCombat.js
- TwCombat: extract clash/cut/burst logic from Tent.js
- After both: _advanceTwCutRetraction moves to TwFlow, _updateClashState to TwCombat
