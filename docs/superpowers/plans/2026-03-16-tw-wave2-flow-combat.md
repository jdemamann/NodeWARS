# TW Wave 2 — TwFlow + TwCombat Extraction

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract TW active-flow logic from `Tent.js` into `TwFlow.js` (Layer 2) and TW clash/cut logic into `TwCombat.js` (Layer 2). `TwChannel.js` `advanceActive` drops the Wave 1 call-backs into `Tent.js` methods and calls the new modules directly.

**Architecture:** `TwFlow.js` owns the packet-accumulator flow tick and per-delivery routing. `TwCombat.js` owns the clash front, cut retraction animation, and slice-cut resolution. Both import Layer 1 primitives from `TwChannel.js`; neither touches `node.owner`. After this wave, `TwChannel.advanceActive` has no remaining call-backs into `Tent.js` TW methods. `Tent.kill()` routes TW slices through `TwCombat.applyTwSliceCut`. `TentCombat.js` is untouched — its shared NW/TW helpers remain in use by both paths.

**Tech Stack:** Vanilla JS ES modules. Node.js test scripts (`scripts/*.mjs`). No build step.

**Spec references:**
- `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md`
- `docs/superpowers/specs/2026-03-15-game-architecture-layers.md`

**High-risk files:** `src/tentaclewars/TwChannel.js`, `src/entities/Tent.js`

**Key invariants to preserve:**
- 102 smoke checks green after every commit
- Programmatic retract (no cutRatio) MUST refund `paidCost + energyInPipe`
- TW slice cut MUST produce `twCutRetraction` with geometric source/target split
- Clash auto-retract MUST fire for all outgoing tentacles from the losing source when energy < `TW_RETRACT_CRITICAL_ENERGY`
- `advanceTwClash` is TW-only — no NW mode guard needed (called only from `advanceActive` which is inside the TW lifecycle path)
- `collapseForOwnershipLoss` on `Tent.js` still works (it calls `_resolveClashPartnerOnCut` which is the Tent.js instance method — do not break it)

**Checks to run:**
- `node scripts/smoke-checks.mjs` — after every commit (102 checks)
- `node scripts/tw-energy-sanity.mjs` — after Task 2 and final
- `node scripts/tw-channel-sanity.mjs` — after Task 2 and final

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| CREATE | `src/tentaclewars/TwFlow.js` | Layer 2: TW packet-flow tick + delivery routing |
| CREATE | `scripts/tw-flow-sanity.mjs` | Unit tests for TwFlow |
| CREATE | `src/tentaclewars/TwCombat.js` | Layer 2: TW clash front + cut retraction + slice-cut |
| CREATE | `scripts/tw-combat-sanity.mjs` | Unit tests for TwCombat |
| MODIFY | `src/tentaclewars/TwChannel.js` | Export private helpers; replace call-backs with TwFlow/TwCombat calls |
| MODIFY | `src/entities/Tent.js` | Route TW slice in `kill()` to `TwCombat.applyTwSliceCut` |

---

## Chunk 1 — TwFlow extraction

### Task 1: Create TwFlow.js + tests

**Files:**
- Create: `src/tentaclewars/TwFlow.js`
- Create: `scripts/tw-flow-sanity.mjs`

No changes to TwChannel.js or Tent.js in this task — additive only.

- [ ] **Step 1.1: Write the test file (will fail — module doesn't exist yet)**

Create `scripts/tw-flow-sanity.mjs`. Import from `../src/tentaclewars/TwFlow.js`.

Fixture helper:
```js
import assert from 'node:assert/strict';

function makeChannel(overrides = {}) {
  const src = { energy: 50, id: 1, owner: 1, outCount: 1, excessFeed: 0, simulationMode: 'tentaclewars' };
  const tgt = { energy: 20, maxE: 100, id: 2, owner: 2 };
  return {
    state: 'ACTIVE',
    maxBandwidth: 5,
    packetAccumulatorUnits: 0,
    packetTravelQueue: [],
    travelDurationValue: 0.5,
    energyInPipe: 0,
    pipeAge: 0,
    flowRate: 0,
    source: src, target: tgt, reversed: false,
    get effectiveSourceNode() { return this.reversed ? this.target : this.source; },
    get effectiveTargetNode() { return this.reversed ? this.source : this.target; },
    get travelDuration() { return this.travelDurationValue; },
    ...overrides,
  };
}
```

Tests to write:

1. **`getRelayFlowMultiplier` — non-relay node returns 1.0**
   ```js
   const multiplier = getRelayFlowMultiplier({ isRelay: false, owner: 1, inFog: false });
   assert.equal(multiplier, 1.0);
   ```

2. **`getRelayFlowMultiplier` — relay node with owner returns `RELAY_FLOW_MULT`**
   Import `GAME_BALANCE` from `../src/config/gameConfig.js`.
   ```js
   const multiplier = getRelayFlowMultiplier({ isRelay: true, owner: 1, inFog: false });
   assert.equal(multiplier, GAME_BALANCE.RELAY_FLOW_MULT);
   ```

3. **`getRelayFlowMultiplier` — relay in fog returns 1.0**
   ```js
   const multiplier = getRelayFlowMultiplier({ isRelay: true, owner: 1, inFog: true });
   assert.equal(multiplier, 1.0);
   ```

4. **`applyTwPayloadToTarget` — allied target: energy increases**
   ```js
   const channel = makeChannel();
   channel.effectiveTargetNode.owner = 1; // allied
   applyTwPayloadToTarget(channel, channel.effectiveTargetNode, channel.effectiveSourceNode, 5);
   assert.ok(channel.effectiveTargetNode.energy > 20);
   ```

5. **`advanceTwFlow` — source energy decreases when packets emitted**
   Set up a channel with `packetAccumulatorUnits = 10` (already enough to emit). After one tick, `sourceNode.energy` should be lower or `packetTravelQueue.length > 0`.
   ```js
   const channel = makeChannel({ packetAccumulatorUnits: 10 });
   channel.effectiveSourceNode.energy = 50;
   advanceTwFlow(channel, 0.1);
   // either energy was spent or queue grew
   const activity = channel.effectiveSourceNode.energy < 50 || channel.packetTravelQueue.length > 0;
   assert.ok(activity, 'channel advanced');
   ```

6. **`clearFlowState` — clears pipe fields**
   ```js
   const channel = makeChannel({ energyInPipe: 5, pipeAge: 0.3, packetAccumulatorUnits: 2, packetTravelQueue: [0.1, 0.2] });
   clearFlowState(channel);
   assert.equal(channel.energyInPipe, 0);
   assert.equal(channel.pipeAge, 0);
   assert.equal(channel.packetAccumulatorUnits, 0);
   assert.equal(channel.packetTravelQueue.length, 0);
   ```

7. **`advanceTwFlow` — flowRate updated (non-zero after tick with packets delivered)**
   Set `packetAccumulatorUnits = 100` and `packetTravelQueue = [0]` (already delivered). After tick, `flowRate > 0`.
   ```js
   const channel = makeChannel({
     packetAccumulatorUnits: 0,
     packetTravelQueue: [0], // 1 packet already at destination
   });
   channel.effectiveTargetNode.owner = 1; // allied — friendly flow
   advanceTwFlow(channel, 0.1);
   assert.ok(channel.flowRate > 0, 'flowRate updated');
   ```

Exit code 1 if any test fails.

- [ ] **Step 1.2: Run — confirm all tests fail with "Cannot find module"**
```bash
node scripts/tw-flow-sanity.mjs
```
Expected: `Error: Cannot find module '../src/tentaclewars/TwFlow.js'`

- [ ] **Step 1.3: Create `src/tentaclewars/TwFlow.js`**

```js
/* ================================================================
   TwFlow — Layer 2: TW Packet-Flow Policy

   Owns the TentacleWars active-flow tick and per-delivery energy
   routing. Receives a channel (Tent instance during migration) as
   its first argument.

   Layer rule: may write channel state (packetAccumulatorUnits,
   packetTravelQueue, energyInPipe, pipeAge, flowRate) and call
   Layer 1 TwChannel primitives. Must not write node.owner.
   ================================================================ */

import { GAME_BALANCE } from '../config/gameConfig.js';
import { computeTentacleSourceFeedRate } from '../systems/EnergyBudget.js';
import { areAlliedOwners } from '../systems/OwnerTeams.js';
import { advanceTentacleWarsLaneRuntime } from '../tentaclewars/TwPacketFlow.js';
import {
  applyTentaclePayloadToTarget,
  applyTentacleFriendlyFlow,
  applyTentacleNeutralCaptureFlow,
  applyTentacleEnemyAttackFlow,
} from '../entities/TentCombat.js';

/*
 * Returns the relay throughput multiplier for a source node.
 * Relay nodes with an owner and no fog get RELAY_FLOW_MULT; all others get 1.0.
 */
export function getRelayFlowMultiplier(sourceNode) {
  return (sourceNode.isRelay && sourceNode.owner !== 0 && !sourceNode.inFog)
    ? GAME_BALANCE.RELAY_FLOW_MULT
    : 1.0;
}

/*
 * Applies payload to the target node through the standard TW resolution rules.
 * Thin wrapper over TentCombat.applyTentaclePayloadToTarget so TwCombat can
 * reach the same resolution logic without importing Tent directly.
 *
 * Input: channel acting as tentacle, target/source nodes, payload amount, opts.
 * Output: side-effects on targetNode (energy, cFlash, burstPulse, ownership).
 */
export function applyTwPayloadToTarget(channel, targetNode, sourceNode, payloadAmount, opts = {}) {
  applyTentaclePayloadToTarget({
    tentacle: channel,
    targetNode,
    sourceNode,
    payloadAmount,
    ...opts,
  });
}

/*
 * Resets all pipe and packet-queue fields on a channel.
 * Extracted from Tent._clearPipeState (inline method).
 *
 * Called by TwCombat.applyTwSliceCut before setting twCutRetraction.
 */
export function clearFlowState(channel) {
  channel.energyInPipe = 0;
  channel.pipeAge = 0;
  channel.packetAccumulatorUnits = 0;
  channel.packetTravelQueue = [];
}

/*
 * Advances one frame of TW active-flow state for a channel.
 * Extracted from Tent._updateTentacleWarsActiveFlowState (Tent.js:753).
 *
 * Input: channel in ACTIVE state, delta time.
 * Output: packet accumulator and queue advanced; source energy drained for
 *   emitted packets; delivery effects applied to target; flowRate EMA updated.
 */
export function advanceTwFlow(channel, dt) {
  const sourceNode = channel.effectiveSourceNode;
  const targetNode = channel.effectiveTargetNode;

  const baseThroughputPerSecond = computeTentacleSourceFeedRate(sourceNode, channel.maxBandwidth, dt);
  const excessShare = sourceNode.outCount > 0
    ? (sourceNode.excessFeed || 0) / sourceNode.outCount
    : 0;
  const relayFlowMultiplier = getRelayFlowMultiplier(sourceNode);

  const laneStep = advanceTentacleWarsLaneRuntime({
    accumulatorUnits: channel.packetAccumulatorUnits + excessShare,
    throughputPerSecond: baseThroughputPerSecond,
    deltaSeconds: dt,
    sourceAvailableEnergy: sourceNode.energy,
    queuedPacketTravelTimes: channel.packetTravelQueue,
    travelDurationSeconds: channel.travelDuration,
  });

  channel.packetAccumulatorUnits = laneStep.nextAccumulatorUnits;
  channel.packetTravelQueue = laneStep.nextQueuedPacketTravelTimes;

  const emittedEnergy = laneStep.emittedPacketCount;
  if (emittedEnergy > 0) {
    sourceNode.energy = Math.max(0, sourceNode.energy - emittedEnergy);
  }

  channel.energyInPipe = channel.packetTravelQueue.length;
  channel.pipeAge = channel.packetTravelQueue.length > 0
    ? channel.travelDuration - Math.min(...channel.packetTravelQueue)
    : 0;

  let deliveredAmount = 0;
  if (!areAlliedOwners(targetNode.owner, sourceNode.owner) && targetNode.owner !== 0) {
    targetNode.underAttack = Math.max(targetNode.underAttack || 0, 1);
  }

  if (laneStep.deliveredPacketCount > 0) {
    const deliveredFeedRate = laneStep.deliveredPacketCount / Math.max(dt, 0.001);
    if (areAlliedOwners(targetNode.owner, sourceNode.owner)) {
      deliveredAmount = applyTentacleFriendlyFlow(targetNode, deliveredFeedRate, relayFlowMultiplier, dt);
    } else if (targetNode.owner === 0) {
      deliveredAmount = applyTentacleNeutralCaptureFlow(channel, targetNode, sourceNode, deliveredFeedRate, relayFlowMultiplier, dt);
    } else {
      deliveredAmount = applyTentacleEnemyAttackFlow(channel, targetNode, sourceNode, deliveredFeedRate, relayFlowMultiplier, dt);
    }
  }

  const instantFlowRate = deliveredAmount / Math.max(dt, 0.001);
  channel.flowRate = channel.flowRate * 0.80 + instantFlowRate * 0.20;
}
```

- [ ] **Step 1.4: Run tests**
```bash
node scripts/tw-flow-sanity.mjs
```
Expected: all 7 tests pass.

- [ ] **Step 1.5: Run smoke checks (additive — nothing changed in Tent.js)**
```bash
node scripts/smoke-checks.mjs
```
Expected: 102 pass.

- [ ] **Step 1.6: Commit**
```bash
git add src/tentaclewars/TwFlow.js scripts/tw-flow-sanity.mjs
git commit -m "$(cat <<'EOF'
feat(tw): add TwFlow Layer 2 packet-flow policy module

Creates TwFlow.js with advanceTwFlow (extracted from Tent._updateTentacleWarsActiveFlowState),
applyTwPayloadToTarget (wrapper over TentCombat resolution), getRelayFlowMultiplier,
and clearFlowState (extracted from Tent._clearPipeState per spec migration map).

TwChannel.js and Tent.js not yet modified — additive only.
7/7 tw-flow-sanity tests + 102 smoke checks pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire TwFlow into TwChannel.js

**Files:**
- Modify: `src/tentaclewars/TwChannel.js` (replace call-backs with TwFlow calls)

- [ ] **Step 2.1: Update `advanceBursting` in TwChannel.js**

Current (TwChannel.js:178-191):
```js
function advanceBursting(channel, dt) {
  channel.startT = Math.min(1, channel.startT + (ADV_PPS * 2 / channel.distance) * dt);
  if (channel.startT < 1) return;

  const sourceNode = channel.effectiveSourceNode;
  const targetNode = channel.effectiveTargetNode;
  const payload = channel._burstPayload || 0;
  channel._applyPayloadToTarget(targetNode, sourceNode, payload, {
    contestFlash: 0.8,
    burstPulse: 1.0,
    damageMultiplier: sourceNode.simulationMode === 'tentaclewars' ? 1 : undefined,
  });
  channel.state = TentState.DEAD;
}
```

Replace `channel._applyPayloadToTarget(...)` with `applyTwPayloadToTarget(channel, ...)`.

New `advanceBursting`:
```js
function advanceBursting(channel, dt) {
  channel.startT = Math.min(1, channel.startT + (ADV_PPS * 2 / channel.distance) * dt);
  if (channel.startT < 1) return;

  const sourceNode = channel.effectiveSourceNode;
  const targetNode = channel.effectiveTargetNode;
  const payload = channel._burstPayload || 0;
  applyTwPayloadToTarget(channel, targetNode, sourceNode, payload, {
    contestFlash: 0.8,
    burstPulse: 1.0,
    damageMultiplier: 1,
  });
  channel.state = TentState.DEAD;
}
```

Note: `damageMultiplier: 1` — the `simulationMode` guard was only for NW multiplier, but `advanceBursting` in TwChannel is TW-only so the multiplier is always 1.

Add import at top of TwChannel.js:
```js
import { applyTwPayloadToTarget } from '../tentaclewars/TwFlow.js';
```

- [ ] **Step 2.2: Update `advanceActive` in TwChannel.js — replace flow call-back**

Current `advanceActive` (TwChannel.js:193-230), at the end:
```js
  } else {
    channel.clashT = null;
    channel.clashVisualT = null;
    channel.clashApproachActive = false;
    channel.clashPartner = null;
    channel._updateActiveFlowState(dt); // Wave 2: TwFlow.advanceTwFlow(channel, dt)
  }
```

Replace `channel._updateActiveFlowState(dt)` with `advanceTwFlow(channel, dt)`.

Add to TwChannel.js import line (alongside `applyTwPayloadToTarget`):
```js
import { applyTwPayloadToTarget, advanceTwFlow } from '../tentaclewars/TwFlow.js';
```

The clash call-back (`channel._updateClashState(dt)`) remains unchanged in this task — it will be replaced in Task 4.

- [ ] **Step 2.3: Verify**
```bash
node scripts/smoke-checks.mjs
node scripts/tw-energy-sanity.mjs
node scripts/tw-channel-sanity.mjs
```
Expected: 102 / 6 / all pass.

- [ ] **Step 2.4: Commit**
```bash
git add src/tentaclewars/TwChannel.js
git commit -m "$(cat <<'EOF'
feat(tw): wire TwFlow into TwChannel — replace advanceBursting and flow call-back

advanceBursting now calls TwFlow.applyTwPayloadToTarget instead of
channel._applyPayloadToTarget. advanceActive flow branch now calls
TwFlow.advanceTwFlow(channel, dt) instead of channel._updateActiveFlowState(dt).

Clash call-back (channel._updateClashState) remains — replaced in Wave 2 Task 4.

102 smoke + 6 energy + all channel-sanity tests pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 2 — TwCombat extraction

### Task 3: Create TwCombat.js + tests + export TwChannel helpers

**Files:**
- Modify: `src/tentaclewars/TwChannel.js` (export two private helpers)
- Create: `src/tentaclewars/TwCombat.js`
- Create: `scripts/tw-combat-sanity.mjs`

- [ ] **Step 3.1: Export private helpers from TwChannel.js**

TwCombat.js needs two currently-private helpers from TwChannel.js. Export them:

In TwChannel.js, change:
```js
function clearEconomicPayload(channel) {
```
to:
```js
export function clearEconomicPayload(channel) {
```

And change:
```js
function resolveClashPartnerOnCut(channel, preserveClashT) {
```
to:
```js
export function resolveClashPartnerOnCut(channel, preserveClashT) {
```

These exports do not change behavior — additive only.

- [ ] **Step 3.2: Write the test file (will fail — TwCombat doesn't exist yet)**

Create `scripts/tw-combat-sanity.mjs`.

Fixture helper:
```js
import assert from 'node:assert/strict';

function makeChannel(overrides = {}) {
  const src = { energy: 50, id: 1, owner: 1, outCount: 1, excessFeed: 0,
                simulationMode: 'tentaclewars', tentFeedPerSec: 5 };
  const tgt = { energy: 50, maxE: 100, id: 2, owner: 2, simulationMode: 'tentaclewars' };
  return {
    state: 'ACTIVE',
    paidCost: 10, energyInPipe: 5, _burstPayload: 0,
    reachT: 1.0, startT: 0, clashT: null, clashVisualT: null,
    clashApproachActive: false, clashPartner: null, clashSpark: 0,
    packetAccumulatorUnits: 0, packetTravelQueue: [],
    travelDurationValue: 0.5, distanceValue: 200, pipeCapacity: 10, pipeAge: 0,
    maxBandwidth: 5, twCutRetraction: null,
    source: src, target: tgt, reversed: false,
    get effectiveSourceNode() { return this.reversed ? this.target : this.source; },
    get effectiveTargetNode() { return this.reversed ? this.source : this.target; },
    get travelDuration() { return this.travelDurationValue; },
    get distance() { return this.distanceValue; },
    game: { time: 0, tents: [] },
    ...overrides,
  };
}
```

Tests to write:

1. **`applyTwSliceCut` — sets RETRACTING with twCutRetraction present**
   ```js
   const channel = makeChannel({ paidCost: 10, energyInPipe: 5 });
   applyTwSliceCut(channel, 0.5, 15);
   assert.equal(channel.state, 'RETRACTING');
   assert.ok(channel.twCutRetraction !== null, 'twCutRetraction set');
   assert.ok(channel.twCutRetraction.sourceShare > 0, 'sourceShare > 0');
   assert.ok(channel.twCutRetraction.targetShare > 0, 'targetShare > 0');
   ```

2. **`applyTwSliceCut` — clears clash partner**
   ```js
   const channel = makeChannel();
   const partner = makeChannel();
   channel.clashPartner = partner;
   partner.clashPartner = channel;
   applyTwSliceCut(channel, 0.5, 10);
   assert.equal(channel.clashPartner, null);
   assert.equal(partner.clashPartner, null);
   ```

3. **`advanceTwCutRetraction` — source gains energy over frames**
   ```js
   const channel = makeChannel({
     state: 'RETRACTING',
     reachT: 0.5,
     twCutRetraction: {
       cutRatio: 0.5, sourceShare: 10, targetShare: 5,
       sourceReleased: 0, targetReleased: 0,
       sourceFront: 0.5, targetFront: 0.5,
       initialSourceSpan: 0.5, initialTargetSpan: 0.5,
     },
   });
   // stub target delivery so we can isolate source refund
   channel._captureNeutralTarget = () => {};
   channel._defeatEnemyTarget = () => {};
   const beforeEnergy = channel.effectiveSourceNode.energy;
   advanceTwCutRetraction(channel, 0.1);
   assert.ok(channel.effectiveSourceNode.energy > beforeEnergy, 'source refunded');
   ```

4. **`advanceTwCutRetraction` — state → DEAD when both fronts complete**
   ```js
   const channel = makeChannel({
     state: 'RETRACTING',
     reachT: 0.001,
     twCutRetraction: {
       cutRatio: 0.5, sourceShare: 0.001, targetShare: 0.001,
       sourceReleased: 0.0009, targetReleased: 0.0009,
       sourceFront: 0.0001, targetFront: 0.9999,
       initialSourceSpan: 0.5, initialTargetSpan: 0.5,
     },
   });
   channel._captureNeutralTarget = () => {};
   channel._defeatEnemyTarget = () => {};
   advanceTwCutRetraction(channel, 0.5);
   assert.equal(channel.state, 'DEAD', 'state becomes DEAD');
   assert.equal(channel.twCutRetraction, null, 'twCutRetraction cleared');
   ```

5. **`advanceTwClash` — skips when clashPartner is null**
   ```js
   const channel = makeChannel({ clashPartner: null });
   advanceTwClash(channel, 0.1); // should not throw
   ```

6. **`advanceTwClash` — flowRate updated for TW mode**
   ```js
   const partner = makeChannel({ source: { energy: 50, id: 2, owner: 2, outCount: 1, excessFeed: 0, simulationMode: 'tentaclewars', tentFeedPerSec: 5 } });
   const channel = makeChannel();
   channel.clashPartner = partner;
   partner.clashPartner = channel;
   const before = channel.flowRate;
   advanceTwClash(channel, 0.1);
   assert.ok(channel.flowRate !== undefined, 'flowRate updated');
   ```

Exit code 1 if any test fails.

- [ ] **Step 3.3: Run — confirm all tests fail**
```bash
node scripts/tw-combat-sanity.mjs
```
Expected: `Error: Cannot find module '../src/tentaclewars/TwCombat.js'`

- [ ] **Step 3.4: Create `src/tentaclewars/TwCombat.js`**

```js
/* ================================================================
   TwCombat — Layer 2: TW Clash + Cut Policy

   Owns the TentacleWars clash front, cut retraction animation, and
   slice-cut resolution. Receives a channel (Tent instance during
   migration) as its first argument.

   Layer rule: may write channel combat state (clashT, clashVisualT,
   clashApproachActive, clashPartner, clashSpark, twCutRetraction) and
   call Layer 1 TwChannel primitives. Must not write node.owner.
   ================================================================ */

import { TentState, GROW_PPS, GAME_BALANCE } from '../config/gameConfig.js';
import { TW_BALANCE } from '../tentaclewars/TwBalance.js';
import { clamp } from '../math/simulationMath.js';
import { computeTentacleClashFeedRate } from '../systems/EnergyBudget.js';
import { advanceTentacleWarsLaneRuntime } from '../tentaclewars/TwPacketFlow.js';
import { resolveTentacleWarsCutDistribution } from '../tentaclewars/TwCutRules.js';
import {
  partialRefund,
  resolveClashPartnerOnCut,
  clearEconomicPayload,
} from '../tentaclewars/TwChannel.js';
import { applyTwPayloadToTarget, clearFlowState } from '../tentaclewars/TwFlow.js';

/* ── Clash front helpers ── */

function prepareTwClashState(channel, feedRate, dt) {
  channel.pipeAge = Math.min(channel.pipeAge + dt, channel.travelDuration * 4);
  channel.energyInPipe = Math.min(channel.pipeCapacity, feedRate * channel.travelDuration);
  const simulationTime = channel.game?.time || 0;
  channel.clashSpark = 0.7 + Math.sin(simulationTime * 12) * 0.3;

  /* Pin clashT at midpoint unless the approach animation is still running. */
  if (!channel.clashApproachActive) {
    channel.clashT = 0.5;
    channel.clashVisualT = 0.5;
  }
}

function drainTwClashSourceBudget(channel, dt) {
  const feedRate = computeTentacleClashFeedRate(channel.effectiveSourceNode, channel.maxBandwidth, dt);
  channel.effectiveSourceNode.energy = Math.max(0, channel.effectiveSourceNode.energy - feedRate * dt);
  return feedRate;
}

function isCanonicalClashDriver(channel) {
  return channel.source.id < channel.target.id;
}

function updateTwClashApproach(channel, opposing, dt) {
  const midpoint = 0.5;
  const advanceFraction = (GROW_PPS / Math.max(channel.distance, 1)) * dt;
  const approachStep = Math.max(0.001, advanceFraction);
  const approachedFront =
    channel.clashT < midpoint
      ? Math.min(midpoint, channel.clashT + approachStep)
      : Math.max(midpoint, channel.clashT - approachStep);

  channel.clashT = approachedFront;
  channel.clashVisualT = approachedFront;
  opposing.clashT = 1 - approachedFront;
  opposing.clashVisualT = 1 - approachedFront;

  const reachedMidpoint = Math.abs(approachedFront - midpoint) <= 0.0001;
  if (reachedMidpoint) {
    channel.clashT = midpoint;
    channel.clashVisualT = midpoint;
    channel.clashApproachActive = false;
    opposing.clashT = midpoint;
    opposing.clashVisualT = midpoint;
    opposing.clashApproachActive = false;
  }
}

function updateTwClashFront(channel, opposing) {
  /* TW: front locked at midpoint. Only snap visual when approach is done. */
  channel.clashT = 0.5;
  opposing.clashT = 0.5;
  if (!channel.clashApproachActive && !opposing.clashApproachActive) {
    channel.clashVisualT = 0.5;
    opposing.clashVisualT = 0.5;
  }
  opposing.clashSpark = channel.clashSpark;
}

function applyTwClashDamage(channel, opposing, dt) {
  const sourceNode = channel.effectiveSourceNode;
  const opposingSource = opposing.effectiveSourceNode;

  const myExcessShare = sourceNode.outCount > 0
    ? (sourceNode.excessFeed || 0) / sourceNode.outCount : 0;
  const opposingExcessShare = opposingSource.outCount > 0
    ? (opposingSource.excessFeed || 0) / opposingSource.outCount : 0;
  const myPressure = computeTentacleClashFeedRate(sourceNode, channel.maxBandwidth, dt) + myExcessShare;
  const opposingPressure = computeTentacleClashFeedRate(opposingSource, opposing.maxBandwidth, dt) + opposingExcessShare;

  const netDamage = Math.abs(myPressure - opposingPressure);
  if (netDamage === 0) return;

  const iAmWinner = myPressure >= opposingPressure;
  const winnerTentacle = iAmWinner ? channel : opposing;
  const loserTentacle  = iAmWinner ? opposing : channel;
  const losingSource   = loserTentacle.effectiveSourceNode;

  losingSource.energy = Math.max(0, losingSource.energy - netDamage * dt);

  if (losingSource.energy >= TW_BALANCE.TW_RETRACT_CRITICAL_ENERGY) return;

  /* Auto-retract: snapshot all outgoing tentacles from the losing source. */
  const losingTents = (channel.game?.tents ?? []).filter(t =>
    t.alive &&
    t.state !== TentState.DEAD &&
    t.state !== TentState.RETRACTING &&
    (t.reversed ? t.target : t.source) === losingSource,
  );

  /* Clear clash pair on both sides BEFORE kill() to prevent re-entry. */
  channel.clashPartner = null;
  channel.clashVisualT = null;
  channel.clashApproachActive = false;
  opposing.clashPartner = null;
  opposing.clashVisualT = null;
  opposing.clashApproachActive = false;
  loserTentacle.clashT = null;

  for (const t of losingTents) {
    t.kill(); // programmatic retract — refunds paidCost + energyInPipe
  }

  winnerTentacle.state = TentState.ADVANCING;
  winnerTentacle.clashT = null;
}

/* ── Cut retraction helpers ── */

function releaseTwCutPayout(channel, nextSourceFront, nextTargetFront) {
  const cutRetraction = channel.twCutRetraction;
  if (!cutRetraction) return;

  const sourceProgress = cutRetraction.initialSourceSpan > 0
    ? clamp((cutRetraction.cutRatio - nextSourceFront) / cutRetraction.initialSourceSpan, 0, 1)
    : 1;
  const targetProgress = cutRetraction.initialTargetSpan > 0
    ? clamp((nextTargetFront - cutRetraction.cutRatio) / cutRetraction.initialTargetSpan, 0, 1)
    : 1;

  const desiredSourceReleased = cutRetraction.sourceShare * sourceProgress;
  const desiredTargetReleased = cutRetraction.targetShare * targetProgress;
  const sourceDelta = desiredSourceReleased - cutRetraction.sourceReleased;
  const targetDelta = desiredTargetReleased - cutRetraction.targetReleased;

  if (sourceDelta > 0) partialRefund(channel, sourceDelta);
  if (targetDelta > 0) {
    const targetNode = channel.effectiveTargetNode;
    const sourceNode = channel.effectiveSourceNode;
    applyTwPayloadToTarget(channel, targetNode, sourceNode, targetDelta, { contestFlash: 0, damageMultiplier: 1 });
    /* Progressive cut payout refreshes hit flash without stacking every frame. */
    targetNode.cFlash = Math.max(targetNode.cFlash || 0, 0.6);
  }

  cutRetraction.sourceReleased = desiredSourceReleased;
  cutRetraction.targetReleased = desiredTargetReleased;
  cutRetraction.sourceFront = nextSourceFront;
  cutRetraction.targetFront = nextTargetFront;
}

/* ── Public API ── */

/*
 * Advances one frame of TW clash state for the channel pair.
 * Extracted from Tent._updateClashState (Tent.js:927), TW path only.
 *
 * Input: channel in ACTIVE state with a living clashPartner, delta time.
 * Output: feedRate drained, approach animation or clash front updated,
 *   damage applied; auto-retract fires when loser falls below critical energy.
 */
export function advanceTwClash(channel, dt) {
  const sourceNode = channel.effectiveSourceNode;
  const opposing = channel.clashPartner;
  if (!opposing?.alive) {
    channel.clashPartner = null;
    channel.clashVisualT = null;
    channel.clashApproachActive = false;
    return;
  }

  const feedRate = drainTwClashSourceBudget(channel, dt);
  prepareTwClashState(channel, feedRate, dt);

  /* Block A — unconditional TW flowRate + packet queue update (both tentacles).
     Keeps flowRate alive during clash for packet glow on both sides. */
  const excessShare = sourceNode.outCount > 0
    ? (sourceNode.excessFeed || 0) / sourceNode.outCount
    : 0;
  const localPressure = computeTentacleClashFeedRate(sourceNode, channel.maxBandwidth, dt) + excessShare;
  channel.flowRate = channel.flowRate * 0.80 + localPressure * 0.20;

  const clashStep = advanceTentacleWarsLaneRuntime({
    accumulatorUnits: channel.packetAccumulatorUnits + excessShare,
    throughputPerSecond: computeTentacleClashFeedRate(sourceNode, channel.maxBandwidth, dt),
    deltaSeconds: dt,
    sourceAvailableEnergy: sourceNode.energy,
    queuedPacketTravelTimes: channel.packetTravelQueue,
    travelDurationSeconds: channel.travelDuration * (channel.clashT ?? 0.5),
  });
  channel.packetAccumulatorUnits = clashStep.nextAccumulatorUnits;
  channel.packetTravelQueue = clashStep.nextQueuedPacketTravelTimes;

  /* Only the canonical tent (lower source.id) drives the shared clash front. */
  if (!isCanonicalClashDriver(channel)) return;

  /* Approach animation runs before front is locked at midpoint. */
  if (channel.clashApproachActive || opposing.clashApproachActive) {
    updateTwClashApproach(channel, opposing, dt);
    return;
  }

  /* Block B — canonical driver: front update + net damage model. */
  updateTwClashFront(channel, opposing);
  applyTwClashDamage(channel, opposing, dt);
}

/*
 * Advances one frame of TW cut-retraction animation.
 * Extracted from Tent._advanceTwCutRetraction (Tent.js:655).
 *
 * Input: channel in RETRACTING state with twCutRetraction present, delta time.
 * Output: progressive source refund + target payout; state → DEAD when done.
 */
export function advanceTwCutRetraction(channel, dt) {
  const retractionStep = (GROW_PPS / channel.distance) * dt;
  const nextSourceFront = Math.max(0, channel.twCutRetraction.sourceFront - retractionStep);
  const nextTargetFront = Math.min(1, channel.twCutRetraction.targetFront + retractionStep);

  releaseTwCutPayout(channel, nextSourceFront, nextTargetFront);

  const sourceDone = nextSourceFront <= 0.0001;
  const targetDone = nextTargetFront >= 0.9999;
  if (sourceDone && targetDone) {
    const sourceRemainder = channel.twCutRetraction.sourceShare - channel.twCutRetraction.sourceReleased;
    const targetRemainder = channel.twCutRetraction.targetShare - channel.twCutRetraction.targetReleased;
    if (sourceRemainder > 0) partialRefund(channel, sourceRemainder);
    if (targetRemainder > 0) {
      applyTwPayloadToTarget(channel, channel.effectiveTargetNode, channel.effectiveSourceNode, targetRemainder, { contestFlash: 0.6, damageMultiplier: 1 });
    }
    channel.twCutRetraction = null;
    channel.state = TentState.DEAD;
  }
}

/*
 * Resolves a TentacleWars slice as a continuous geometric split.
 * Extracted from Tent._applyTentacleWarsSliceCut (Tent.js:389).
 *
 * Input: channel, normalised cut position, total committed payload.
 * Output: channel enters RETRACTING with twCutRetraction descriptor;
 *   clash partner resolved; pipe and economic payload cleared.
 */
export function applyTwSliceCut(channel, cutRatio, payload) {
  const { effectiveCutRatio, sourceShare, targetShare } = resolveTentacleWarsCutDistribution(payload, cutRatio);

  resolveClashPartnerOnCut(channel, false);

  /* Reset pipe and packet-queue state via TwFlow (Layer 2 call pattern). */
  clearFlowState(channel);

  channel.state = TentState.RETRACTING;
  channel.reachT = effectiveCutRatio;
  channel.startT = 0;
  channel.twCutRetraction = {
    cutRatio: effectiveCutRatio,
    sourceShare,
    targetShare,
    sourceReleased: 0,
    targetReleased: 0,
    sourceFront: effectiveCutRatio,
    targetFront: effectiveCutRatio,
    initialSourceSpan: Math.max(effectiveCutRatio, 0.000001),
    initialTargetSpan: Math.max(1 - effectiveCutRatio, 0.000001),
  };
  clearEconomicPayload(channel);
}
```

- [ ] **Step 3.5: Run tests**
```bash
node scripts/tw-combat-sanity.mjs
```
Expected: all 6 tests pass.

- [ ] **Step 3.6: Run smoke checks (TwChannel export change is additive)**
```bash
node scripts/smoke-checks.mjs
```
Expected: 102 pass.

- [ ] **Step 3.7: Commit**
```bash
git add src/tentaclewars/TwChannel.js src/tentaclewars/TwCombat.js scripts/tw-combat-sanity.mjs
git commit -m "$(cat <<'EOF'
feat(tw): add TwCombat Layer 2 clash+cut policy module

Creates TwCombat.js with advanceTwClash (extracted from Tent._updateClashState TW path),
advanceTwCutRetraction (extracted from Tent._advanceTwCutRetraction), and applyTwSliceCut
(extracted from Tent._applyTentacleWarsSliceCut).

TwChannel exports clearEconomicPayload and resolveClashPartnerOnCut (were private helpers).
TwChannel.js and Tent.js call sites not yet wired — additive only.
6/6 tw-combat-sanity tests + 102 smoke checks pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire TwCombat into TwChannel + Tent.js

**Files:**
- Modify: `src/tentaclewars/TwChannel.js` (replace remaining call-backs)
- Modify: `src/entities/Tent.js` (route TW slice in `kill()` to TwCombat)

- [ ] **Step 4.1: Update `advanceRetracting` in TwChannel.js**

Current (TwChannel.js:160-168):
```js
function advanceRetracting(channel, dt) {
  if (channel.twCutRetraction) {
    channel._advanceTwCutRetraction(dt);
    return;
  }
  channel.reachT = Math.max(0, channel.reachT - (GROW_PPS / channel.distance) * dt);
  if (channel.reachT <= 0) channel.state = TentState.DEAD;
}
```

Replace `channel._advanceTwCutRetraction(dt)` with `advanceTwCutRetraction(channel, dt)`.

Add import at top of TwChannel.js:
```js
import { advanceTwCutRetraction, advanceTwClash } from '../tentaclewars/TwCombat.js';
```

New `advanceRetracting`:
```js
function advanceRetracting(channel, dt) {
  if (channel.twCutRetraction) {
    advanceTwCutRetraction(channel, dt);
    return;
  }
  channel.reachT = Math.max(0, channel.reachT - (GROW_PPS / channel.distance) * dt);
  if (channel.reachT <= 0) channel.state = TentState.DEAD;
}
```

- [ ] **Step 4.2: Update `advanceActive` in TwChannel.js — replace clash call-back**

Current `advanceActive`, clash branch:
```js
  if (channel.clashPartner?.alive && channel.clashPartner.state !== TentState.RETRACTING) {
    channel._updateClashState(dt); // Wave 2: TwCombat.advanceTwClash(channel, dt)
```

Replace `channel._updateClashState(dt)` with `advanceTwClash(channel, dt)`.

`advanceTwClash` is already imported in Step 4.1.

- [ ] **Step 4.3: Route TW slice in `Tent.kill()` to `TwCombat.applyTwSliceCut`**

In `Tent.js`, add import:
```js
import { applyTwSliceCut } from '../tentaclewars/TwCombat.js';
```

In `Tent.kill()` (Tent.js:426-442), current TW slice branch:
```js
const isTentacleWarsSlice = this.effectiveSourceNode?.simulationMode === 'tentaclewars' && cutRatio !== undefined;

if (isTentacleWarsSlice) {
  this._applyTentacleWarsSliceCut(cutRatio, payload);
  return;
}
```

Replace `this._applyTentacleWarsSliceCut(cutRatio, payload)` with `applyTwSliceCut(this, cutRatio, payload)`.

The `_applyTentacleWarsSliceCut` method on Tent.js MUST NOT be deleted in this task — it may be referenced elsewhere or serve as documentation. Add a comment:
```js
/* Retained as reference — TwCombat.applyTwSliceCut is now the live implementation. */
```

- [ ] **Step 4.4: Verify**
```bash
node scripts/smoke-checks.mjs
node scripts/tw-energy-sanity.mjs
node scripts/tw-channel-sanity.mjs
node scripts/tw-flow-sanity.mjs
node scripts/tw-combat-sanity.mjs
```
Expected: 102 / 6 / all / all / all pass.

- [ ] **Step 4.5: Commit**
```bash
git add src/tentaclewars/TwChannel.js src/entities/Tent.js
git commit -m "$(cat <<'EOF'
feat(tw): wire TwCombat into TwChannel + Tent.js — complete Wave 2 extraction

TwChannel.advanceRetracting now calls TwCombat.advanceTwCutRetraction.
TwChannel.advanceActive clash branch now calls TwCombat.advanceTwClash.
Tent.kill() TW slice branch now calls TwCombat.applyTwSliceCut.

All Wave 1 call-backs into Tent.js TW methods are removed from TwChannel.
TwChannel.advanceActive has no remaining Tent method call-backs.

102 smoke + 6 energy + all sanity tests pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Module headers + final verification

**Files:**
- Verify: `src/tentaclewars/TwFlow.js` has header
- Verify: `src/tentaclewars/TwCombat.js` has header
- Verify: touched files flagged by commentary-policy

- [ ] **Step 5.1: Run commentary policy check**
```bash
node scripts/commentary-policy.mjs
```
Add or update module headers in any touched file that flags. Follow `docs/project/commentary-header-template.md`.

- [ ] **Step 5.2: Run full check suite**
```bash
node scripts/smoke-checks.mjs
node scripts/tw-energy-sanity.mjs
node scripts/tw-channel-sanity.mjs
node scripts/tw-flow-sanity.mjs
node scripts/tw-combat-sanity.mjs
```
Expected: all pass. Do not proceed if smoke-checks show regressions.

- [ ] **Step 5.3: Commit headers (if any changes needed)**
```bash
git add src/tentaclewars/TwFlow.js src/tentaclewars/TwCombat.js src/tentaclewars/TwChannel.js src/entities/Tent.js
git commit -m "$(cat <<'EOF'
chore(tw): add module headers to Wave 2 extraction files

Adds commentary headers per project template to TwFlow.js and TwCombat.js.
Updates any materially changed files from the extraction wave.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Deliverable

When all 5 tasks are complete, respond with `IMPL_REPORT` including:
- Git SHAs for each commit
- Smoke check output (pass count) for final commit
- tw-energy-sanity output (pass count)
- tw-channel-sanity output (pass count), tw-flow-sanity (7/7 expected), tw-combat-sanity (6/6 expected)
- Any deviations from the plan and their rationale

---

## What this wave does NOT cover (Wave 3 / TASK-TW-007)

- Deleting `_applyTentacleWarsSliceCut`, `_advanceTwCutRetraction`, `_updateTentacleWarsActiveFlowState`, `_updateClashState` from `Tent.js` — these are left as dead code / reference until Wave 3 confirms stability
- Renaming `collapseForOwnershipLoss` → `TwChannel.collapseCommittedPayload` on the instance level
- Deleting `TentCombat.js` (shared NW/TW helpers — stays until NW retirement)
- `pairChannels` / `unpairChannels` explicit clash-pair API (TASK-TW-007)
- Packet-native lane runtime (TASK-TW-007)
