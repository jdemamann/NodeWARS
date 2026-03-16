IDLE — Wave 4 merged to main. No active task.

Completed waves:
- Wave 1: TwChannel + TwNodeOps Layer 1 extraction — merged
- Wave 2: TwFlow + TwCombat Layer 2 extraction — merged
- Wave 3: TwDelivery Layer 1 target-side delivery primitives — merged
- Wave 4: TwOwnership Layer 1 ownership transitions + legacy clash shell removal — merged

Current state (post Wave 4):
- TentCombat.js: fully NW-only (no simulationMode checks)
- Tent._captureNeutralTarget + _defeatEnemyTarget: NW-only
- All TW delivery routes through TwDelivery + TwOwnership
- TW clash handled entirely by TwCombat.advanceTwClash (via TwChannel.advanceLifecycle)
- No TW branches remain in Tent._updateClashState

Next wave candidates (Wave 5+):
- TASK-TWL-009 World 1 Playtest Review — validation pass
- TASK-TWL-003 Progression and Score Spec — unblocks TWL-005/006
- TASK-TWL-004 Obstacle Spec
