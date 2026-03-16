# TW Layer 1 Extraction — TwChannel + TwNodeOps

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract TW lifecycle state machine and economic primitives from `Tent.js` into `TwChannel.js` (Layer 1). Create `TwNodeOps.js` for node ownership-state commit. `Tent.js` becomes a thin TW delegation shell. NW paths untouched.

**Architecture:** `TwChannel.js` is a module of named functions that receive a channel (tent) instance as first parameter — the same object as the Tent instance during the migration period. `advanceLifecycle(channel, dt)` is the single TW update entry point. `TwNodeOps.js` is a thin module with one primitive. `Tent.js` routes TW `update(dt)` to `TwChannel.advanceLifecycle` and keeps NW inline. `TwFlow` and `TwCombat` extraction is Wave 2; during this wave `_advanceActive` delegates back into the existing `channel._updateClashState` / `channel._updateActiveFlowState` tent methods.

**Tech Stack:** Vanilla JS ES modules. Node.js test scripts (`scripts/*.mjs`). No build step.

**Spec references:**
- `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md`
- `docs/superpowers/specs/2026-03-15-game-architecture-layers.md`

**High-risk files:** `src/entities/Tent.js`, `src/systems/Ownership.js`

**Key invariants to preserve:**
- Programmatic retract (no cutRatio in `kill()`) MUST refund `paidCost + energyInPipe`
- `collapseForOwnershipLoss` MUST clear clash partner before destroying payload and set RETRACTING (not DEAD — preserves animation)
- `getCommittedPayloadForOwnershipCleanup` MUST return `_burstPayload` when `state === BURSTING`
- NW code paths in `Tent.js` must remain completely untouched
- 102 smoke checks must stay green after every commit

**Checks to run:**
- `node scripts/smoke-checks.mjs` — after every commit (102 checks)
- `node scripts/tw-energy-sanity.mjs` — after Task 2 and final
- `node scripts/tw-channel-sanity.mjs` — after Task 1 and Task 2

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| CREATE | `src/tentaclewars/TwChannel.js` | Layer 1: lifecycle state machine + economic primitives |
| CREATE | `src/tentaclewars/TwNodeOps.js` | Layer 1: node ownership-state commit primitive |
| CREATE | `scripts/tw-channel-sanity.mjs` | Unit tests for TwChannel primitives |
| MODIFY | `src/entities/Tent.js` | Wire TW delegation; keep NW inline |
| MODIFY | `src/systems/Ownership.js` | Call `TwNodeOps.commitOwnershipTransfer` instead of direct `node.owner` write |

---

## Chunk 1 — TwChannel extraction

### Task 1: TwChannel.js — economic primitives

**Files:**
- Create: `src/tentaclewars/TwChannel.js`
- Create: `scripts/tw-channel-sanity.mjs`

- [ ] **Step 1.1: Write the test file (will fail — module doesn't exist yet)**

Create `scripts/tw-channel-sanity.mjs`. Tests import from `../src/tentaclewars/TwChannel.js`.

Fixture helper:
```js
function makeChannel(overrides = {}) {
  const src = { energy: 50, id: 1 };
  const tgt = { energy: 50, id: 2 };
  return {
    state: 'ACTIVE',
    paidCost: 10, energyInPipe: 5, _burstPayload: 0,
    startT: 0, reachT: 1.0,
    clashT: null, clashVisualT: null, clashApproachActive: false, clashPartner: null,
    source: src, target: tgt, reversed: false,
    get effectiveSourceNode() { return this.reversed ? this.target : this.source; },
    get effectiveTargetNode() { return this.reversed ? this.source : this.target; },
    get alive() { return this.state !== 'DEAD'; },
    ...overrides,
  };
}
```

Tests to write (one assertion block per function):

1. `retract` — source gains `paidCost + energyInPipe`; state → RETRACTING; paidCost/energyInPipe cleared
2. `retract` — when clashPartner exists: partner.clashPartner cleared; if partner alive, partner.state → ADVANCING
3. `collapseCommittedPayload` — source energy unchanged; state → RETRACTING; paidCost cleared
4. `collapseCommittedPayload` — clash partner cleared (same partner-advance behavior as retract)
5. `getCommittedPayload` — returns `_burstPayload` when `state === 'BURSTING'`
6. `getCommittedPayload` — returns `paidCost + energyInPipe` when ACTIVE
7. `drainSourceEnergy` — source.energy decremented; paidCost/energyInPipe unchanged
8. `partialRefund` — source.energy incremented; state unchanged
9. `beginBurst` — state → BURSTING; `_burstPayload` and `startT` set
10. `transfer` — source.energy decremented; target.energy incremented

Exit code 1 if any test fails.

- [ ] **Step 1.2: Run — confirm all tests fail with "Cannot find module"**
```bash
node scripts/tw-channel-sanity.mjs
```
Expected: `Error: Cannot find module '../src/tentaclewars/TwChannel.js'`

- [ ] **Step 1.3: Create `src/tentaclewars/TwChannel.js` with module header and 7 primitives**

Module header template — follow `docs/project/commentary-header-template.md`.

```js
/* ================================================================
   TwChannel — Layer 1: Network Primitives

   Named functions that operate on a channel (tent) instance.
   This module is the only Layer 1 lane write surface: all node.energy
   writes for lane operations go through these primitives.

   During the migration period, "channel" is a Tent instance. After NW
   retirement, TwChannel will be the sole lane class.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
```

**`retract(channel)` implementation guidance:**
- Replicate `kill()` (Tent.js:425) programmatic branch + `_resolveClashPartnerOnCut(false)` (Tent.js:348)
- Clear `channel.clashT` before resolving partner (matches `kill()` which sets `this.clashT = null` before `_resolveClashPartnerOnCut`)
- Partner advance: `partner.reachT = 1 - channel.reachT` (because `channel.clashT` is already null when partner.reachT is computed — this matches the current `kill()` behavior where clashT is cleared first)
- Partner gets: `state = TentState.ADVANCING`, `clashT = null`, `clashPartner = null`, `clashVisualT = null`, `clashApproachActive = false`
- Only advance partner if `partner.alive`
- Refund: `channel.effectiveSourceNode.energy += paidCost + energyInPipe`
- Then `_clearEconomicPayload(channel)`, `channel.state = TentState.RETRACTING`

**`collapseCommittedPayload(channel)` implementation guidance:**
- Replicate `collapseForOwnershipLoss()` (Tent.js:372) + its `_resolveClashPartnerOnCut(false)` call
- Key difference from `retract`: do NOT clear `channel.clashT` before resolving partner — `collapseForOwnershipLoss` does not clear clashT first, so `partner.reachT = 1 - (channel.clashT ?? channel.reachT)` uses the actual clash position
- Guard: `if (channel.state === TentState.DEAD) return;`
- No refund to source
- Set `channel.reachT` as in current code: `channel.state === GROWING ? reachT : Math.max(reachT, 1)`
- `channel.state = TentState.RETRACTING`

**Private helper `_clearEconomicPayload(channel)`:**
```js
function _clearEconomicPayload(channel) {
  channel.paidCost = 0;
  channel.energyInPipe = 0;
  channel._burstPayload = 0;
}
```

**`getCommittedPayload(channel)`:**
```js
export function getCommittedPayload(channel) {
  return channel.state === TentState.BURSTING
    ? (channel._burstPayload || 0)
    : ((channel.paidCost || 0) + (channel.energyInPipe || 0));
}
```

**`drainSourceEnergy(channel, amount)`:** `channel.effectiveSourceNode.energy = Math.max(0, energy - amount)`

**`partialRefund(channel, amount)`:** `channel.effectiveSourceNode.energy += amount`

**`beginBurst(channel, payload, startT)`:** set state=BURSTING, `_burstPayload=payload`, `startT=startT`

**`transfer(channel, energy)`:** `effectiveSourceNode.energy -= energy; effectiveTargetNode.energy += energy`

- [ ] **Step 1.4: Run tests**
```bash
node scripts/tw-channel-sanity.mjs
```
Expected: all 10 tests pass.

- [ ] **Step 1.5: Commit**
```bash
git add src/tentaclewars/TwChannel.js scripts/tw-channel-sanity.mjs
git commit -m "$(cat <<'EOF'
feat(tw): add TwChannel Layer 1 economic primitives

Creates TwChannel.js with the 7 named primitives that are the exclusive
layer-1 write surface for lane operations: retract, collapseCommittedPayload,
getCommittedPayload, drainSourceEnergy, partialRefund, beginBurst, transfer.

Tent.js not yet modified — additive only. 10/10 tw-channel-sanity tests pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
Run: `node scripts/smoke-checks.mjs` — 102 checks expected.

---

### Task 2: TwChannel.js — lifecycle state machine + Tent.js delegation

**Files:**
- Modify: `src/tentaclewars/TwChannel.js` (add lifecycle functions)
- Modify: `src/entities/Tent.js` (wire TW delegation)

- [ ] **Step 2.1: Extend tw-channel-sanity.mjs with lifecycle tests**

Add lifecycle tests that call `advanceLifecycle(channel, dt)` with mock channels and verify state transitions:

1. GROWING → ACTIVE when `reachT >= 1` (channel with `paidCost = buildCost`, `source.energy` sufficient)
2. RETRACTING → DEAD when `reachT <= 0` (no `twCutRetraction`)
3. ADVANCING → ACTIVE when `reachT >= 1`
4. BURSTING → DEAD when `startT >= 1` (mock `_applyPayloadToTarget` by stubbing the method)
5. DEAD → no-op (DEAD channels are not updated)

For these tests, create minimal mock channels that satisfy the lifecycle preconditions. Do not test the full growing/retract math — only the terminal conditions.

- [ ] **Step 2.2: Run — confirm new tests fail**
```bash
node scripts/tw-channel-sanity.mjs
```
Expected: new lifecycle tests fail, primitives still pass.

- [ ] **Step 2.3: Add lifecycle functions to TwChannel.js**

**`advanceLifecycle(channel, dt)` — single TW update entry point:**
```js
export function advanceLifecycle(channel, dt) {
  if (channel.state === TentState.DEAD) return;
  channel.age = (channel.age || 0) + dt;
  if (channel.cutFlash > 0) channel.cutFlash = Math.max(0, channel.cutFlash - dt * 3);

  if (channel.state === TentState.GROWING)    { _advanceGrowing(channel, dt);    return; }
  if (channel.state === TentState.RETRACTING) { _advanceRetracting(channel, dt); return; }
  if (channel.state === TentState.ADVANCING)  { _advanceAdvancing(channel, dt);  return; }
  if (channel.state === TentState.BURSTING)   { _advanceBursting(channel, dt);   return; }
  _advanceActive(channel, dt);
}
```

**`_advanceGrowing(channel, dt)`:**
Replicate `_updateGrowingState` (Tent.js:615–642). Fields accessed: `channel.game`, `channel.source`, `channel.buildCost`, `channel.reachT`, `channel.paidCost`, `channel.distance`. Imports needed: `resolveGrowingTentacleCollision` from `TentRules.js`, `GROW_PPS` from `gameConfig.js`, `bus` from `EventBus.js`.

Note: This logic is identical for NW and TW today. It is duplicated here as a migration artifact; the NW copy stays in Tent.js until NW is retired.

**`_advanceRetracting(channel, dt)`:**
Replicate `_updateRetractingState` (Tent.js:644–668). Handles both `twCutRetraction` path and plain retract. The `_releaseTentacleWarsCutPayout` logic must be inlined or delegated — keep it as a private helper in TwChannel. This is the most complex of the state advances; read the full method carefully before implementing.

Dependencies: `_refundToSourceNode` (inline as `channel.effectiveSourceNode.energy += amount`), `_applyImmediateTargetEffect` (stays on channel as `channel._applyImmediateTargetEffect`), `_clearTentacleWarsCutRetraction` (inline as `channel.twCutRetraction = null`). The `_releaseTentacleWarsCutPayout` / `_applyTentacleWarsCutRetractionTargetEffect` helpers should call back into the tent instance methods for now (`channel._releaseTentacleWarsCutPayout`, `channel._applyTentacleWarsCutRetractionTargetEffect`) — Wave 2 moves them into TwFlow.

Simplest approach: `_advanceRetracting` delegates to the existing tent methods for the `twCutRetraction` path, and handles the plain retract path inline. This avoids duplicating the cut-payout math in this wave.

```js
function _advanceRetracting(channel, dt) {
  if (channel.twCutRetraction) {
    // delegate to existing tent method — moves to TwFlow in Wave 2
    channel._advanceTwCutRetraction(dt);
    return;
  }
  channel.reachT = Math.max(0, channel.reachT - (GROW_PPS / channel.distance) * dt);
  if (channel.reachT <= 0) channel.state = TentState.DEAD;
}
```

Add a thin `_advanceTwCutRetraction(dt)` method to `Tent.js` that contains the current `twCutRetraction` block from `_updateRetractingState` (lines 644–660). This keeps the logic in one place during migration.

**`_advanceAdvancing(channel, dt)`:**
Replicate `_updateAdvancingState` (Tent.js:670–677). Simple: `reachT += ADV_PPS/distance * dt`, transition to ACTIVE when >= 1.

**`_advanceBursting(channel, dt)`:**
Replicate `_updateBurstingState` (Tent.js:1059–1075). Advances `startT`; when `>= 1`, calls `channel._applyPayloadToTarget(...)` (stays on tent instance in this wave — moves to TwFlow.applyTwPayloadToTarget in Wave 2). Then `channel.state = TentState.DEAD`.

**`_advanceActive(channel, dt)` — the 4-guard bundle (MUST preserve exactly):**

```js
function _advanceActive(channel, dt) {
  const sourceNode = channel.effectiveSourceNode;

  // Guard 1: source captured by enemy while lane was active
  if (sourceNode.owner === 0) { retract(channel); return; }

  // Guard 2: low-energy auto-retract (only when NOT in clash)
  if (!channel.clashPartner && sourceNode.energy < 0.25) { retract(channel); return; }

  // Guard 3: virgin-target captured by AI while tentacle was growing toward it
  const effectiveTarget = channel.effectiveTargetNode;
  if (areHostileOwners(effectiveTarget.owner, sourceNode.owner) &&
      channel._previousTargetOwner === 0) {
    // Current behavior: state transition without refund (matches Tent.js:601-605)
    channel.state = TentState.RETRACTING;
    channel._previousTargetOwner = effectiveTarget.owner;
    return;
  }
  channel._previousTargetOwner = effectiveTarget.owner;

  // Dispatch to clash or flow (Wave 2: will route to TwCombat / TwFlow)
  if (channel.clashPartner?.alive && channel.clashPartner.state !== TentState.RETRACTING) {
    channel._updateClashState(dt); // Wave 2: TwCombat.advanceTwClash(channel, dt)
  } else if (channel.clashT !== null) {
    // Guard 4: clash partner gone but clashT residue — clean up and advance
    channel.clashT = null;
    channel.clashVisualT = null;
    channel.clashApproachActive = false;
    channel.clashPartner = null;
    channel.state = TentState.ADVANCING;
  } else {
    channel.clashT = null;
    channel.clashVisualT = null;
    channel.clashApproachActive = false;
    channel.clashPartner = null;
    channel._updateActiveFlowState(dt); // Wave 2: TwFlow.advanceTwFlow(channel, dt)
  }
}
```

Import `areHostileOwners` from `../systems/OwnerTeams.js`.

- [ ] **Step 2.4: Run lifecycle tests**
```bash
node scripts/tw-channel-sanity.mjs
```
Expected: all tests pass.

- [ ] **Step 2.5: Wire Tent.js delegation**

Add to `Tent.js` imports:
```js
import { advanceLifecycle } from '../tentaclewars/TwChannel.js';
```

In `Tent.update(dt)` (Tent.js:574), add TW delegation before the existing guards:
```js
update(dt) {
  if (this.state === TentState.DEAD) return;

  // TW: all lifecycle advances go through TwChannel
  if (this.effectiveSourceNode?.simulationMode === 'tentaclewars') {
    advanceLifecycle(this, dt);
    return;
  }

  // NW path — untouched
  this.age += dt;
  // ... rest of existing update() unchanged
```

Also add `_advanceTwCutRetraction(dt)` method to `Tent.js` (pull out the `twCutRetraction` block from `_updateRetractingState` into this named method):

```js
/* Called by TwChannel._advanceRetracting during the migration period.
   Will move to TwFlow in Wave 2. */
_advanceTwCutRetraction(dt) {
  // current twCutRetraction block from _updateRetractingState (lines 645–661)
}
```

Then in `_updateRetractingState`, replace the `if (this.twCutRetraction) { ... }` block with:
```js
if (this.twCutRetraction) {
  this._advanceTwCutRetraction(dt);
  return;
}
```

This keeps behavior identical while making the cut-payout path callable from TwChannel.

- [ ] **Step 2.6: Verify**
```bash
node scripts/smoke-checks.mjs
node scripts/tw-energy-sanity.mjs
node scripts/tw-channel-sanity.mjs
```
Expected: 102 / 6 / all pass.

- [ ] **Step 2.7: Commit**
```bash
git add src/tentaclewars/TwChannel.js src/entities/Tent.js scripts/tw-channel-sanity.mjs
git commit -m "$(cat <<'EOF'
feat(tw): add TwChannel lifecycle + wire Tent.js TW delegation

Adds advanceLifecycle, _advanceGrowing, _advanceRetracting, _advanceAdvancing,
_advanceBursting, _advanceActive to TwChannel.js. Tent.update() now routes TW
mode to TwChannel.advanceLifecycle(this, dt). NW path unchanged.

_advanceActive preserves the 4-guard bundle verbatim. _updateClashState and
_updateActiveFlowState remain on the tent instance (Wave 2 moves them to
TwCombat/TwFlow). Adds _advanceTwCutRetraction() helper to Tent.js to make
the cut-payout path accessible from TwChannel.

102 smoke + 6 energy + all channel-sanity tests pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 2 — TwNodeOps + Ownership update

### Task 3: TwNodeOps.js + Ownership.js

**Files:**
- Create: `src/tentaclewars/TwNodeOps.js`
- Modify: `src/systems/Ownership.js`

- [ ] **Step 3.1: Write failing test**

Add to `scripts/tw-channel-sanity.mjs` (or create `scripts/tw-nodeops-sanity.mjs`):

```js
import { commitOwnershipTransfer } from '../src/tentaclewars/TwNodeOps.js';

function testCommitOwnershipTransfer() {
  const node = {
    owner: 2, energy: 80, regen: 5, contest: { 1: 10 },
    syncLevelFromEnergy: null, // no-op
  };
  commitOwnershipTransfer(node, 1, 10);
  assert.equal(node.owner, 1, 'owner updated');
  assert.equal(node.energy, 10, 'energy set to startingEnergy');
  assert.equal(node.regen, 0, 'regen reset');
  assert.equal(node.contest, null, 'contest cleared');
}
```

- [ ] **Step 3.2: Run — confirm test fails**

- [ ] **Step 3.3: Create `src/tentaclewars/TwNodeOps.js`**

```js
/* ================================================================
   TwNodeOps — Layer 1: Node-State Commit Primitives

   The only module that writes node.owner. All ownership-state
   mutations go through commitOwnershipTransfer; no other layer
   writes node.owner directly.
   ================================================================ */

/**
 * commitOwnershipTransfer(node, newOwner, startingEnergy)
 *
 * Invariant-preserving ownership-state mutation. Sets owner, resets
 * energy to the canonical starting value, clears regen and contest
 * state, and syncs level if the node supports it.
 *
 * Visual and event side-effects (cFlash, bus events, tent retraction)
 * remain in Ownership.js (Layer 2 policy).
 */
export function commitOwnershipTransfer(node, newOwner, startingEnergy) {
  node.owner = newOwner;
  node.energy = startingEnergy;
  node.regen = 0;
  node.contest = null;
  node.syncLevelFromEnergy?.();
}
```

- [ ] **Step 3.4: Run test — confirm it passes**

- [ ] **Step 3.5: Update Ownership.js**

In `applyOwnershipChange` (Ownership.js:39), replace the direct node-state writes with `commitOwnershipTransfer`:

Add import:
```js
import { commitOwnershipTransfer } from '../tentaclewars/TwNodeOps.js';
```

Replace (lines 49–55):
```js
node.owner = newOwner;
node.regen = 0;
node.energy = startingEnergy;
node.cFlash = 1;
node.contest = null;
node.shieldFlash = 0;
node.syncLevelFromEnergy?.();
```

With:
```js
commitOwnershipTransfer(node, newOwner, startingEnergy);
node.cFlash = 1;
node.shieldFlash = 0;
```

Visual state (`cFlash`, `shieldFlash`) and bus events remain in `applyOwnershipChange` — these are Layer 2 policy, not substrate invariants.

Also update `retractInvalidTentaclesAfterOwnershipChange` (Ownership.js:13) — it does not write `node.owner` or `node.energy`, so no change needed there.

Also update `Ownership.js` calls to `tent.collapseForOwnershipLoss?.()` and `tent.getCommittedPayloadForOwnershipCleanup?.()` — these are Tent instance method calls that will be renamed in a later wave when TwChannel is fully adopted. Keep as-is for now; add a `// Wave N: will become TwChannel.collapseCommittedPayload / getCommittedPayload` comment.

- [ ] **Step 3.6: Verify**
```bash
node scripts/smoke-checks.mjs
node scripts/tw-energy-sanity.mjs
```
Expected: 102 / 6 pass.

- [ ] **Step 3.7: Commit**
```bash
git add src/tentaclewars/TwNodeOps.js src/systems/Ownership.js scripts/tw-channel-sanity.mjs
git commit -m "$(cat <<'EOF'
feat(tw): add TwNodeOps.commitOwnershipTransfer + update Ownership.js

Creates TwNodeOps.js as the Layer 1 node-state commit primitive. Ownership.js
applyOwnershipChange now calls commitOwnershipTransfer instead of writing
node.owner/energy/regen/contest directly. Visual state (cFlash, shieldFlash)
and bus events remain in Ownership.js as Layer 2 policy.

node.owner is now written only through Layer 1 TwNodeOps primitives.
102 smoke + 6 energy tests pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Module headers + final verification

**Files:**
- Verify: `src/tentaclewars/TwChannel.js` has header
- Verify: `src/tentaclewars/TwNodeOps.js` has header
- Verify: Tent.js and Ownership.js headers updated if materially changed (per CLAUDE.md)

- [ ] **Step 4.1: Check existing headers**

Run:
```bash
node scripts/commentary-policy.mjs
```

Add or update module headers in any touched file that flags. Follow `docs/project/commentary-header-template.md`.

- [ ] **Step 4.2: Run full check suite**
```bash
node scripts/smoke-checks.mjs
node scripts/tw-energy-sanity.mjs
node scripts/tw-channel-sanity.mjs
```
Expected: all pass. If smoke-checks show regressions, do not proceed — investigate first.

- [ ] **Step 4.3: Commit headers (if any)**
```bash
git add src/tentaclewars/TwChannel.js src/tentaclewars/TwNodeOps.js src/entities/Tent.js src/systems/Ownership.js
git commit -m "$(cat <<'EOF'
chore(tw): add module headers to Layer 1 extraction files

Adds commentary headers per project template to TwChannel.js, TwNodeOps.js,
and any other materially changed files from the Layer 1 extraction wave.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Deliverable

When all 4 tasks are complete, respond with `IMPL_REPORT` including:
- Git SHAs for each commit
- Smoke check output (pass count)
- tw-energy-sanity output (pass count)
- tw-channel-sanity output (pass count)
- Any deviations from the plan and their rationale

---

## What this wave does NOT cover (Wave 2)

- `TwFlow.js` — extract `_updateTentacleWarsActiveFlowState` and flow helpers from Tent.js + TentCombat.js
- `TwCombat.js` — extract clash/cut logic from Tent.js
- Renaming `collapseForOwnershipLoss` → `TwChannel.collapseCommittedPayload` on the Tent.js instance level
- Deleting NW paths from Tent.js (NW must be retired first)
- `_advanceTwCutRetraction` moving into TwFlow
