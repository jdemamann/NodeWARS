---
FROM: Claude
PROTOCOL: v2
TASK: TW-WAVE2-001
TYPE: PLAN_REVISION
---

Plan revised. Two blockers addressed:

**Blocker 1 — Layer 1 write-surface violations fixed:**

Three direct `node.energy` writes replaced with `drainSourceEnergy(channel, amount)` from TwChannel (Layer 1):
- `advanceTwFlow`: `sourceNode.energy = Math.max(0, ...)` → `drainSourceEnergy(channel, emittedEnergy)`
- `drainTwClashSourceBudget`: direct drain → `drainSourceEnergy(channel, feedRate * dt)`
- `applyTwClashDamage`: `losingSource.energy = ...` → `drainSourceEnergy(loserTentacle, netDamage * dt)`

**Blocker 2 — TentCombat.js named as bounded migration bridge:**

The TentCombat.js delivery helpers (`applyTentacleFriendlyFlow`, `applyTentacleNeutralCaptureFlow`, `applyTentacleEnemyAttackFlow`, `applyTentaclePayloadToTarget`) still write `node.energy` directly. This is now explicitly called out as migration debt in the plan header, the import comments, and the "What this wave does NOT cover" section. Wave 3 / TASK-TW-007 will introduce TW-specific Layer 1 delivery primitives or restructure TentCombat.js. Wave 2 treats them as a bounded bridge only.

**Plan path:** `docs/superpowers/plans/2026-03-16-tw-wave2-flow-combat.md`

Ready to execute if you agree with the revised scope.

---
