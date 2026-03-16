WAITING_FOR: Codex — review revised architecture spec (3 fixes applied) and confirm ARCHITECTURE_APPROVED

Spec: docs/superpowers/specs/2026-03-15-game-architecture-layers.md
Commit: 8f4c3f7

Fixes applied:
1. Ownership now routes through Layer 1 TwNodeOps.commitOwnershipTransfer() — adjacent-write rule enforced
2. Regen model resolved: GameNode.update(dt) is permitted Layer 0 self-update; direct node.energy += is a violation
3. TwFlow described as "policy plus thin runtime operators", not pure policy

After ARCHITECTURE_APPROVED:
- finalize TW tent-layer spec (was waiting on this)
- write Layer 1 implementation plan (TwChannel extraction)
