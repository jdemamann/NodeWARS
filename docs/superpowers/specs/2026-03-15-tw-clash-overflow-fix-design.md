# TW Clash + Overflow Fix — Design Spec

**Date:** 2026-03-15
**Authors:** Claude (design) + Codex (review — incorporated 2026-03-15)
**Status:** APPROVED — ready for implementation planning

---

## Goal

Fix three interrelated TW bugs that share the same root cause: clash tentacles are completely bypassed by the TW packet/overflow energy model.

1. **A1** — Overflow energy never reaches clash tentacles (no support triangle boost)
2. **A2** — Packet animation disappears during clash (flowRate decays to zero, queue empty)
3. **A3** — Clash never resolves (static 0.5 pin, no damage model, no winner)

---

## Root Causes (confirmed via systematic debugging)

- `twOverflowBudget` is only consumed in `_updateTentacleWarsActiveFlowState` — clash tentacles never enter this path
- `_updateClashFront` for TW pins `clashT` at 0.5 and returns early — no force calculation, no damage, no resolution
- `packetTravelQueue` is not updated during clash — no packets for the renderer, `flowRate` EMA decays to zero

---

## Correct TW Clash Model

### During clash

- Front stays fixed at 0.5 (keep current behavior)
- Both sides emit packets traveling toward 0.5
- Packets cancel at the clash point — the **net difference** causes direct damage to the losing cell's source node (`sourceNode.energy -= netDamage * dt`)
- Overflow from a full support triangle feeds the clash tentacle → more packets → higher net damage/s

### Critical threshold — auto-retract

When a source cell's energy drops below `TW_RETRACT_CRITICAL_ENERGY`:
- It automatically retracts **all** outgoing tentacles (survival instinct)
- Retraction refunds `paidCost + energyInPipe` (existing mechanic, unchanged)
- Visually: the retracted tentacle appears to be pushed back by the winning tentacle

### Auto-advance

After the enemy retracts, the winning tentacle transitions to `ADVANCING` state via the existing clash resolution path.

### Tentacle growth energy constraint (existing, unchanged)

A tentacle can only grow as far as the source cell has energy to pay. If energy runs out mid-growth, the tentacle retracts. This already works and is not modified.

---

## Architecture — Approach C (Hybrid)

### Physics.js — overflow pre-assignment

At the start of each frame, before the tentacle update loop:

1. Zero `tentacle.twOverflowShare = 0` for every tentacle
2. For each node with `twOverflowBudget > 0`:
   - Collect eligible outgoing tentacles: `t.alive`, `t.state` not `DEAD`, not `RETRACTING`, not `BURSTING` — wait, `BURSTING` **is** eligible (the existing `outCount` loop in `Physics.updateOutCounts` does not exclude it). Eligibility: `t.alive && t.state !== DEAD && t.state !== RETRACTING`, `effectiveSourceNode === node`. `BURSTING` tentacles pass this filter, consistent with `outCount`.
   - **Iterate `game.tents` in array order** (same order used by the existing `outCount` loop in `Physics.updateOutCounts`) so the positional index is consistent between the lane count and the assignment set
   - Before the tentacle iteration begins, initialise a `Map<nodeId, counter>` with counter = 0 for every node that has `twOverflowBudget > 0`. These counters are never reset during the iteration — only incremented. Use `distributeTentacleWarsOverflow(node.twOverflowBudget, eligibleCount)` to get per-lane shares per node. (`distributeTentacleWarsOverflow` is an existing helper in `src/tentaclewars/TwEnergyModel.js`.)
   - For each eligible tentacle encountered while iterating `game.tents`, look up its source node's counter in the Map, assign `tentacle.twOverflowShare = laneOverflowShares[counter]`, then increment the counter. Do NOT use the global loop index, and do NOT reset a counter whenever the source node "changes" — tentacles from the same node may be non-contiguous in `game.tents` if they were created at different times (e.g. player draws a second tentacle from a node after earlier turns).
3. Eligibility criteria and iteration order must match the existing `outCount` accounting exactly — divergence between the two loops would cause per-lane share drift

### Tent.js — ACTIVE path (minimal change)

`_updateTentacleWarsActiveFlowState` reads `this.twOverflowShare` instead of calling `distributeTentacleWarsOverflow` inline. Behavior is identical; the share is now pre-assigned by Physics.js.

### Tent.js — CLASH path (new behavior)

The new TW clash logic replaces the existing `if (sourceNode.simulationMode === 'tentaclewars')` branch at `Tent.js:931–934`. It is split into two blocks based on when they run:

**Block A — unconditional (runs for every tentacle in the clash pair, before the `_isCanonicalClashDriver()` guard at line 921):**

- Compute local clash pressure: `localPressure = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt) + this.twOverflowShare`
  - `computeTentacleClashFeedRate` is in `EnergyBudget.js` (already imported at `Tent.js:9`); it returns base feed rate based on node regen budget
- Update `this.flowRate` EMA using `localPressure` — use the same EMA pattern already present in `_updateTentacleWarsActiveFlowState`. This must run on both the canonical and non-canonical tentacle to fix A2 on both sides.
- After Block A, call `this._updateClashFront(opposingTentacle, feedRate, dt)` on the canonical tentacle (as the existing TW branch already does). `_updateClashVisualFront` is not called separately — `_updateClashFront` in TW mode already pins `clashVisualT = 0.5` (Tent.js:869–871).

**Block B — canonical driver only (runs only when `_isCanonicalClashDriver()` returns true):**

1. **Pressure calculation:**
   - `myPressure = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt) + this.twOverflowShare`
   - `opposingPressure = computeTentacleClashFeedRate(opposing.effectiveSourceNode, opposing.maxBandwidth, dt) + opposing.twOverflowShare`
   - `netDamage = max(0, myPressure - opposingPressure)`

2. **Apply net damage** to the losing side's source node:
   - `losingSource.energy = max(0, losingSource.energy - netDamage * dt)`

3. **Critical threshold check** (using `losingSource.energy` **after** net damage is applied in step 2). Ordered sequence:
   - If `losingSource.energy < TW_RETRACT_CRITICAL_ENERGY`:
     - **3a** — Snapshot all outgoing tentacles from `losingSource` (alive, not DEAD/RETRACTING)
     - **3b** — **Clear the clash pair on both sides** (`this.clashPartner = null; opposingTentacle.clashPartner = null; this.clashVisualT = null; opposingTentacle.clashVisualT = null; this.clashApproachActive = false; opposingTentacle.clashApproachActive = false`). Do this BEFORE calling `kill()`. The existing `_resolveClashOutcome` (Tent.js:883–908) follows the same pattern: it nulls both partners and clears `clashApproachActive` first, then kills the loser, then sets `state = ADVANCING`. Safe because `ADVANCING` only uses `this.target` (not `this.clashPartner`).
     - **3c** — Retract each snapshot tentacle by calling `tent.kill()` (no `cutRatio` argument) — this triggers the `isProgrammaticRetract` branch at `Tent.js:462–467`, which is the canonical refund path for `paidCost + energyInPipe`
     - **3d** — Set `this.state = TentState.ADVANCING; this.clashT = null` on the winning tentacle (mirrors `_resolveClashOutcome`'s winner path at Tent.js:893–894)
   - Do NOT re-check `losingSource` after refunds land in the same pass

**Note on `_drainClashSourceBudget` interaction:** `_drainClashSourceBudget` (called at `Tent.js:916`, before the canonical guard and before Block A/B) continues to run unchanged for both TW tentacles. It applies a symmetric fighting-cost drain to each side's source node. Block B's net damage is **additional** asymmetric pressure on top of that symmetric drain — it does NOT replace `_drainClashSourceBudget`. Do not skip `_drainClashSourceBudget` in the TW path.

### TwBalance.js — new constant

```js
TW_RETRACT_CRITICAL_ENERGY: 10,
```

Note: `TW_BALANCE` already has `HOSTILE_CAPTURE_RESET_ENERGY: 10` (energy a captured node starts with). The numerical coincidence is intentional — both values represent "minimum viable energy for a cell to operate" — but they are kept as separate constants so they can be tuned independently if balance requires it.

---

## Visual Fix (bundled)

The visual fix is not a separate wave. It is a direct consequence of the clash damage model:

- `flowRate` stays alive during clash (fed by clash pressure, not packet delivery)
- Packet emission during clash: emit packets toward 0.5 at the same rate as clash pressure (uses `packetTravelQueue` with `clashT` as the effective `laneEnd`)
- `Orb.update()` already dies at `clashT` — existing orb pool is reusable, no new orb logic needed
- Overflow animation on ACTIVE tentacles: correct once `twOverflowShare` is pre-assigned in Physics.js (same path as before, just cleaner)

---

## Files Modified

| File | Change |
|------|--------|
| `src/tentaclewars/TwBalance.js` | Add `TW_RETRACT_CRITICAL_ENERGY: 10` |
| `src/systems/Physics.js` | Add `twOverflowShare` pre-assignment loop after `captureTentacleWarsOverflowBudget` |
| `src/entities/Tent.js` | `_updateTentacleWarsActiveFlowState`: read `this.twOverflowShare` instead of inline calc; `_updateClashState`: add TW clash damage model, threshold check, auto-retract, auto-advance, flowRate update |
| `src/entities/Tent.js` | Add `this.twOverflowShare = 0` to constructor (per-tentacle property, not per-node) |
| `scripts/smoke-checks.mjs` | Add guardrails: clash damage applies to losing node; threshold triggers retract; winner advances |

---

## Out of Scope

- Non-TW clash behavior (NodeWARS mode) — unchanged
- Tentacle growth energy constraint — already works, not modified
- Auto-retract for reasons other than critical threshold (existing low-energy kill path untouched)
- Barrier position fixes (Wave 2, separate)
- Mobile layout (Wave 3, separate)

---

## Verification

```bash
node scripts/smoke-checks.mjs   # must stay 96/96 or higher
node scripts/tw-campaign-sanity.mjs   # must stay 15/15
```

Manual check: W1-20 support triangle → clash tentacle → verify clash resolves, enemy retracts, winning tentacle advances.

### Smoke-check harness sketch (clash damage guardrail)

The new guardrails follow the pattern already established in `scripts/smoke-checks.mjs` (minimal node + tent pairs, no canvas/DOM):

```js
// Setup: two TW nodes with opposing tentacles in clash
const sourceA = makeTwNode({ owner: 1, energy: 50, maxE: 60 });
const sourceB = makeTwNode({ owner: 2, energy: 8,  maxE: 60 }); // near threshold

const tentA = makeTent(sourceA, sourceB); // tentA: sourceA.id < sourceB.id → canonical driver
const tentB = makeTent(sourceB, sourceA);
tentA.clashPartner = tentB;
tentB.clashPartner = tentA;
tentA.twOverflowShare = 3; // overflow boost
tentB.twOverflowShare = 0;

// Both tentacles update (Block A runs for both; Block B runs only for canonical driver)
tentB._updateClashState(0.1); // non-canonical: only updates flowRate
tentA._updateClashState(0.1); // canonical: pressure, damage, threshold check

// A3 assertions (clash resolution)
// Assert: sourceB.energy reduced by net damage
// Assert: if sourceB.energy < TW_RETRACT_CRITICAL_ENERGY → tentB.state === RETRACTING
// Assert: tentA.state === ADVANCING after threshold triggered

// A2 assertion (flowRate stays alive — fix for visual bug)
// Assert: tentB.flowRate > 0  (non-canonical tentacle also gets flowRate update via Block A)
// Assert: tentA.flowRate > 0
```
