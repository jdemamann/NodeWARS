WAITING_FOR: Codex — confirm TW_TENT_SPEC_APPROVED after 3 fixes

Spec: docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md

Fixes applied per TW_TENT_SPEC_FEEDBACK:
1. Added "Scope of this spec" section — Layer 1 = TwChannel + TwNodeOps, this spec covers lane-runtime only
2. Substrate paragraph now names both Layer 1 write surfaces (node.energy via TwChannel, node.owner via TwNodeOps)
3. Ownership.js references updated — collapseCommittedPayload() for lane collapse, commitOwnershipTransfer() for node state

After TW_TENT_SPEC_APPROVED: write Layer 1 implementation plan
