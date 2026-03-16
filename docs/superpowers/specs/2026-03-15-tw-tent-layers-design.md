# TW Tentacle Layer Architecture — Design Spec

**Status:** APPROVED — aligned with game-architecture-layers spec (ARCHITECTURE-RESET-001)
**Architecture reference:** `docs/superpowers/specs/2026-03-15-game-architecture-layers.md`

---

## Summary

Refactor the TentacleWars tentacle system from a single monolithic `Tent.js` (~1100 lines)
into three clean layers, each with a single responsibility and a narrow public interface.
NodeWARS code is untouched. TW layers become the canonical runtime as NW is retired.

**One-line framing (Codex):**
> `TwChannel` owns "what the lane is", `TwFlow` owns "how energy travels through it",
> `TwCombat` owns "how conflicts and cuts redirect that lane".

---

## Architecture

### Scope of this spec

This spec covers the **lane-runtime portion** of Layer 1 and Layer 2 in the global
architecture. It does not cover the full Layer 1 surface.

Global Layer 1 has two modules:
- **`TwChannel.js`** — lane lifecycle, economic primitives, energy accounting
- **`TwNodeOps.js`** — node-state commit primitives (`commitOwnershipTransfer` and future ops)

This spec defines TwChannel and its callers (TwFlow, TwCombat). TwNodeOps is defined in
`docs/superpowers/specs/2026-03-15-game-architecture-layers.md`.

### Substrate: GameNode (global Layer 0)

GameNode exists below all layers. It owns `energy`, `owner`, `level`, and related state.
**Only Layer 1 primitives may write `node.energy` or `node.owner`:**
- `node.energy` — through TwChannel economic primitives only
- `node.owner` — through `TwNodeOps.commitOwnershipTransfer()` only

All higher layers interact with nodes exclusively through Layer 1 primitives.

### Layer 1 (global) — TwChannel.js (Network Primitives)

The physical canal between two nodes. Owns lifecycle state and all invariant-preserving
economic operations. This is the only layer that knows nodes exist.

**Owns:**
- State machine: `GROWING → ACTIVE → RETRACTING → BURSTING → DEAD`
  (plus `ADVANCING` as a transient recovery state after clash win)
- Fields: `source`, `target`, `reversed`, `reachT`, `startT`, `paidCost`, `energyInPipe`,
  `_burstPayload`, `twCutRetraction`
- Packet queue storage (`packetTravelQueue`, `packetAccumulatorUnits`)
- Geometry: `distance`, `travelDuration`, `pipeCapacity`, `buildCost`

Note on `reversed`: this field flips `effectiveSourceNode` / `effectiveTargetNode`. It lives
in TwChannel. All TwChannel primitives that reference source/target use `effectiveSourceNode`
and `effectiveTargetNode` — never `source`/`target` directly — so `reversed` is always
respected without callers needing to know about it.

Note on `clashT`: this field lives on the channel instance and is readable by TwChannel
even though TwCombat manages it (sets/clears it). TwChannel's `collapseCommittedPayload()`
reads `this.clashT` directly to compute the surviving partner's new `reachT` during the
partner-advance step. `clashT` is channel state that TwCombat manages but does not own
exclusively — it is accessible to TwChannel for lifecycle-critical operations.

**Public primitives (the only way higher layers interact with the channel):**

| Primitive | What it does | What it guarantees |
|---|---|---|
| `grow(dt)` | Advances `reachT`, debits `source.energy` | Energy leaves source proportionally |
| `retract()` | Returns `paidCost + energyInPipe` to source, begins RETRACTING | Source always gets full refund |
| `partialRefund(amount)` | Credits `amount` to source immediately, no state change | Used by animated cut payouts; still routes through TwChannel |
| `drainSourceEnergy(amount)` | Debits `amount` from source, no payload accounting | Used by TwCombat for clash damage only |
| `collapseCommittedPayload()` | Clears clash partner, destroys payload without refund, sets state=RETRACTING (preserves visible reachT for retract animation) | Used by Ownership.js to collapse outgoing lanes when a node changes owner — ownership-state mutation itself goes through `TwNodeOps.commitOwnershipTransfer()` (see game-architecture-layers spec) |
| `beginBurst(payload, startT)` | Sets state=BURSTING, stores payload | Combat decision, channel execution |
| `transfer(energy)` | Moves energy directly from source to target, no ownership logic | source -= energy, target += energy — use only for uncontested delivery |
| `advanceLifecycle(dt)` | Runs the full state machine for this frame | Single update entry point |
| `getCommittedPayload()` | Returns `_burstPayload` if state===BURSTING, otherwise `paidCost + energyInPipe` | Read-only query for ownership cleanup — must preserve both branches to avoid accounting regression on bursting lanes |

**Invariant:** `retract()` ALWAYS refunds. No flags, no exceptions.
`partialRefund(amount)` and `drainSourceEnergy(amount)` are the only other energy ops
in TwChannel; both have distinct names and explicit, bounded semantics.
If a caller needs to destroy payload, it calls `collapseCommittedPayload()`.

**Does NOT know:** clash partners, packet emission logic, cut classification,
ownership rules, who is enemy or ally.

---

### Layer 2 (global) — TwFlow.js (Domain Rules — flow policy)

How energy travels through an active, uncontested channel. A collection of pure functions
that operate on a channel instance. TwFlow holds no fields of its own; all state it
reads or writes lives in the channel instance passed to it (a TwChannel).

**Clarification on "stateless":** TwFlow is stateless in that it allocates no objects
and holds no mutable fields between calls. However, functions like `clearFlowState(channel)`
do mutate channel fields — that is by design, since TwChannel owns those fields and TwFlow
is an authorized mutator of them.

**Owns (functions, not fields):**
- Packet emission — advance accumulator, emit whole packets, drain via `channel.drainSourceEnergy()`
- Packet delivery — advance travel times, deliver packets that arrive, call `channel.transfer()`
- Flow application hooks:
  - `applyTwFriendlyFlow(channel, dt)` — feed ally node
  - `applyTwNeutralCaptureFlow(channel, dt)` — contribute to neutral capture
  - `applyTwEnemyAttackFlow(channel, dt)` — damage enemy node
- `applyTwPayloadToTarget(channel, payload, opts)` — route payload to target based on ownership
- `advanceTwFlow(channel, dt)` — main entry: emit packets, deliver, apply effect
- `clearFlowState(channel)` — resets pipe/queue fields on the channel
- `getRelayFlowMultiplier(channel)` — relay output modifier
- Excess feed consumption — reads `sourceNode.excessFeed` per frame (double-buffer)

**Source of truth for migrations:**
Current `_updateTentacleWarsActiveFlowState()` in `Tent.js` and the four exports from
`TentCombat.js` (`applyTentacleFriendlyFlow`, `applyTentacleNeutralCaptureFlow`,
`applyTentacleEnemyAttackFlow`, `applyTentaclePayloadToTarget`) all move here.

**Does NOT know:** clash state, cut resolution, ownership rules.
Knows only: "this channel is ACTIVE and uncontested — move energy through it."

---

### Layer 2 (global) — TwCombat.js (Domain Rules — combat policy)

How conflicts and cuts redirect a lane. Policy and orchestration only. TwCombat does
not directly write `node.energy` — all energy operations go through TwChannel primitives.

**Owns:**
- Clash pair management: establish pair, clear pair, symmetric update guard
- `clashT`, `clashVisualT`, `clashApproachActive` (visual clash front) — owned by TwCombat
  as combat-session state on the channel instance
- Clash approach animation
- Clash front update (TW: fixed at 0.5)
- Clash damage: calls `channel.drainSourceEnergy(netDamage * dt)` on the losing source
- Clash resolution: when losing source energy falls below `TW_RETRACT_CRITICAL_ENERGY`
  → calls `channel.retract()` on all losing outgoing channels (refund is automatic)
  → calls a TwChannel advance primitive to put winner in ADVANCING state
- Cut classification: kamikaze / defensive / split
- Burst decision: classifies a cut as burst → calls `channel.beginBurst(payload, startT)`
- Animated slice payout: calls `channel.partialRefund(sourceDelta)` for the source side
  and `TwFlow.applyTwPayloadToTarget(channel, targetDelta)` for the target side — the
  target path uses the ownership-aware dispatch (capture scoring, defeat logic), not
  `channel.transfer()` which has no ownership awareness

**`this.game` back-reference:** `_applyTwClashDamage` (→ `_applyClashDamage`) currently
reads `this.game?.tents` to enumerate all outgoing tentacles from the losing source.
In TwCombat this function receives the tent registry as a parameter:
`_applyClashDamage(channel, opposingChannel, tentRegistry, dt)`.
The caller (Tent.js delegation shell) passes `this.game.tents`.

**Explicit contract — clash pair lifecycle:**
```
TwCombat.pairChannels(channelA, channelB)
  → sets clashPartner on both symmetrically
  → initializes clashT / clashVisualT / clashApproachActive

TwCombat.unpairChannels(channelA, channelB)
  → clears clashPartner + all visual state on both BEFORE any retract/collapse call
  → prevents re-entry into clash update on the same frame
```
All clash resolution paths call `unpairChannels` before calling any TwChannel unwind
primitive. This is the explicit contract replacing the current fragile symmetric-cleanup.

**TW cut classification:** The existing `isTentacleWarsSlice` inline branch in `kill()`
(Tent.js line 436) becomes `TwCombat.classifyTwCut(cutRatio)`. It does not use the
NodeWARS `classifyTentacleCut` / `CUT_RULES` path. During migration, the NW path
stays in `Tent.js` untouched (D5).

**Does NOT know:** `node.energy` directly, packet queues, relay multipliers,
ownership rules, who is ally or enemy.

---

### Existing files (unchanged or receiving migrations)

| File | Role | Change |
|---|---|---|
| `Ownership.js` | Decides ownership transitions | Calls `channel.collapseCommittedPayload()` to collapse outgoing lanes; calls `TwNodeOps.commitOwnershipTransfer()` to commit node ownership change |
| `TwCaptureRules.js` | Neutral capture math | Receives neutral capture hooks from TwFlow |
| `NeutralContest.js` | Contest state | Unchanged |
| `TwBalance.js` | Tuning constants | Unchanged |
| `TwGradeTable.js` | Grade/level table | Unchanged |
| `GameNode.js` | Node entity (substrate) | Unchanged |
| `TentCombat.js` | Legacy combat helpers | Drained into TwFlow + TwCombat, then deleted |

---

## Key Design Decisions

### D1 — retract() always refunds

No caller can make `retract()` skip the refund. There are exactly two unwind operations:
- `retract()` = energy-preserving unwind (every voluntary and combat-triggered retract)
- `collapseCommittedPayload()` = energy-destructive unwind (ownership loss only)

`partialRefund(amount)` is a third primitive for animated partial payouts; it is
energy-preserving but not a full unwind. It is only called from TwCombat's cut-retraction
animation, never from flow or game rules.

Rationale: the single biggest source of bugs in the current code is uncertainty about
whether a given kill path refunds or not. This eliminates that class of bug entirely.

### D2 — TwChannel is sole lifecycle owner; energy ops go through primitives

`TwFlow` and `TwCombat` are **policy modules** — they call TwChannel primitives but do
not own lifecycle fields (`state`, `reachT`, `paidCost`, etc.).

Energy writes from higher layers are permitted only through named TwChannel primitives:
- `TwFlow` uses `channel.drainSourceEnergy()` (via packet emission) and `channel.transfer()`
- `TwCombat` uses `channel.drainSourceEnergy()` (clash damage), `channel.partialRefund()`
  (cut payout), `channel.retract()` (clash resolution), `channel.beginBurst()`

Direct `node.energy +=/-=` outside of TwChannel is a violation of this design.

Rationale (Codex): if TwCombat directly mutates node state, the coupling just moves
to a second file. Named primitives with explicit semantics are the clean split.

### D3 — Clash is a submode of ACTIVE

Clash does not get its own lifecycle state. A channel in clash is still ACTIVE; the
`clashPartner` reference in TwCombat signals the submode. The state machine transitions
(to ADVANCING or RETRACTING) happen through TwChannel primitives at resolution time.

Rationale: turning clash into a separate state is a larger behavior refactor than this
design covers. Keep it as a submode for now; elevate to a state in a future wave if needed.

### D4 — Kamikaze burst: decision in TwCombat, execution in TwChannel

TwCombat classifies a cut as kamikaze and calls `channel.beginBurst(payload, startT)`.
TwChannel owns the BURSTING state and its update loop (`_advanceBursting`).
The visual state (`startT`, `_burstPayload`) is channel state, not combat policy.

### D5 — NodeWARS code stays in Tent.js until retired

The existing `Tent.js` keeps all NodeWARS flow paths (`_updateActiveFlowState`,
`_updateClashFront` for NW, etc.) until NW is removed. New TW layers are independent
files that `Tent.js` delegates to when `simulationMode === 'tentaclewars'`.
Migration is additive first, destructive only when NW is confirmed retired.

---

## Method Migration Map

All 55 methods in `Tent.js` + 5 exports from `TentCombat.js` map to exactly one destination.
Methods that stay in `Tent.js` as NodeWARS-only are noted explicitly.

### → TwChannel.js

| Current | New name | Notes |
|---|---|---|
| `constructor` (TW fields) | `constructor` | NW fields stay in Tent.js |
| `alive`, `removed` getters | unchanged | Lifecycle queries |
| `effectiveSourceNode`, `effectiveTargetNode` | unchanged | Respect `reversed` |
| `travelDuration`, `distance`, `pipeCapacity` getters | unchanged | Geometry |
| `_refundToSourceNode()` | private — called only by `retract()` | |
| `_clearEconomicPayload()` | private | |
| `_clearTentacleWarsCutRetraction()` | private | Clears `twCutRetraction` after animation |
| `collapseForOwnershipLoss()` | `collapseCommittedPayload()` | Includes clash-partner teardown (see below) |
| `getCommittedPayloadForOwnershipCleanup()` | `getCommittedPayload()` | |
| `kill()` kamikaze branch | `beginBurst(payload, startT)` | |
| `kill()` programmatic branch | `retract()` | |
| `killBoth()` | `retractBoth()` | Calls `retract()` on both sides |
| `activateImmediate()` | `activateImmediate()` | |
| `update(dt)` TW dispatcher | `advanceLifecycle(dt)` | Dispatches to state-specific advances below |
| `_updateActiveState(dt)` TW branch | `_advanceActive(dt)` | Gates flow vs clash |
| `_updateGrowingState()` | `_advanceGrowing(dt)` | |
| `_updateRetractingState()` | `_advanceRetracting(dt)` | |
| `_updateAdvancingState()` | `_advanceAdvancing(dt)` | |
| `_updateBurstingState()` | `_advanceBursting(dt)` | |
| `getControlPoint()` | unchanged | |
| `getCP()` | unchanged | Alias for getControlPoint |

**Note on `collapseCommittedPayload()`:** absorbs the `_resolveClashPartnerOnCut(false)`
call that currently lives inside `collapseForOwnershipLoss()`. Ownership.js calls a single
primitive; the clash teardown is guaranteed before payload destruction.

### → TwFlow.js

| Current | New name | Notes |
|---|---|---|
| `_updateTentacleWarsActiveFlowState()` | `advanceTwFlow(channel, dt)` | Main flow entry |
| `_clearPipeState()` | `clearFlowState(channel)` | Mutates channel fields |
| `_getRelayFlowMultiplier()` | `getRelayFlowMultiplier(channel)` | |
| `_applyFriendlyFlow()` thin shim | merged into `applyTwFriendlyFlow` | |
| `_applyNeutralCaptureFlow()` thin shim | merged into `applyTwNeutralCaptureFlow` | |
| `_applyEnemyAttackFlow()` thin shim | merged into `applyTwEnemyAttackFlow` | |
| `_applyPayloadToTarget()` | `applyTwPayloadToTarget` | |
| `TentCombat: applyTentacleFriendlyFlow` | `applyTwFriendlyFlow` | |
| `TentCombat: applyTentacleNeutralCaptureFlow` | `applyTwNeutralCaptureFlow` | |
| `TentCombat: applyTentacleEnemyAttackFlow` | `applyTwEnemyAttackFlow` | |
| `TentCombat: applyTentaclePayloadToTarget` | `applyTwPayloadToTarget` | |

### → TwCombat.js

| Current | New name | Notes |
|---|---|---|
| `applySliceCut()` | `applyTwSliceCut(channel, cutRatio)` | TW implementation — public `applySliceCut()` stays as shell on Tent.js during migration, delegates to TwCombat for TW and keeps NW path inline |
| `_applyTentacleWarsSliceCut()` | `_resolveTwSliceCut()` | Calls classifyTwCut; initializes `twCutRetraction` for animated payout |
| `_resolveClashPartnerOnCut()` | `unpairChannels(a, b)` | Explicit contract |
| `initializeFreshClashVisual()` | `pairChannels(a, b)` | Explicit contract |
| `_updateClashApproach()` | `_advanceClashApproach()` | |
| `_updateClashVisualFront()` | `_syncClashVisualFront()` | |
| `_drainClashSourceBudget()` | `_drainClashSource()` | Calls `channel.drainSourceEnergy()` |
| `_isCanonicalClashDriver()` | `_isCanonicalDriver()` | |
| `TentCombat: computeTentacleClashForces` | `computeClashForces()` | |
| `_updateClashFront()` TW branch | `_updateClashFront()` | |
| `_resolveClashOutcome()` | `_resolveClashOutcome()` | Calls unpairChannels, then channel.retract() |
| `_updateClashState()` | `advanceTwClash(channel, dt)` | Main clash entry |
| `_applyTwClashDamage()` | `_applyClashDamage(channel, opposing, tentRegistry, dt)` | Calls drainSourceEnergy; tentRegistry passed by Tent.js shell |
| `_prepareClashState()` | `_prepareClash()` | |
| `_applyTentacleWarsCutRetractionTargetEffect()` | `_applyCutRetractionEffect()` | |
| `_releaseTentacleWarsCutPayout()` | `_releaseCutPayout()` | Source: channel.partialRefund() — Target: TwFlow.applyTwPayloadToTarget() (ownership-aware, not channel.transfer()) |
| *(new)* | `classifyTwCut(cutRatio)` | TW-specific cut classifier (kamikaze/defensive/split) |
| `_applyImmediateTargetEffect()` TW branch | `_applyImmediateCutEffect()` | Cut context only |

### → Ownership.js / TwCaptureRules.js

| Current | Destination | Notes |
|---|---|---|
| `_applyNeutralContestContribution()` | TwCaptureRules.js | |
| `_setNeutralContestContribution()` | TwCaptureRules.js | |
| `_cancelRivalContestProgress()` | TwCaptureRules.js | |
| `_captureNeutralTarget()` | TwCaptureRules.js | |
| `_defeatEnemyTarget()` | TwCaptureRules.js / Ownership.js | |

### Stays in Tent.js (NodeWARS only, untouched until NW retired)

| Method | Reason |
|---|---|
| `_updateActiveFlowState(dt)` | NW continuous flow — not TW |
| `_updateClashFront()` NW branch | NW force-based tug-of-war — not TW |
| `_computeClashForces()` NW wrapper | NW only |
| All NW-specific update paths | D5 — NW untouched |

---

## What Stays in Tent.js (delegation shell)

During the migration period, `Tent.js` dispatches TW calls to the new layers.
The delegation shell covers all lifecycle states:

```js
update(dt) {
  if (this.simulationMode !== 'tentaclewars') {
    this._updateNodeWarsState(dt); // unchanged NW path
    return;
  }

  // TW: all lifecycle advances go through TwChannel
  TwChannel.advanceLifecycle(this, dt);

  // TW active state: flow or clash (advanceLifecycle gates GROWING/RETRACTING/etc.)
  // _advanceActive is called from within advanceLifecycle when state === ACTIVE
  // It delegates to TwCombat or TwFlow based on clashPartner:
  //   if (this.clashPartner) TwCombat.advanceTwClash(this, dt)
  //   else TwFlow.advanceTwFlow(this, dt)
}
```

`TwChannel.advanceLifecycle` is the single entry point. It calls the correct
state-specific advance (_advanceGrowing, _advanceActive, _advanceRetracting,
_advanceAdvancing, _advanceBursting). `_advanceActive` is the only state that
dispatches to TwCombat or TwFlow.

**`_advanceActive(dt)` required guard bundle** (must be preserved verbatim from
`_updateActiveState()` — these guards are behavior contracts, not implementation details):

```
1. if (effectiveSourceNode.owner === 0) → retract()
   // source was captured by enemy while lane was active

2. if (!clashPartner && effectiveSourceNode.energy < 0.25) → retract()
   // low-energy auto-retract — only when NOT in clash (clash resolves depletion naturally)

3. _previousTargetOwner race guard:
   if (effectiveTargetNode.owner changed since last frame && owner !== myOwner) → retract()
   // virgin-target captured by AI while tentacle was growing toward it

4. if (clashT !== null && (!clashPartner || clashPartner.state === RETRACTING)):
   → clear clashT / clashVisualT / clashApproachActive / clashPartner, state = ADVANCING
   // clash partner gone but clashT residue — clean up and advance uncontested
```

Guards 1, 2, 4 call `TwChannel.retract()` or set channel state via a TwChannel primitive.
Guard 3 calls `TwChannel.retract()`. None of them write `node.energy` directly.

All NW-specific methods stay in `Tent.js` until NW is retired.

---

## Testing Strategy

Each layer is independently testable with lightweight fixtures:

- **TwChannel**: unit tests — `grow` debits, `retract` refunds, `collapseCommittedPayload`
  destroys, `beginBurst` stores payload, `drainSourceEnergy` debits without payload
  accounting. No game loop needed. Fixtures are plain objects `{ energy, owner }`.
- **TwFlow**: unit tests with mock TwChannel instances — packet emission count, delivery
  timing, energy accounting via `transfer` calls. `advanceTentacleWarsLaneRuntime()`
  in `TwPacketFlow.js` (renamed `advanceTwLaneRuntime` or kept) is reusable here.
- **TwCombat**: unit tests with mock channel pairs — `pairChannels`/`unpairChannels` are
  symmetric, clash damage calls `drainSourceEnergy` on correct source, clash resolution
  calls `retract` on all losing channels, `classifyTwCut` returns correct branch.
- **Integration**: existing `smoke-checks.mjs` (102 checks) must pass after every
  migration commit. The `tw-energy-sanity.mjs` suite (6 checks) covers the energy model.

---

## Non-Goals

- Refactoring NodeWARS code (untouched until retired)
- Changing any gameplay balance or observable behavior
- Adding new TW features (this is structural only)
- Migrating rendering code (`TentRenderer.js`)

---

## Resolved Design Questions

1. **Layer count:** 3 (TwChannel + TwFlow + TwCombat) ✅
2. **`collapseForOwnershipLoss`:** becomes `collapseCommittedPayload()` in TwChannel,
   includes clash-partner teardown internally, called by Ownership.js ✅
3. **Kamikaze burst:** TwCombat decides (`classifyTwCut`) → calls `channel.beginBurst()` ✅
4. **`node.energy` writes from TwCombat:** routed through `drainSourceEnergy()` and
   `partialRefund()` primitives — TwCombat never writes `node.energy` directly ✅
5. **`reversed` field:** lives in TwChannel; all TwChannel ops use `effectiveSourceNode`
   / `effectiveTargetNode` so `reversed` is transparent to callers ✅
6. **`_releaseTentacleWarsCutPayout` energy writes:** source side through `channel.partialRefund()`;
   target side through `TwFlow.applyTwPayloadToTarget()` (ownership-aware) — `channel.transfer()`
   is reserved for uncontested direct delivery only ✅
7. **`this.game` back-reference in clash damage:** resolved by passing `tentRegistry`
   as a parameter to `_applyClashDamage` ✅
