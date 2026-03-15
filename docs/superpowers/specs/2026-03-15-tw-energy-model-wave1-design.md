# TW Energy Model Wave 1 — Structural Simplification

**Date:** 2026-03-15
**Status:** APPROVED FOR PLANNING
**Authors:** Claude + Codex review

---

## Goal

Replace the over-engineered `twOverflowBudget` / `twOverflowShare` / Physics Step 4 system with a single node property `excessFeed` that correctly models the simple reservoir/pipe mental model:

> Node = reservoir. Tentacle = pipe. Incoming energy fills the node first. True excess flows to outgoing tentacles. The node does not know about "overflow" as a concept — it just exposes how much excess it has.

This wave is structural only — game balance behavior is preserved as closely as possible.

---

## Mental Model

```
feedAvailable = node.tentFeedPerSec + node.excessFeed / node.outCount
```

When node is full (`excessFeed > 0`): outgoing tentacles get base feed + their share of excess.
When node is below max (`excessFeed = 0`): outgoing tentacles get base feed only.
Incoming energy fills the node first; only the true excess (energy that couldn't be absorbed) contributes to `excessFeed`.

"Overflow" is an emergent player perception, not an explicit code abstraction.

---

## What Changes

### New property: `node.excessFeed` (GameNode.js)

Replaces `node.twOverflowBudget`. Initialized to `0`. Represents energy that arrived this frame but could not be absorbed because the node was already at `maxE`.

### `applyTentacleFriendlyFlow` (TentCombat.js)

Currently: `targetNode.twOverflowBudget += overflowEnergy`
New: `targetNode.excessFeed += overflowEnergy`

No other change to this function.

### `_updateTentacleWarsActiveFlowState` (Tent.js)

Currently reads `this.twOverflowShare` (pre-assigned by Physics).
New: computes feed inline:

```js
const excessShare = sourceNode.outCount > 0
  ? (sourceNode.excessFeed || 0) / sourceNode.outCount
  : 0;
const overflowShareUnits = excessShare;
```

`this.twOverflowShare` is no longer read.

### `Tent.js` constructor (line 85)

Remove the property declaration:

```js
this.twOverflowShare = 0;  // remove
```

### `_updateClashState` Block A (Tent.js)

Currently: `localPressure = computeTentacleClashFeedRate(...) + this.twOverflowShare`
New: `localPressure = computeTentacleClashFeedRate(...) + excessShare` (same on-demand calculation)

Both ACTIVE and CLASH paths read the same node snapshot in the same frame — no divergence.

Additionally, the `packetAccumulatorUnits` accumulation in Block A (line 937) currently reads:

```js
accumulatorUnits: this.packetAccumulatorUnits + this.twOverflowShare,
```

This is a third read of `twOverflowShare` in the CLASH path. It changes to:

```js
accumulatorUnits: this.packetAccumulatorUnits + excessShare,
```

Where `excessShare` is the same on-demand calculation used for `localPressure` above.

### `_applyTwClashDamage` (Tent.js lines 1003 and 1005)

This method has two additional reads of `twOverflowShare` not in Block A. Both compute clash pressure for each side:

```js
// Currently (lines 1002-1005):
const myPressure = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt)
  + this.twOverflowShare;
const opposingPressure = computeTentacleClashFeedRate(opposingSource, opposingTentacle.maxBandwidth, dt)
  + opposingTentacle.twOverflowShare;
```

Replace with on-demand excess shares, using each side's own source node:

```js
const myExcessShare = sourceNode.outCount > 0
  ? (sourceNode.excessFeed || 0) / sourceNode.outCount : 0;
const opposingExcessShare = opposingSource.outCount > 0
  ? (opposingSource.excessFeed || 0) / opposingSource.outCount : 0;

const myPressure = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt)
  + myExcessShare;
const opposingPressure = computeTentacleClashFeedRate(opposingSource, opposingTentacle.maxBandwidth, dt)
  + opposingExcessShare;
```

### `Tent.js` import (line 22)

Remove the dead import:

```js
import { distributeTentacleWarsOverflow } from '../tentaclewars/TwEnergyModel.js';
```

This import is unused in `Tent.js`'s body. It must be removed before `TwEnergyModel.js` is deleted to avoid a module resolution failure.

### `Physics.updateOutCounts` (Physics.js)

Remove entirely: Step 4a, 4b, 4c, 4d (the overflow pre-assignment pass).
Add in the nodes reset loop: `n.excessFeed = 0;`
Remove import of `distributeTentacleWarsOverflow`.

### `TwEnergyModel.js`

Remove exports `distributeTentacleWarsOverflow` and `canTentacleWarsOverflow`. These are the only two exports in the file — delete the file entirely.

### `EnergyBudget.js`

Remove `captureTentacleWarsOverflowBudget` (the function and its export). This function is already dead — `Physics.js` no longer calls it as of the previous wave fix. Its removal also eliminates the only remaining imports of `canTentacleWarsOverflow` and `distributeTentacleWarsOverflow` from `TwEnergyModel.js` inside `EnergyBudget.js`:

```js
// Remove this import line:
import { canTentacleWarsOverflow, distributeTentacleWarsOverflow } from '../tentaclewars/TwEnergyModel.js';
```

And remove the function body (lines 23–25):

```js
export function captureTentacleWarsOverflowBudget(node) {
  return canTentacleWarsOverflow(node.energy, node.maxE) ? (node.inFlow || 0) : 0;
}
```

This must happen before or alongside `TwEnergyModel.js` deletion to avoid a broken import.

### `TwDebugMetrics.js`

`overflowReadyNodeCount`: change condition from `node.twOverflowBudget > 0` to `node.excessFeed > 0`.

---

## What Is Removed

| Item | Location | Replacement |
|---|---|---|
| `twOverflowBudget` | GameNode.js | `excessFeed` |
| `twOverflowShare` | Tent.js constructor (line 85) | removed — property declaration deleted |
| Import of `distributeTentacleWarsOverflow` | Tent.js (line 22) | removed — dead import |
| Physics Step 4 (4a–4d) | Physics.js | `n.excessFeed = 0` in reset loop |
| `distributeTentacleWarsOverflow` | TwEnergyModel.js | inline `excessFeed / outCount` |
| `canTentacleWarsOverflow` | TwEnergyModel.js | implicit: `excessFeed > 0` means node was full |
| Import of `distributeTentacleWarsOverflow` | Physics.js | removed |
| `captureTentacleWarsOverflowBudget` | EnergyBudget.js | removed (already dead) |
| Import of `canTentacleWarsOverflow`, `distributeTentacleWarsOverflow` | EnergyBudget.js | removed with function |

---

## What Is Preserved Unchanged

- `OVERFLOW_MODE` constant (TwBalance.js) — kept, Wave 2 decides its fate
- `inFlow` / `relayFeedBudget` — relay-only, rename deferred to Wave 2
- `energyInPipe` semantics — design debt, deferred to Wave 2
- All clash logic, retract, refund invariants (`paidCost + energyInPipe`)
- `TW_SELF_REGEN_FRACTION`, `PASSIVE_REGEN_FRACTION`, `maxBandwidth`
- `packetTravelQueue`, `packetAccumulatorUnits`

---

## Intentional Behavioral Change: Overflow Distribution

The inline formula `excessFeed / outCount` is always energy-conserving (equivalent to `split_equal`). The current runtime uses `OVERFLOW_MODE = 'broadcast_full'`, which multiplied overflow across all outgoing lanes — creating energy from nothing with 2+ outgoing tentacles.

**This wave intentionally eliminates `broadcast_full` multiplication.** This is not accidental:

- `broadcast_full` was identified as a structural flaw: with 3 outgoing tentacles, overflow energy was tripled each frame.
- The corrected reservoir/pipe model has no concept of broadcasting — excess simply divides among pipes.
- The `OVERFLOW_MODE` constant is kept in `TwBalance.js` so Wave 2 can revisit whether broadcast-style overflow should be reintroduced as a deliberate (tunable) game mechanic.

**Balance impact:** Nodes at max energy will feed outgoing tentacles at a lower combined rate than before (total excess divided, not multiplied). This is closer to the original game's physical model. If playtest reveals the change feels too weak, it is a Wave 2 tuning decision, not a Wave 1 bug.

---

## Test Changes

### `scripts/smoke-checks.mjs`

Tests that inject `tent.twOverflowShare` directly must switch to setting `sourceNode.excessFeed` instead, and let the tentacle compute the share on-demand. Affected tests (from Codex review):

- `testTwClashDamageAppliesToLosingNode`
- `testTwClashThresholdTriggersRetractAndAdvance`
- `testTwClashBidirectionalDamage`
- `testTwClashFlowRateStaysAliveOnBothSides`
- `testTwClashPacketQueueFedDuringClash`
- `testTentacleWarsOverflowAndCaptureCore`
- `testTentacleWarsOverflowBudgetAccumulatesAtCap`
- `testTentacleWarsRuntimeMathIntegration`

The new fixture pattern: set `sourceNode.excessFeed = X` to simulate a full node with excess. Assert `sourceNode.excessFeed` accumulates correctly after friendly flow delivery.

**Back-calculating `excessFeed` from old `twOverflowShare` values:**

Old tests injected `twOverflowShare` directly (a per-tentacle value). The new model computes `excessShare = excessFeed / outCount`. To preserve the same effective pressure in a fixture, set:

```js
sourceNode.excessFeed = oldTwOverflowShare * sourceNode.outCount;
```

`outCount` is set by `Physics.updateOutCounts` in `makeTwFixtures` — read `sourceNode.outCount` after the fixture setup call to get the correct multiplier. For the standard two-node fixture, `outCount` is typically `1`.

**Clash test fixture migration (applies to all four clash tests):**

All four clash tests set `tentA.twOverflowShare` and/or `tentB.twOverflowShare` directly on the tent object. After Wave 1, the `twOverflowShare` property is removed from `Tent.js` and the read path is replaced by on-demand `excessFeed / outCount`. The fixture mechanism changes for all four tests:

| Test | Old fixture | New fixture |
|---|---|---|
| `testTwClashDamageAppliesToLosingNode` | `tentA.twOverflowShare = 5` | `sourceA.excessFeed = 5 * sourceA.outCount` |
| `testTwClashThresholdTriggersRetractAndAdvance` | `tentA.twOverflowShare = 10` / `50` | `sourceA.excessFeed = 10 * sourceA.outCount` / `50 * outCount` |
| `testTwClashBidirectionalDamage` | `tentB.twOverflowShare = 10` | `sourceB.excessFeed = 10 * sourceB.outCount` |
| `testTwClashFlowRateStaysAliveOnBothSides` | `tentA.twOverflowShare = 0`, `tentB.twOverflowShare = 0` | no change needed (already zero → `excessFeed` defaults to 0) |

In all cases: `sourceNode.excessFeed = oldTwOverflowShare * sourceNode.outCount`. The formula works because the on-demand calculation divides back by `outCount`, reproducing the same per-tentacle pressure as the direct injection did.

**`testTentacleWarsRuntimeMathIntegration` specifics:**

This test has two migration requirements beyond the generic pattern:

1. The fixture at line 1371 initializes `twOverflowBudget: 4`. Change to `excessFeed: 4`.
2. The source-text regex assertion at line 1392:
   ```js
   assert.match(physicsSource, /n\.twOverflowBudget = 0/, ...)
   ```
   Change to:
   ```js
   assert.match(physicsSource, /n\.excessFeed = 0/, 'Physics reset loop should zero excessFeed each frame')
   ```

**`testTentacleWarsOverflowBudgetAccumulatesAtCap` specifics:**

This test constructs a fixture with `twOverflowBudget: 0` and asserts `targetNode.twOverflowBudget > 0` after calling `applyTentacleFriendlyFlow`. After Wave 1:
- Change fixture key: `twOverflowBudget: 0` → `excessFeed: 0`
- Change assertion: `targetNode.twOverflowBudget > 0` → `targetNode.excessFeed > 0` with message "TentacleWars full-cap friendly flow should accumulate excessFeed"

**`testTentacleWarsOverflowAndCaptureCore` migration:**

This test has two distinct parts:
1. `TW_BALANCE.OVERFLOW_MODE === 'broadcast_full'` assertion — constant still exists, still passes. Leave unchanged.
2. Direct import and behavioral tests of `canTentacleWarsOverflow` and `distributeTentacleWarsOverflow` from `TwEnergyModel.js` (lines 1131–1155). When `TwEnergyModel.js` is deleted, the `load('src/tentaclewars/TwEnergyModel.js')` call will throw a module-not-found error.

Resolution (option a): Remove the `TwEnergyModel.js` load and the function-level assertions (`laneOverflowShares`, `lostOverflowEnergy`, `totalDistributedEnergy`). The behavioral contract these assertions tested is now covered by the new `excessFeed`-based assertions. Add a replacement behavioral assertion: after friendly flow delivery to a full-cap node, assert `targetNode.excessFeed > 0`. The `OVERFLOW_MODE` constant assertion stays.

**Smoke count:** The 101/101 target assumes all eight test updates above are complete. During implementation, the count will be lower until the tests are migrated.

### `scripts/tw-energy-sanity.mjs`

Rewrite to test `excessFeed` accumulation and on-demand sharing instead of `canTentacleWarsOverflow` / `distributeTentacleWarsOverflow` API. The rewritten script must include at minimum:

1. A node at max energy receives friendly flow → `excessFeed > 0` after delivery.
2. A node below max energy receives friendly flow that fits → `excessFeed === 0`.
3. A two-outgoing-tentacle fixture: `excessFeed` is split as `excessFeed / 2` per tentacle (verify `excessShare` computed on-demand matches expected value).
4. `excessFeed` is reset to `0` at the start of the next frame by the Physics reset loop.

---

## Verification

```bash
node scripts/smoke-checks.mjs       # must stay 101/101
node scripts/tw-campaign-sanity.mjs # must stay 15/15
node scripts/tw-energy-sanity.mjs   # rewritten, all pass
```

Manual check: W1-20 support triangle — load the level, let the player-owned A→B→C→A triangle reach max energy. Confirm:
1. All three cells stay at max energy (yellow/full).
2. Yellow orbs are visible flowing along each lane (excess feed active).
3. Place a hostile tentacle on cell B. Confirm B does not drain to zero before the triangle can stabilize — it should hold at mid-energy or recover within ~5 seconds of the attack starting.
4. Remove the hostile tentacle; confirm B refills to max within a reasonable time.

This is a regression baseline, not a performance target. Any of the four conditions failing is a blocker for the wave.

---

## Out of Scope (Wave 2)

- `OVERFLOW_MODE` balance decision (broadcast_full vs split_equal)
- `inFlow` → `relayInFlow` rename
- `energyInPipe` semantic unification across TW and NodeWARS
- TW vs NodeWARS conditional branch unification (~50 `if simulationMode` blocks)
