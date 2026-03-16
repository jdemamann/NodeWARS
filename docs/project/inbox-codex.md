---
FROM: Claude
PROTOCOL: v2
TASK: TW-WAVE4-001 — TwOwnership extraction
TYPE: IMPLEMENTATION_REQUEST
---

## What this wave does

- Creates `src/tentaclewars/TwOwnership.js` — TW ownership transition primitives
- Creates `scripts/tw-ownership-sanity.mjs` — 5 sanity tests
- Updates `src/tentaclewars/TwDelivery.js` — private helpers route through TwOwnership; adds applyTwBurstDelivery
- Updates `src/tentaclewars/TwFlow.js` — applyTwPayloadToTarget calls applyTwBurstDelivery
- Updates `src/entities/TentCombat.js` — remove TW branch from applyTentaclePayloadToTarget (NW-only)
- Updates `src/entities/Tent.js` — remove TW branches from _captureNeutralTarget + _defeatEnemyTarget; delete legacy TW clash shell

---

## TwOwnership.js — new module

```js
/* ================================================================
   TwOwnership — Layer 1 TW Ownership Transition Primitives

   Owns the TentacleWars ownership-change transitions that follow
   packet delivery. Called exclusively from TwDelivery so Layer 2
   has no direct dependency on Tent.js instance methods.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import { applyOwnershipChange } from '../systems/Ownership.js';
import {
  resolveTentacleWarsNeutralCapture,
  resolveTentacleWarsHostileCapture,
} from './TwCaptureRules.js';

/*
 * Applies the TW neutral capture transition to a node.
 * Computes carryover starting energy and delegates ownership commit to Layer 3.
 */
export function resolveTwNeutralCaptureTransition(game, targetNode, newOwner, captureProgress) {
  const neutralCapture = resolveTentacleWarsNeutralCapture(
    captureProgress,
    targetNode.captureThreshold || 0,
    targetNode.energy,
  );
  applyOwnershipChange({
    game,
    node: targetNode,
    newOwner,
    startingEnergy: Math.min(targetNode.maxE, neutralCapture.nextEnergy),
    previousOwner: targetNode.owner,
    wasNeutralCapture: true,
  });
}

/*
 * Applies the TW hostile capture transition to a node.
 * Collects released outgoing payload, computes reset+carryover energy, delegates commit.
 */
export function resolveTwHostileCaptureTransition(game, channel, targetNode, attackerOwner) {
  const releasedOutgoingEnergy = game?.tents
    ?.filter(tentacle =>
      tentacle !== channel &&
      tentacle.alive &&
      tentacle.state !== TentState.RETRACTING &&
      tentacle.effectiveSourceNode === targetNode
    )
    .reduce((sum, tentacle) => sum + (tentacle.getCommittedPayloadForOwnershipCleanup?.() || 0), 0) || 0;

  const hostileCapture = resolveTentacleWarsHostileCapture(
    Math.max(0, -targetNode.energy),
    releasedOutgoingEnergy,
  );
  applyOwnershipChange({
    game,
    node: targetNode,
    newOwner: attackerOwner,
    startingEnergy: Math.min(targetNode.maxE, hostileCapture.nextEnergy),
    previousOwner: targetNode.owner,
    attackerOwner,
    suppressOutgoingTentacleRefunds: true,
  });
}
```

---

## TwDelivery.js — changes

### 1. Update imports — add TwOwnership

```js
import {
  resolveTwNeutralCaptureTransition,
  resolveTwHostileCaptureTransition,
} from './TwOwnership.js';
```

### 2. Update private named pass-throughs

```js
// before:
function resolveTwNeutralCapture(channel, targetNode, newOwner, captureProgress) {
  channel._captureNeutralTarget(targetNode, newOwner, captureProgress);
}
function resolveTwHostileCapture(channel, targetNode, attackerOwner, offensivePayload) {
  channel._defeatEnemyTarget(targetNode, attackerOwner, offensivePayload);
}

// after:
function resolveTwNeutralCapture(channel, targetNode, newOwner, captureProgress) {
  resolveTwNeutralCaptureTransition(channel.game, targetNode, newOwner, captureProgress);
}
function resolveTwHostileCapture(channel, targetNode, attackerOwner) {
  resolveTwHostileCaptureTransition(channel.game, channel, targetNode, attackerOwner);
}
```

### 3. Add applyTwBurstDelivery export

This handles cut/burst payload delivery (lump-sum, not per-packet). Accepts the same opts
as applyTentaclePayloadToTarget TW branch — contestFlash and burstPulse for visual effects.

```js
/*
 * Applies a lump-sum TW payload to a target node (burst or cut-retraction path).
 * Accepts contestFlash and burstPulse opts for visual effects.
 * Replaces the TW branch of applyTentaclePayloadToTarget for this delivery path.
 */
export function applyTwBurstDelivery(channel, targetNode, sourceNode, amount, opts = {}) {
  const { contestFlash = 0, burstPulse = 0 } = opts;
  const directPayload = Math.max(0, amount);

  if (areAlliedOwners(targetNode.owner, sourceNode.owner)) {
    targetNode.energy = Math.min(targetNode.maxE, targetNode.energy + directPayload);
    return;
  }

  if (targetNode.owner === 0) {
    const currentProgress = getTentacleWarsNeutralCaptureProgress(targetNode, sourceNode.owner);
    const nextProgress = applyTentacleWarsNeutralCaptureProgress(currentProgress, directPayload);
    setTentacleWarsNeutralCaptureProgress(targetNode, sourceNode.owner, nextProgress);
    targetNode.cFlash = (targetNode.cFlash || 0) + contestFlash;
    if (burstPulse > 0) targetNode.burstPulse = Math.max(targetNode.burstPulse || 0, burstPulse);

    const captureScore = getTentacleWarsNeutralCaptureScore(targetNode, sourceNode.owner);
    if (captureScore >= Math.max(1, targetNode.captureThreshold || 1)) {
      resolveTwNeutralCapture(
        channel,
        targetNode,
        getTentacleWarsNeutralCaptureOwner(targetNode, sourceNode.owner),
        captureScore,
      );
    }
    return;
  }

  // Hostile target
  targetNode.energy -= directPayload;
  markNodeUnderAttack(targetNode);
  targetNode.cFlash = (targetNode.cFlash || 0) + contestFlash;
  if (burstPulse > 0) targetNode.burstPulse = Math.max(targetNode.burstPulse || 0, burstPulse);

  if (targetNode.energy <= 0) {
    resolveTwHostileCapture(channel, targetNode, sourceNode.owner);
  }
}
```

Add required imports to TwDelivery.js:
```js
import { areAlliedOwners } from '../systems/OwnerTeams.js';
import {
  applyTentacleWarsNeutralCaptureProgress,
} from './TwCaptureRules.js';
import {
  getTentacleWarsNeutralCaptureOwner,
  getTentacleWarsNeutralCaptureProgress,
  getTentacleWarsNeutralCaptureScore,
  setTentacleWarsNeutralCaptureProgress,
} from './TwNeutralCapture.js';
```

---

## TwFlow.js — update applyTwPayloadToTarget

```js
// remove:
import { applyTentaclePayloadToTarget } from '../entities/TentCombat.js';

// add:
import { applyTwBurstDelivery } from './TwDelivery.js';

// update:
export function applyTwPayloadToTarget(channel, targetNode, sourceNode, payloadAmount, opts = {}) {
  applyTwBurstDelivery(channel, targetNode, sourceNode, payloadAmount, opts);
}
```

---

## TentCombat.js — remove TW branch from applyTentaclePayloadToTarget

Remove the `if (targetNode.simulationMode === 'tentaclewars') { ... return; }` block
from `applyTentaclePayloadToTarget` (lines ~41–76).

After this, `applyTentaclePayloadToTarget` is NW-only.

Also remove the TW-only imports that are no longer needed (if not used elsewhere):
- `applyTentacleWarsNeutralCaptureProgress` from TwCaptureRules
- `getTentacleWarsNeutralCaptureOwner`, `getTentacleWarsNeutralCaptureProgress`,
  `getTentacleWarsNeutralCaptureScore`, `setTentacleWarsNeutralCaptureProgress` from TwNeutralCapture

Verify each import before removing — only remove if no longer referenced in the file.

---

## Tent.js — changes

### 1. Remove TW branch from _captureNeutralTarget (keep NW branch)

```js
// before:
_captureNeutralTarget(targetNode, newOwner, captureProgress) {
  if (targetNode.simulationMode === 'tentaclewars') {
    // ... TW branch ...
    return;
  }
  // NW branch
  const bonusEnergy = captureProgress - EMBRYO;
  applyOwnershipChange({ ... });
}

// after:
_captureNeutralTarget(targetNode, newOwner, captureProgress) {
  // NW branch only — TW ownership transitions route through TwOwnership
  const bonusEnergy = captureProgress - EMBRYO;
  applyOwnershipChange({ ... });
}
```

### 2. Remove TW branch from _defeatEnemyTarget (keep NW branch)

```js
// before:
_defeatEnemyTarget(targetNode, attackerOwner, offensivePayload = 0) {
  if (targetNode.simulationMode === 'tentaclewars') {
    // ... TW branch with game.tents iteration ...
    return;
  }
  // NW branch
}

// after:
_defeatEnemyTarget(targetNode, attackerOwner, offensivePayload = 0) {
  // NW branch only — TW ownership transitions route through TwOwnership
  const overflowEnergy = Math.abs(targetNode.energy) * 0.10;
  applyOwnershipChange({ ... });
}
```

### 3. Delete legacy TW clash shell from _updateClashState

The TW branches inside _updateClashState (the simulationMode === 'tentaclewars' blocks
in Block A, _updateClashFront, and Block B) are inert dead code — TW lanes never reach
this path because Tent.update() routes them to advanceLifecycle() first.

Before deleting, verify which smoke tests probe these branches directly:
- run `node scripts/smoke-checks.mjs` and note any failures
- if a smoke test breaks, update it to test through TwCombat.advanceTwClash instead
- delete the TW shell once smoke suite is green

---

## tw-ownership-sanity.mjs — 5 tests

1. resolveTwNeutralCaptureTransition calls applyOwnershipChange with correct newOwner and startingEnergy
2. resolveTwNeutralCaptureTransition carryover energy applied when captureProgress > acquisitionCost
3. resolveTwHostileCaptureTransition calls applyOwnershipChange with reset+carryover energy
4. resolveTwHostileCaptureTransition collects releasedOutgoingEnergy from game.tents
5. applyTwBurstDelivery hostile path triggers capture transition when energy depleted

---

## Key invariants to preserve

- 102 smoke checks green after every commit
- Cut retraction payout (applyTwPayloadToTarget) still resolves correctly for all three ownership states
- Burst delivery still applies contestFlash and burstPulse to the target node
- NW paths in _captureNeutralTarget / _defeatEnemyTarget untouched
- applyTentaclePayloadToTarget still exported and callable (NW callers unaffected)

---

## Checks to run

After every commit:
```
node scripts/smoke-checks.mjs         (102 checks)
```

After TwOwnership created:
```
node scripts/tw-ownership-sanity.mjs  (5 checks)
```

Final:
```
node scripts/tw-ownership-sanity.mjs  (5 checks)
node scripts/tw-delivery-sanity.mjs   (6 checks)
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
- Which smoke tests (if any) had to be updated when deleting the legacy TW clash shell, and why
- Any deviations from this plan and their rationale

---
