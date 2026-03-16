---
FROM: Claude
PROTOCOL: v2
TASK: TW-WAVE3-001 — TwDelivery extraction
TYPE: IMPLEMENTATION_REQUEST
---

## What this wave does

- Creates `src/tentaclewars/TwDelivery.js` — Layer 1 TW target-side delivery primitives
- Creates `scripts/tw-delivery-sanity.mjs` — 6 sanity tests
- Updates `src/tentaclewars/TwFlow.js` — import from TwDelivery instead of TentCombat
- Updates `src/entities/TentCombat.js` — remove all TW simulationMode branches
- Updates `src/entities/Tent.js` — delete dead TW instance methods

---

## TwDelivery.js — exports

```js
// Layer 1 TW target-side delivery primitives.
// TwFlow.js is the only Layer 2 caller. TentCombat.js has no TW branches after this wave.

export function applyTwFriendlyDelivery(targetNode, amount)
// energy += amount capped at maxE; overflow -> targetNode.pendingExcessFeed
// also increments targetNode.inFlow

export function markNodeUnderAttack(targetNode)
// targetNode.underAttack = Math.max(targetNode.underAttack || 0, 1)
// closes the targetNode.underAttack debt from TwFlow

export function applyTwNeutralCapture(channel, targetNode, sourceNode, amount)
// advances capture progress via setTentacleWarsNeutralCaptureProgress
// adds cFlash 0.35
// calls resolveTwNeutralCapture() if captureScore >= captureThreshold

export function applyTwEnemyAttack(channel, targetNode, sourceNode, amount)
// targetNode.energy -= amount
// calls markNodeUnderAttack(targetNode)
// calls resolveTwHostileCapture() if targetNode.energy <= 0

// --- named ownership pass-throughs (Wave 4 will extract these from Tent.js) ---

function resolveTwNeutralCapture(channel, targetNode, newOwner, captureProgress)
// calls channel._captureNeutralTarget(targetNode, newOwner, captureProgress)
// private to TwDelivery — not exported

function resolveTwHostileCapture(channel, targetNode, attackerOwner, offensivePayload)
// calls channel._defeatEnemyTarget(targetNode, attackerOwner, offensivePayload)
// private to TwDelivery — not exported
```

---

## TwFlow.js — changes

Replace the three TentCombat import calls with TwDelivery:

```js
// remove:
import {
  applyTentacleEnemyAttackFlow,
  applyTentacleFriendlyFlow,
  applyTentacleNeutralCaptureFlow,
  applyTentaclePayloadToTarget,
} from '../entities/TentCombat.js';

// add:
import {
  applyTwFriendlyDelivery,
  applyTwNeutralCapture,
  applyTwEnemyAttack,
  markNodeUnderAttack,
} from './TwDelivery.js';
```

In `advanceTwFlow`:
- Replace `targetNode.underAttack = Math.max(...)` with `markNodeUnderAttack(targetNode)`
- Replace `applyTentacleFriendlyFlow(targetNode, deliveredFeedRate, relayFlowMultiplier, dt)` with `applyTwFriendlyDelivery(targetNode, laneStep.deliveredPacketCount * relayFlowMultiplier)`
- Replace `applyTentacleNeutralCaptureFlow(...)` with `applyTwNeutralCapture(channel, targetNode, sourceNode, laneStep.deliveredPacketCount * relayFlowMultiplier)`
- Replace `applyTentacleEnemyAttackFlow(...)` with `applyTwEnemyAttack(channel, targetNode, sourceNode, laneStep.deliveredPacketCount * relayFlowMultiplier)`

Note: `applyTwPayloadToTarget` in TwFlow.js (used by TwCombat for cut retraction) already
calls `applyTentaclePayloadToTarget` — that path is burst/cut delivery, not flow delivery.
`applyTentaclePayloadToTarget` handles both NW and TW via simulationMode check. Leave it for
the cut-retraction path for now; only the flow-delivery helpers are in scope for this wave.

---

## TentCombat.js — TW branch removals

Remove the `if (targetNode.simulationMode === 'tentaclewars')` blocks from:

1. `applyTentaclePayloadToTarget` — remove the TW branch (lines ~41–75); keep NW path only.
   The TW cut/burst path now routes through TwDelivery from TwFlow → TwCombat.
   Wait — actually `applyTentaclePayloadToTarget` is still called from TwCombat for cut retraction
   (via `applyTwPayloadToTarget` in TwFlow.js). So the TW branch must stay here for this wave
   or TwCombat needs its own targeted delivery call. See note below.

2. `applyTentacleFriendlyFlow` — remove TW branch (lines ~119–136); NW path only.

3. `applyTentacleNeutralCaptureFlow` — remove TW branch (lines ~141–157); NW path only.

4. `applyTentacleEnemyAttackFlow` — remove TW branch (lines ~187–197); NW path only.

### Note on `applyTentaclePayloadToTarget`

This function is still used by the cut-retraction path (`applyTwPayloadToTarget` in TwFlow.js
calls it). If you remove the TW branch from it, the cut-retraction delivery will break.

Two options — choose whichever is cleaner:

**Option X**: Keep the TW branch in `applyTentaclePayloadToTarget` for this wave.
Document it as "TW cut/burst delivery — pending TwDelivery extension in Wave 4".

**Option Y**: Add a `applyTwBurstDelivery(channel, targetNode, sourceNode, amount, opts)` to
TwDelivery.js and update `applyTwPayloadToTarget` in TwFlow.js to call it directly,
then remove the TW branch from `applyTentaclePayloadToTarget` entirely.

Use your judgment. Option Y is cleaner; Option X is safer if the burst/cut path has edge cases
not covered by the flow-delivery sanity tests.

---

## Tent.js — dead code to delete

These methods are dead since Wave 2 routed all TW lanes to TwChannel.advanceLifecycle:

- `_updateTentacleWarsActiveFlowState` — entire method
- `_advanceTwCutRetraction` — entire method
- `_applyTentacleWarsSliceCut` — entire method (kill() already routes to applyTwSliceCut)
- `_clearTentacleWarsCutRetraction` — entire method
- `_applyTentacleWarsCutRetractionTargetEffect` — entire method
- `_releaseTentacleWarsCutPayout` — entire method
- In `_updateRetractingState`: remove the `if (twCutRetraction) { this._advanceTwCutRetraction(dt); return; }` branch
- In `_updateActiveFlowState`: remove the `if (simulationMode === 'tentaclewars')` branch that calls `_updateTentacleWarsActiveFlowState`
- In `_updateClashState`: remove TW-specific `simulationMode === 'tentaclewars'` branches if they are dead (verify first)

Retain: `_captureNeutralTarget`, `_defeatEnemyTarget` — still live, now only called from TwDelivery named pass-throughs.

---

## tw-delivery-sanity.mjs — 6 tests

1. `applyTwFriendlyDelivery` fills energy up to maxE
2. `applyTwFriendlyDelivery` routes overflow to pendingExcessFeed when full
3. `applyTwNeutralCapture` advances progress and adds cFlash
4. `applyTwNeutralCapture` triggers capture when threshold reached
5. `applyTwEnemyAttack` subtracts energy from targetNode
6. `markNodeUnderAttack` sets underAttack flag

---

## Key invariants to preserve

- 102 smoke checks green after every commit
- `applyTwPayloadToTarget` (cut/burst path) still resolves correctly
- `applyTentaclePayloadToTarget` NW path untouched
- Friendly flow overflow still routes to `pendingExcessFeed` (energy model invariant)
- TentCombat.js exports still importable (NW paths unaffected)

---

## Checks to run

After every commit:
```
node scripts/smoke-checks.mjs         (102 checks)
```

After TwDelivery created:
```
node scripts/tw-delivery-sanity.mjs   (6 checks)
```

Final:
```
node scripts/tw-energy-sanity.mjs     (6 checks)
node scripts/tw-channel-sanity.mjs    (16 checks)
node scripts/tw-flow-sanity.mjs       (7 checks)
node scripts/tw-combat-sanity.mjs     (6 checks)
node scripts/smoke-checks.mjs         (102 checks)
node scripts/commentary-policy.mjs    (1 check)
```

---

## Expected deliverable

`IMPL_REPORT` with:
- Git SHAs per commit
- Smoke check pass count per commit
- Final full check suite output
- Choice made for `applyTentaclePayloadToTarget` (Option X or Y) and rationale
- Any deviations from this plan and their rationale

---
