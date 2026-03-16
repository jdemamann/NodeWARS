MERGED: TW-WAVE2-001 — TwFlow + TwCombat on main

Wave 2 extraction complete:
- TwFlow.js: advanceTwFlow, applyTwPayloadToTarget, getRelayFlowMultiplier, clearFlowState
- TwCombat.js: advanceTwClash, advanceTwCutRetraction, applyTwSliceCut
- TwChannel.advanceActive: no remaining call-backs into Tent.js TW methods
- Tent.kill(): TW slice routes to TwCombat.applyTwSliceCut

Fixed before merge (plan deviation): applyTwClashDamage now uses drainSourceEnergy (Layer 1).

Verification on main: 102/102 smoke, 6/6 energy, 16/16 channel, 7/7 flow, 6/6 combat

Bounded migration debt (explicit, named for Wave 3):
- TentCombat.js delivery helpers (target-side node.energy)
- targetNode.underAttack in TwFlow

Next wave (Wave 3 / TASK-TW-007): Packet-Native Lane Runtime
- Introduce TW-specific Layer 1 delivery primitives (resolve TentCombat.js bridge)
- pairChannels / unpairChannels explicit API
- Delete legacy TW methods from Tent.js
