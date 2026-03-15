# TW Clash + Overflow Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three interrelated TentacleWars bugs where clash tentacles are completely bypassed by the TW packet/overflow energy model, leaving overflow disconnected, clash unresolved, and packet animation dead.

**Architecture:** Add `twOverflowShare` as a per-tentacle property pre-assigned by Physics.js each frame before the update loop; update Tent.js `_updateTentacleWarsActiveFlowState` to read it instead of computing inline; replace the stub TW clash branch in `_updateClashState` with Block A (unconditional flowRate update, both tentacles) + Block B (canonical driver: net damage, threshold check, auto-retract, auto-advance).

**Tech Stack:** Vanilla JS ES modules, Node.js for smoke checks (`node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-03-15-tw-clash-overflow-fix-design.md`

---

## File Map

| File | What changes |
|------|-------------|
| `src/tentaclewars/TwBalance.js` | Add `TW_RETRACT_CRITICAL_ENERGY: 10` constant |
| `src/entities/Tent.js` | Add `this.twOverflowShare = 0` to constructor; update `_updateTentacleWarsActiveFlowState` to read `this.twOverflowShare`; replace TW stub in `_updateClashState` with Block A + Block B |
| `src/systems/Physics.js` | Add `twOverflowShare` pre-assignment loop after the existing `outCount` loop in `updateOutCounts` |
| `scripts/smoke-checks.mjs` | Add three new guardrail tests (clash damage, threshold retract, flowRate alive) |

---

## Chunk 1: Constant + property scaffold

### Task 1: Add `TW_RETRACT_CRITICAL_ENERGY` constant

**Files:**
- Modify: `src/tentaclewars/TwBalance.js`

- [ ] **Step 1: Read the file to confirm insertion point**

  Run: `node -e "import('./src/tentaclewars/TwBalance.js').then(m => console.log(Object.keys(m.TW_BALANCE)))"`
  Expected: list of keys including `HOSTILE_CAPTURE_RESET_ENERGY`

- [ ] **Step 2: Add the constant after `HOSTILE_CAPTURE_RESET_ENERGY`**

  In `src/tentaclewars/TwBalance.js`, after the line:
  ```js
    HOSTILE_CAPTURE_RESET_ENERGY: 10,
  ```
  Add:
  ```js
    /* Minimum viable energy for a TW cell to sustain outgoing pressure.
       When a losing source drops below this threshold during clash,
       it auto-retracts all outgoing tentacles (survival instinct).
       Kept separate from HOSTILE_CAPTURE_RESET_ENERGY so each can be
       tuned independently — numerically equal by intentional design. */
    TW_RETRACT_CRITICAL_ENERGY: 10,
  ```

- [ ] **Step 3: Verify constant is exported**

  Run:
  ```bash
  node -e "import('./src/tentaclewars/TwBalance.js').then(m => console.log(m.TW_BALANCE.TW_RETRACT_CRITICAL_ENERGY))"
  ```
  Expected: `10`

- [ ] **Step 4: Run smoke checks — baseline must stay green**

  Run: `node scripts/smoke-checks.mjs`
  Expected: all existing tests PASS (count stays the same)

- [ ] **Step 5: Commit**

  ```bash
  git add src/tentaclewars/TwBalance.js
  git commit -m "TW: add TW_RETRACT_CRITICAL_ENERGY constant to TwBalance"
  ```

---

### Task 2: Add `twOverflowShare` property to `Tent` constructor

**Files:**
- Modify: `src/entities/Tent.js` (constructor, ~line 80)

The `Tent` constructor ends around line 100. The property belongs in the `/* Pipe model */` block (lines 72–78) or just after `flowRate = 0` in the `/* Visual */` block (line 81). Add it after `flowRate = 0` since it is a per-tentacle TW-specific flow property.

- [ ] **Step 1: Locate the insertion point**

  In `src/entities/Tent.js`, find the line:
  ```js
    this.flowRate    = 0;
  ```
  (currently at line 81)

- [ ] **Step 2: Add the property**

  After `this.flowRate = 0;`, add:
  ```js
    /* TentacleWars overflow share — pre-assigned by Physics.js each frame.
       Zero by default; only meaningful in TW mode with a full support triangle. */
    this.twOverflowShare = 0;
  ```

- [ ] **Step 3: Verify with smoke checks**

  Run: `node scripts/smoke-checks.mjs`
  Expected: all tests still PASS

- [ ] **Step 4: Commit**

  ```bash
  git add src/entities/Tent.js
  git commit -m "TW: add twOverflowShare property to Tent constructor"
  ```

---

## Chunk 2: Physics pre-assignment loop

### Task 3: Pre-assign `twOverflowShare` in `Physics.updateOutCounts`

**Files:**
- Modify: `src/systems/Physics.js`

The existing `updateOutCounts` method (lines 18–45) has three passes:
1. Reset node-level counters (lines 22–30)
2. Count outgoing tentacles per node (lines 32–37)
3. Compute `tentFeedPerSec` per node (lines 42–44)

Add a new pass **4** after pass 3: zero all `twOverflowShare`, then distribute overflow to eligible tentacles.

**Key rules (from spec):**
- Eligibility: `t.alive && t.state !== TentState.DEAD && t.state !== TentState.RETRACTING` (BURSTING tentacles ARE eligible — consistent with `outCount`)
- Use `Map<nodeId, counter>` initialized before the tent loop; counters never reset, only incremented
- `distributeTentacleWarsOverflow` is in `src/tentaclewars/TwEnergyModel.js` (need to import it)

- [ ] **Step 1: Add the import**

  In `src/systems/Physics.js`, add to the imports at the top:
  ```js
  import { distributeTentacleWarsOverflow } from '../tentaclewars/TwEnergyModel.js';
  ```

- [ ] **Step 2: Add pass 4 at the end of `updateOutCounts`**

  After the `tentFeedPerSec` loop (after line 44, before the closing `}`), add:

  ```js
    /* Pass 4: TentacleWars overflow pre-assignment.
       Distributes each node's twOverflowBudget to eligible outgoing tentacles
       so both ACTIVE and CLASH paths read a ready-to-consume per-tentacle share. */

    // Step 4a: zero every tentacle's share (covers non-TW tentacles too)
    for (let i = 0; i < tents.length; i++) {
      tents[i].twOverflowShare = 0;
    }

    // Step 4b: collect eligible tentacle counts per TW node with overflow
    const overflowEligibleCounts = new Map(); // nodeId → eligible count
    for (let i = 0; i < tents.length; i++) {
      const t = tents[i];
      if (!t.alive || t.state === TentState.DEAD || t.state === TentState.RETRACTING) continue;
      const src = t.reversed ? t.target : t.source;
      if (src.simulationMode !== 'tentaclewars' || !(src.twOverflowBudget > 0)) continue;
      overflowEligibleCounts.set(src.id, (overflowEligibleCounts.get(src.id) ?? 0) + 1);
    }

    // Step 4c: assign shares using per-node counters (Map<nodeId, counter>)
    // Counters are incremented each time an eligible tentacle for that node is seen.
    // Do NOT reset when source node changes — tentacles may be non-contiguous in game.tents.
    const perNodeCounter = new Map(); // nodeId → assignment index so far
    for (let i = 0; i < tents.length; i++) {
      const t = tents[i];
      if (!t.alive || t.state === TentState.DEAD || t.state === TentState.RETRACTING) continue;
      const src = t.reversed ? t.target : t.source;
      if (src.simulationMode !== 'tentaclewars' || !(src.twOverflowBudget > 0)) continue;
      const eligibleCount = overflowEligibleCounts.get(src.id) ?? 0;
      if (eligibleCount === 0) continue;
      const { laneOverflowShares } = distributeTentacleWarsOverflow(src.twOverflowBudget, eligibleCount);
      const idx = perNodeCounter.get(src.id) ?? 0;
      t.twOverflowShare = laneOverflowShares[idx] ?? 0;
      perNodeCounter.set(src.id, idx + 1);
    }
  ```

- [ ] **Step 3: Verify with smoke checks**

  Run: `node scripts/smoke-checks.mjs`
  Expected: all tests still PASS

- [ ] **Step 4: Commit**

  ```bash
  git add src/systems/Physics.js
  git commit -m "TW: pre-assign twOverflowShare per tentacle in Physics.updateOutCounts"
  ```

---

## Chunk 3: Active path — read pre-assigned share

### Task 4: Update `_updateTentacleWarsActiveFlowState` to read `this.twOverflowShare`

**Files:**
- Modify: `src/entities/Tent.js` (`_updateTentacleWarsActiveFlowState`, lines 737–785)

Currently at line 740–743:
```js
const outgoingTentacles = Math.max(1, sourceNode.outCount);
const overflowShareUnits = distributeTentacleWarsOverflow(
  sourceNode.twOverflowBudget || 0,
  outgoingTentacles,
).laneOverflowShares[0] || 0;
```

Replace with a single line reading the pre-assigned share. The import of `distributeTentacleWarsOverflow` in `Tent.js` stays (it may still be needed elsewhere); just stop calling it inline here.

- [ ] **Step 1: Replace the inline distribution call**

  In `_updateTentacleWarsActiveFlowState`, replace:
  ```js
    const outgoingTentacles = Math.max(1, sourceNode.outCount);
    const overflowShareUnits = distributeTentacleWarsOverflow(
      sourceNode.twOverflowBudget || 0,
      outgoingTentacles,
    ).laneOverflowShares[0] || 0;
  ```
  With:
  ```js
    /* Overflow share is pre-assigned by Physics.updateOutCounts each frame. */
    const overflowShareUnits = this.twOverflowShare;
  ```

- [ ] **Step 2: Run smoke checks**

  Run: `node scripts/smoke-checks.mjs`
  Expected: `TentacleWars overflow budget accumulates when node is at energyCap` and all other tests still PASS. If overflow-related tests fail, check that Physics.updateOutCounts is called before tent updates in the game loop.

- [ ] **Step 3: Commit**

  ```bash
  git add src/entities/Tent.js
  git commit -m "TW: active path reads pre-assigned twOverflowShare instead of computing inline"
  ```

---

## Chunk 4: Clash path — new TW damage model

### Task 5: Replace the TW clash stub in `_updateClashState`

**Files:**
- Modify: `src/entities/Tent.js` (`_updateClashState`, lines 911–939)

**Background:** The current TW branch at lines 931–934 is:
```js
if (sourceNode.simulationMode === 'tentaclewars') {
  this._updateClashFront(opposingTentacle, feedRate, dt);
  return;
}
```
This branch must be replaced with Block A + Block B.

**Block A (runs before the `_isCanonicalClashDriver()` guard, for both tentacles):**
- Compute `localPressure = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt) + this.twOverflowShare`
- Update `this.flowRate` EMA using `localPressure` (same formula as `_updateTentacleWarsActiveFlowState` line 784)

**Block B (runs inside the canonical guard, TW mode only):**
- Pressure calc using both sides
- Net damage to loser's source
- Threshold check with ordered retract sequence
- `_updateClashFront` call

**Where exactly to insert:**

The current `_updateClashState` structure (simplified):
```js
_updateClashState(dt) {
  ...
  const feedRate = this._drainClashSourceBudget(sourceNode, dt);  // line 916
  this._prepareClashState(feedRate, dt);

  // ← INSERT Block A HERE (before the guard)

  if (!this._isCanonicalClashDriver()) return;  // line 921

  if (this.clashApproachActive || ...) { ... return; }

  if (sourceNode.simulationMode === 'tentaclewars') {  // line 931 ← REPLACE THIS
    this._updateClashFront(opposingTentacle, feedRate, dt);
    return;
  }

  this._updateClashFront(...);
  this._updateClashVisualFront(...);
  this._resolveClashOutcome(opposingTentacle);
}
```

Also need to import `TW_BALANCE` in `Tent.js` to access `TW_RETRACT_CRITICAL_ENERGY`.

- [ ] **Step 1: Add `TW_BALANCE` import to `Tent.js`**

  In `src/entities/Tent.js`, find the import from `TwEnergyModel.js` (line 22):
  ```js
  import { distributeTentacleWarsOverflow } from '../tentaclewars/TwEnergyModel.js';
  ```
  Add a new import after it:
  ```js
  import { TW_BALANCE } from '../tentaclewars/TwBalance.js';
  ```

- [ ] **Step 2: Insert Block A before the canonical guard**

  In `_updateClashState`, after `this._prepareClashState(feedRate, dt);` and before `if (!this._isCanonicalClashDriver()) return;`, insert:

  ```js
    /* Block A — unconditional TW flowRate update (runs for both tentacles).
       Keeps flowRate alive during clash so the renderer sees active packet glow
       on both sides (fixes A2). Must run before the canonical guard.

       Unit note: computeTentacleClashFeedRate returns energy/sec (same units as
       instantFlowRate in _updateTentacleWarsActiveFlowState), so localPressure is
       directly compatible with the existing EMA formula — do NOT divide by dt. */
    if (sourceNode.simulationMode === 'tentaclewars') {
      const localPressure = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt)
        + this.twOverflowShare;
      this.flowRate = this.flowRate * 0.80 + localPressure * 0.20;
    }
  ```

- [ ] **Step 3: Replace the TW stub branch with Block B**

  Find and replace:
  ```js
    if (sourceNode.simulationMode === 'tentaclewars') {
      this._updateClashFront(opposingTentacle, feedRate, dt);
      return;
    }
  ```
  With:
  ```js
    if (sourceNode.simulationMode === 'tentaclewars') {
      /* Block B — canonical driver only: net damage model, threshold check,
         auto-retract and auto-advance (fixes A1 and A3). */
      this._updateClashFront(opposingTentacle, feedRate, dt);
      this._applyTwClashDamage(opposingTentacle, dt);
      return;
    }
  ```

- [ ] **Step 4: Add `_applyTwClashDamage` method to `Tent`**

  Add the following method to the `Tent` class, directly after `_updateClashState` (before the `/* ── Bursting ── */` comment at line 941):

  ```js
  /*
   * TentacleWars clash damage model.
   * Called by the canonical clash driver each frame after _updateClashFront.
   * Applies net pressure as direct energy damage to the losing source,
   * and triggers auto-retract + auto-advance when the losing source falls
   * below TW_RETRACT_CRITICAL_ENERGY.
   *
   * NOTE: _drainClashSourceBudget already runs for both tentacles before this
   * method is called. Block B net damage is additional asymmetric pressure
   * on top of that symmetric drain — do not remove _drainClashSourceBudget.
   *
   * NOTE: _isCanonicalClashDriver() uses this.source.id < this.target.id
   * (original source/target, NOT effectiveSourceNode.id). The effective*
   * properties are used only for pressure calculations, not for identity.
   * Reversed tentacles are out of scope for this wave.
   *
   * NOTE: this.game must be set before this method can fire (set externally
   * after Tent construction). this.game?.tents with optional chain is a
   * defensive guard — it should not be reached with game === null in practice.
   */
  _applyTwClashDamage(opposingTentacle, dt) {
    const sourceNode = this.effectiveSourceNode;
    const opposingSource = opposingTentacle.effectiveSourceNode;

    /* Pressure = base feed rate + overflow share for each side.
       Both sourceNode.energy and opposingSource.energy are already post-drain
       when Block B runs (_drainClashSourceBudget fired earlier in _updateClashState
       for each tentacle). Do NOT cache pre-drain values for symmetry — the drain
       is intentional and both sides are correctly reduced before this point. */
    const myPressure = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt)
      + this.twOverflowShare;
    const opposingPressure = computeTentacleClashFeedRate(opposingSource, opposingTentacle.maxBandwidth, dt)
      + opposingTentacle.twOverflowShare;
    const netDamage = Math.max(0, myPressure - opposingPressure);

    if (netDamage === 0) return;

    /* Apply net damage to the losing side's source */
    const losingSource = opposingSource;
    losingSource.energy = Math.max(0, losingSource.energy - netDamage * dt);

    /* Critical threshold check — using post-damage energy */
    if (losingSource.energy >= TW_BALANCE.TW_RETRACT_CRITICAL_ENERGY) return;

    /* Auto-retract: snapshot all outgoing tentacles from the losing source */
    const losingTents = (this.game?.tents ?? []).filter(t =>
      t.alive &&
      t.state !== TentState.DEAD &&
      t.state !== TentState.RETRACTING &&
      (t.reversed ? t.target : t.source) === losingSource,
    );

    /* Step 3b: clear clash pair on both sides BEFORE calling kill().
       Prevents re-entry into _updateClashState via the clashT branch
       when the outer loop reaches the losing tentacle later this frame.
       Pattern mirrors _resolveClashOutcome (Tent.js:883–908). */
    this.clashPartner = null;
    this.clashVisualT = null;
    this.clashApproachActive = false;
    opposingTentacle.clashPartner = null;
    opposingTentacle.clashVisualT = null;
    opposingTentacle.clashApproachActive = false;

    /* Step 3c: retract all losing tentacles — programmatic retract refunds paidCost + energyInPipe */
    for (const t of losingTents) {
      t.kill(); // no cutRatio → isProgrammaticRetract branch at Tent.js:462–467
    }

    /* Step 3d: winning tentacle advances */
    this.state = TentState.ADVANCING;
    this.clashT = null;
  }
  ```

- [ ] **Step 5: Run smoke checks**

  Run: `node scripts/smoke-checks.mjs`
  Expected: all existing tests still PASS (no new tests yet; existing clash tests must not regress)

- [ ] **Step 6: Commit**

  ```bash
  git add src/entities/Tent.js
  git commit -m "TW: add Block A/B clash damage model to _updateClashState"
  ```

---

## Chunk 5: Smoke-check guardrails

### Task 6: Add three guardrail tests to `smoke-checks.mjs`

**Files:**
- Modify: `scripts/smoke-checks.mjs`

Add three test functions and register them in the `tests` array. Follow the exact pattern of existing tests (no canvas/DOM, minimal node + tent pairs, `GameNode` + `Tent` constructed directly).

**How to set up a TW node:** `GameNode` constructor: `new GameNode(id, x, y, energy, owner)`. Then set `node.simulationMode = 'tentaclewars'` and `node.maxE = <value>`. Physics.updateOutCounts needs `game.nodes` and `game.tents`.

**Canonical driver rule:** `tentA` is canonical when `tentA.source.id < tentA.target.id`. In the tests below, `sourceA.id = 0` and `sourceB.id = 1`, so `tentA = new Tent(sourceA, sourceB, 0)` is canonical (0 < 1).

- [ ] **Step 1: Add helper function before the first test function**

  After the imports at the top of `scripts/smoke-checks.mjs`, add:

  ```js
  // ── TW test helpers ─────────────────────────────────────────────────────────

  async function makeTwFixtures({ energyA = 50, energyB = 50, maxE = 60 } = {}) {
    const { GameNode } = await load('src/entities/GameNode.js');
    const { Tent } = await load('src/entities/Tent.js');
    const { TentState } = await load('src/config/gameConfig.js');
    const { Physics } = await load('src/systems/Physics.js');

    const sourceA = new GameNode(0, 0, 0, energyA, 1);
    const sourceB = new GameNode(1, 100, 0, energyB, 2);
    sourceA.maxE = maxE;
    sourceB.maxE = maxE;
    sourceA.simulationMode = 'tentaclewars';
    sourceB.simulationMode = 'tentaclewars';

    // _isCanonicalClashDriver uses this.source.id < this.target.id (original fields,
    // NOT effectiveSourceNode.id). With sourceA.id=0 < sourceB.id=1, tentA is canonical.
    // Neither tentacle has reversed=true in this fixture; reversed tentacles are out of scope.
    const tentA = new Tent(sourceA, sourceB, 0);
    const tentB = new Tent(sourceB, sourceA, 0);
    tentA.state = TentState.ACTIVE;
    tentB.state = TentState.ACTIVE;
    tentA.clashPartner = tentB;
    tentB.clashPartner = tentA;
    tentA.clashT = 0.5;
    tentB.clashT = 0.5;
    tentA.reachT = 1;
    tentB.reachT = 1;

    const game = { nodes: [sourceA, sourceB], tents: [tentA, tentB], _frame: 0, fogDirty: false };
    tentA.game = game;
    tentB.game = game;

    Physics.updateOutCounts(game);

    return { sourceA, sourceB, tentA, tentB, TentState };
  }
  ```

- [ ] **Step 2: Add test 1 — clash damage applies to losing node**

  ```js
  async function testTwClashDamageAppliesToLosingNode() {
    const { sourceA, sourceB, tentA, tentB } = await makeTwFixtures({ energyA: 50, energyB: 50 });

    // Give tentA an overflow boost so it wins
    tentA.twOverflowShare = 5;
    tentB.twOverflowShare = 0;

    const energyBefore = sourceB.energy;

    tentB._updateClashState(0.1); // non-canonical: Block A only
    tentA._updateClashState(0.1); // canonical: Block A + Block B

    // sourceB should have lost energy (net damage from A's advantage)
    assert.ok(
      sourceB.energy < energyBefore,
      `TW clash should drain losing source: expected < ${energyBefore}, got ${sourceB.energy}`,
    );
  }
  ```

- [ ] **Step 3: Add test 2 — threshold triggers auto-retract and auto-advance**

  Two sub-cases: (a) pre-starts below threshold (guards the retract path), (b) starts above threshold and Block B damage crosses it in one frame (guards the damage-crossing case).

  ```js
  async function testTwClashThresholdTriggersRetractAndAdvance() {
    // Sub-case A: sourceB pre-starts below TW_RETRACT_CRITICAL_ENERGY (9 < 10).
    // _drainClashSourceBudget drains it further before Block B even fires.
    // Guards that the auto-retract path fires when energy is already below threshold.
    {
      const { sourceA, sourceB, tentA, tentB, TentState } = await makeTwFixtures({
        energyA: 50,
        energyB: 9, // starts below threshold — note: crosses via drain before Block B
        maxE: 60,
      });

      tentA.twOverflowShare = 10;
      tentB.twOverflowShare = 0;

      tentB._updateClashState(0.1);
      tentA._updateClashState(0.1);

      assert.equal(tentB.state, TentState.RETRACTING,
        '[A] losing tentacle should auto-retract when source starts below TW_RETRACT_CRITICAL_ENERGY');
      assert.equal(tentA.state, TentState.ADVANCING,
        '[A] winning tentacle should auto-advance after enemy retracts');
      assert.equal(tentA.clashPartner, null, '[A] winning tentacle clash pair should be cleared');
      assert.equal(tentB.clashPartner, null, '[A] losing tentacle clash pair should be cleared');
    }

    // Sub-case B: sourceB starts at 12 (above threshold 10). Large overflow boost on tentA
    // ensures netDamage * dt > 2 in one frame, crossing the threshold from above.
    // Guards the main production path where damage crossing causes the retract.
    {
      const { sourceA, sourceB, tentA, tentB, TentState } = await makeTwFixtures({
        energyA: 50,
        energyB: 12, // above threshold; must be crossed by one frame of damage
        maxE: 60,
      });

      // overflow = 50 → large myPressure; netDamage * 0.1 >> 2 → crosses threshold
      tentA.twOverflowShare = 50;
      tentB.twOverflowShare = 0;

      tentB._updateClashState(0.1);
      tentA._updateClashState(0.1);

      assert.ok(sourceB.energy < 10,
        '[B] sourceB energy should be below TW_RETRACT_CRITICAL_ENERGY after large overflow damage');
      assert.equal(tentB.state, TentState.RETRACTING,
        '[B] losing tentacle should auto-retract when damage crosses the critical threshold');
      assert.equal(tentA.state, TentState.ADVANCING,
        '[B] winning tentacle should auto-advance after crossing-the-threshold retract');
    }
  }
  ```

- [ ] **Step 4: Add test 3 — flowRate stays alive during clash for both tentacles**

  ```js
  async function testTwClashFlowRateStaysAliveOnBothSides() {
    const { tentA, tentB } = await makeTwFixtures({ energyA: 50, energyB: 50 });

    // No overflow; flowRate should still update from base feed rate
    tentA.flowRate = 0;
    tentB.flowRate = 0;

    tentB._updateClashState(0.1); // Block A runs for non-canonical
    tentA._updateClashState(0.1); // Block A + Block B for canonical

    assert.ok(tentA.flowRate > 0, 'canonical tentacle flowRate should be positive during TW clash');
    assert.ok(tentB.flowRate > 0, 'non-canonical tentacle flowRate should be positive during TW clash');
  }
  ```

- [ ] **Step 5: Register the three tests in the `tests` array**

  In the `tests` array inside `main()`, add after the last `TentacleWars` entry:
  ```js
    ['TentacleWars clash damage applies to losing source node', testTwClashDamageAppliesToLosingNode],
    ['TentacleWars clash threshold triggers auto-retract and auto-advance', testTwClashThresholdTriggersRetractAndAdvance],
    ['TentacleWars clash flowRate stays alive on both tentacle sides', testTwClashFlowRateStaysAliveOnBothSides],
  ```

- [ ] **Step 6: Run new tests — all three must PASS**

  Run: `node scripts/smoke-checks.mjs`
  Expected: count increases by 3, all PASS. If any new test fails, debug before committing.

- [ ] **Step 7: Commit**

  ```bash
  git add scripts/smoke-checks.mjs
  git commit -m "TW: add smoke-check guardrails for clash damage, threshold retract, and flowRate"
  ```

---

## Chunk 6: Final verification

### Task 7: Full verification pass

- [ ] **Step 1: Run full smoke suite**

  Run: `node scripts/smoke-checks.mjs`
  Expected: previous count + 3 (e.g., 99/99 or higher), all PASS

- [ ] **Step 2: Run TW campaign sanity**

  Run: `node scripts/tw-campaign-sanity.mjs`
  Expected: 15/15 PASS

- [ ] **Step 3: Verify commentary headers on touched files**

  Run: `node scripts/commentary-policy.mjs`
  Expected: no missing headers reported for `Tent.js`, `Physics.js`, `TwBalance.js`

- [ ] **Step 4: Request code review**

  Invoke `superpowers:requesting-code-review` for the implementation.

  Review scope: commits from TW constant → smoke guardrails (4 commits).
  Sensitive areas: `Tent.js` `_updateClashState` + new `_applyTwClashDamage`, `Physics.js` pass 4.

- [ ] **Step 5: After review passes — commit summary**

  If all checks green and review passes:
  ```bash
  git log --oneline -6
  ```
  Confirm the 5 commits (Task 1–2 combined or separate + Tasks 3–6) are present.

- [ ] **Step 6: Update `docs/project/tw-collab-status.md`**

  Set contents to:
  ```
  DONE: TW clash + overflow fix (Wave 1 A-group) implemented and verified
  WAITING_FOR: Claude — confirm wave closed, queue Wave 2 (barrier positions)
  ```

---

## Quick reference — key file locations

| Symbol | Location |
|--------|---------|
| `TW_BALANCE` | `src/tentaclewars/TwBalance.js` |
| `TW_RETRACT_CRITICAL_ENERGY` | `src/tentaclewars/TwBalance.js` (new) |
| `Tent.constructor` | `src/entities/Tent.js:38` |
| `Tent.twOverflowShare` | `src/entities/Tent.js` (new, ~line 82) |
| `_updateTentacleWarsActiveFlowState` | `src/entities/Tent.js:737` |
| `_updateClashState` | `src/entities/Tent.js:911` |
| `_applyTwClashDamage` | `src/entities/Tent.js` (new, after `_updateClashState`) |
| `_resolveClashOutcome` | `src/entities/Tent.js:883` (reference — do not modify) |
| `Tent.kill()` programmatic retract | `src/entities/Tent.js:462–467` |
| `Physics.updateOutCounts` | `src/systems/Physics.js:18` |
| `computeTentacleClashFeedRate` | `src/systems/EnergyBudget.js` (already imported in Tent.js) |
| `distributeTentacleWarsOverflow` | `src/tentaclewars/TwEnergyModel.js` (already imported in Tent.js and Physics.js after Task 3) |
| Smoke checks | `scripts/smoke-checks.mjs` |
