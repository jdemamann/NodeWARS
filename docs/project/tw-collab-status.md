DISPATCHED: TW-WAVE2-001 — TwFlow + TwCombat extraction

Wave 1 complete and merged:
- TwChannel.js: economic primitives + lifecycle state machine
- TwNodeOps.js: commitOwnershipTransfer (sole node.owner writer)
- Tent.js: delegates TW update(dt) to TwChannel.advanceLifecycle
- Ownership.js: routes ownership-state mutation through TwNodeOps

Verification on main: 102/102 smoke, 6/6 energy, 16/16 channel-sanity

Wave 2 dispatched to Codex:
- TwFlow.js: extract _updateTentacleWarsActiveFlowState + clearFlowState from Tent.js; import flow helpers from TentCombat.js directly
- TwCombat.js: extract _updateClashState (TW path), _advanceTwCutRetraction, _applyTentacleWarsSliceCut from Tent.js
- TwChannel.js: remove all call-backs into Tent.js TW methods (advanceActive, advanceBursting, advanceRetracting wired to new modules)
- Tent.kill(): TW slice branch calls TwCombat.applyTwSliceCut

After Wave 2: TwChannel.advanceActive has no remaining Tent.js method call-backs.
TentCombat.js stays (shared NW/TW helpers). Dead TW methods left in Tent.js until Wave 3.
