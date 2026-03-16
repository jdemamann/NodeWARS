# TW Tentacle Layer Architecture — Design Spec

**Status:** DRAFT — PENDING SPEC REVIEW

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

### Substrate: GameNode

GameNode exists below all layers. It owns `energy`, `owner`, `level`, and related state.
**Only `TwChannel` may directly read or write `node.energy`.**
All higher layers interact with nodes exclusively through TwChannel primitives.

### Layer 0 — TwChannel.js

The physical canal between two nodes. Owns lifecycle state and all invariant-preserving
economic operations. This is the only layer that knows nodes exist.

**Owns:**
- State machine: `GROWING → ACTIVE → RETRACTING → BURSTING → DEAD`
  (plus `ADVANCING` as a transient recovery state after clash win)
- Fields: `source`, `target`, `reachT`, `startT`, `paidCost`, `energyInPipe`, `_burstPayload`
- Packet queue storage (`packetTravelQueue`, `packetAccumulatorUnits`)
- Geometry: `distance`, `travelDuration`, `pipeCapacity`, `buildCost`

**Public primitives (the only way higher layers interact with the channel):**

| Primitive | What it does | What it guarantees |
|---|---|---|
| `grow(dt)` | Advances `reachT`, debits `source.energy` | Energy leaves source proportionally |
| `retract()` | Returns `paidCost + energyInPipe` to source, begins RETRACTING | Source always gets full refund |
| `collapseCommittedPayload()` | Destroys payload without refund, goes DEAD | Used only by Ownership.js for ownership loss |
| `beginBurst(payload, startT)` | Sets state=BURSTING, stores payload | Combat decision, channel execution |
| `transfer(energy)` | Moves energy from source to target | source -= energy, target += energy |
| `advanceLifecycle(dt)` | Runs the state machine for this frame | Single update entry point |

**Invariant:** `retract()` ALWAYS refunds. No flags, no exceptions.
If a caller needs to destroy payload, it calls `collapseCommittedPayload()` — a different
operation with a different name and explicit semantics.

**Does NOT know:** clash partners, packet emission logic, cut classification,
ownership rules, who is enemy or ally.

---

### Layer 1 — TwFlow.js

How energy travels through an active, uncontested channel. Stateless helpers that
operate on a channel instance. Does not own any state of its own.

**Owns (functions, not state):**
- Packet emission — advance accumulator, emit whole packets, drain `source.energy`
- Packet delivery — advance travel times, deliver packets that arrive, call `channel.transfer()`
- Flow application hooks:
  - `applyTwFriendlyFlow(channel, dt)` — feed ally node
  - `applyTwNeutralCaptureFlow(channel, dt)` — contribute to neutral capture
  - `applyTwEnemyAttackFlow(channel, dt)` — damage enemy node
- Excess feed consumption — reads `sourceNode.excessFeed` per frame (double-buffer)
- Relay flow multiplier calculation

**Source of truth for migrations:**
Current `_updateTentacleWarsActiveFlowState()` in `Tent.js` and the three flow functions
in `TentCombat.js` (`applyTentacleFriendlyFlow`, `applyTentacleNeutralCaptureFlow`,
`applyTentacleEnemyAttackFlow`) all move here.

**Does NOT know:** clash state, cut resolution, ownership rules.
Knows only: "this channel is ACTIVE and uncontested — move energy through it."

---

### Layer 2 — TwCombat.js

How conflicts and cuts redirect a lane. Policy and orchestration only — no direct
mutation of `node.energy` or lifecycle fields.

**Owns:**
- Clash pair management: establish pair, clear pair, symmetric update guard
- `clashT`, `clashVisualT`, `clashApproachActive` (visual clash front)
- Clash approach animation
- Clash front update (TW: fixed at 0.5)
- Clash damage: drain losing source energy each frame
- Clash resolution: when losing source falls below `TW_RETRACT_CRITICAL_ENERGY`
  → calls `channel.retract()` on all losing outgoing channels (refund is automatic)
  → calls `channel.state = ADVANCING` on winner (via a channel primitive)
- Cut classification: kamikaze / defensive / split
- Burst decision: classifies a cut as burst → calls `channel.beginBurst(payload, startT)`
- Slice payout animation (TW cut retraction: animated energy release to both sides)

**Explicit contract — clash pair lifecycle:**
```
TwCombat.pairChannels(channelA, channelB)
  → sets clashPartner on both symmetrically

TwCombat.unpairChannels(channelA, channelB)
  → clears clashPartner + visual state on both BEFORE any kill/retract call
  → prevents re-entry into clash update on the same frame
```
This is the explicit contract that replaces the current fragile symmetric-cleanup pattern.

**Does NOT know:** node.energy directly, packet queues, relay multipliers,
ownership rules, who is ally or enemy.

---

### Existing files (unchanged or receiving migrations)

| File | Role | Change |
|---|---|---|
| `Ownership.js` | Decides ownership transitions | Calls `channel.collapseCommittedPayload()` |
| `TwCaptureRules.js` | Neutral capture math | Receives capture flow hooks from TwFlow |
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

Rationale: the single biggest source of bugs in the current code is uncertainty about
whether a given kill path refunds or not. This eliminates that class of bug entirely.

### D2 — TwChannel is sole lifecycle owner

`TwFlow` and `TwCombat` are **policy modules** — they call TwChannel primitives but do
not own or directly mutate lifecycle fields (`state`, `reachT`, `paidCost`, etc.).

Rationale (Codex): if TwCombat directly owns lifecycle state, the coupling just moves
to a second file. The clean split is primitives in TwChannel, policy in the others.

### D3 — Clash is a submode of ACTIVE

Clash does not get its own lifecycle state. A channel in clash is still ACTIVE; the
`clashPartner` reference in TwCombat signals the submode. The state machine transitions
(to ADVANCING or RETRACTING) happen through TwChannel primitives at resolution time.

Rationale: turning clash into a separate state is a larger behavior refactor than this
design covers. Keep it as a submode for now; elevate to a state in a future wave if needed.

### D4 — Kamikaze burst: decision in TwCombat, execution in TwChannel

TwCombat classifies a cut as kamikaze and calls `channel.beginBurst(payload, startT)`.
TwChannel owns the BURSTING state and its update loop (`_updateBurstingState`).
The visual state (`startT`, `_burstPayload`) is channel state, not combat policy.

### D5 — NodeWARS code stays in Tent.js until retired

The existing `Tent.js` keeps all NodeWARS flow paths (`_updateActiveFlowState`,
`_updateClashFront` for NW, etc.) until NW is removed. New TW layers are independent
files that `Tent.js` delegates to when `simulationMode === 'tentaclewars'`.
Migration is additive first, destructive only when NW is confirmed retired.

---

## Method Migration Map

All ~55 methods in `Tent.js` + 5 exports from `TentCombat.js` map to exactly one destination.

### → TwChannel.js

| Current | New name | Notes |
|---|---|---|
| `constructor` (TW fields) | `constructor` | Keep NW fields in Tent.js for now |
| `_refundToSourceNode()` | private, called by `retract()` | |
| `_clearEconomicPayload()` | private | |
| `collapseForOwnershipLoss()` | `collapseCommittedPayload()` | Rename for clarity |
| `getCommittedPayloadForOwnershipCleanup()` | `getCommittedPayload()` | |
| `kill()` kamikaze branch | `beginBurst(payload, startT)` | |
| `kill()` programmatic branch | `retract()` | |
| `activateImmediate()` | `activateImmediate()` | |
| `_updateGrowingState()` | `_advanceGrowing(dt)` | |
| `_updateRetractingState()` | `_advanceRetracting(dt)` | |
| `_updateAdvancingState()` | `_advanceAdvancing(dt)` | |
| `_updateBurstingState()` | `_advanceBursting(dt)` | |
| `getControlPoint()`, `getCP()` | unchanged | |

### → TwFlow.js

| Current | New name | Notes |
|---|---|---|
| `_updateTentacleWarsActiveFlowState()` | `advanceTwFlow(channel, dt)` | Main flow entry |
| `_clearPipeState()` | `clearFlowState(channel)` | |
| `_getRelayFlowMultiplier()` | `getRelayFlowMultiplier(channel)` | |
| `TentCombat: applyTentacleFriendlyFlow` | `applyTwFriendlyFlow` | |
| `TentCombat: applyTentacleNeutralCaptureFlow` | `applyTwNeutralCaptureFlow` | |
| `TentCombat: applyTentacleEnemyAttackFlow` | `applyTwEnemyAttackFlow` | |
| `TentCombat: applyTentaclePayloadToTarget` | `applyTwPayloadToTarget` | |

### → TwCombat.js

| Current | New name | Notes |
|---|---|---|
| `applySliceCut()` | `applySliceCut(channel, cutRatio)` | Entry point |
| `_applyTentacleWarsSliceCut()` | `_resolveTwSliceCut()` | |
| `_resolveClashPartnerOnCut()` | `unpairChannels(a, b)` | Explicit contract |
| `initializeFreshClashVisual()` | `pairChannels(a, b)` | Explicit contract |
| `_updateClashApproach()` | `_advanceClashApproach()` | |
| `_updateClashVisualFront()` | `_syncClashVisualFront()` | |
| `_drainClashSourceBudget()` | `_drainClashSource()` | |
| `_isCanonicalClashDriver()` | `_isCanonicalDriver()` | |
| `TentCombat: computeTentacleClashForces` | `computeClashForces()` | |
| `_updateClashFront()` TW branch | `_updateClashFront()` | |
| `_resolveClashOutcome()` | `_resolveClashOutcome()` | Calls channel.retract() |
| `_updateClashState()` | `advanceTwClash(channel, dt)` | Main clash entry |
| `_applyTwClashDamage()` | `_applyClashDamage()` | |
| `_prepareClashState()` | `_prepareClash()` | |
| `_applyTentacleWarsCutRetractionTargetEffect()` | `_applyCutRetractionEffect()` | |
| `_releaseTentacleWarsCutPayout()` | `_releaseCutPayout()` | |

### → Ownership.js / TwCaptureRules.js (already there or migrate)

| Current | Destination |
|---|---|
| `_applyNeutralContestContribution()` | TwCaptureRules.js |
| `_setNeutralContestContribution()` | TwCaptureRules.js |
| `_cancelRivalContestProgress()` | TwCaptureRules.js |
| `_captureNeutralTarget()` | TwCaptureRules.js |
| `_defeatEnemyTarget()` | TwCaptureRules.js / Ownership.js |
| `_applyPayloadToTarget()` | TwFlow.js (via applyTwPayloadToTarget) |
| `_applyImmediateTargetEffect()` | TwCombat.js (cut context) |

---

## What Stays in Tent.js

During the migration period, `Tent.js` is the thin delegation shell:

```js
update(dt) {
  if (this.simulationMode === 'tentaclewars') {
    TwChannel.advanceLifecycle(this, dt);
    if (this.clashPartner) TwCombat.advanceTwClash(this, dt);
    else TwFlow.advanceTwFlow(this, dt);
  } else {
    this._updateNodeWarsState(dt); // unchanged NW path
  }
}
```

All NW-specific methods stay in `Tent.js` until NW is retired.

---

## Testing Strategy

Each layer is testable independently:

- **TwChannel**: unit tests — grow debits, retract refunds, collapse destroys, beginBurst stores payload. No game loop needed.
- **TwFlow**: unit tests with mock channels — packet emission count, delivery timing, energy accounting. `advanceTentacleWarsLaneRuntime()` already exists and can be reused.
- **TwCombat**: unit tests with mock channel pairs — clash damage drains correct source, resolution calls retract on loser, pairChannels/unpairChannels are symmetric.
- **Integration**: existing `smoke-checks.mjs` covers the full stack; all 102 checks must continue passing after each migration step.

---

## Non-Goals

- Refactoring NodeWARS code (untouched until retired)
- Changing any gameplay balance or observable behavior
- Adding new TW features (this is structural only)
- Migrating rendering code (`TentRenderer.js`)

---

## Open Questions for Implementation

None. The three questions from the initial brainstorm are resolved:

1. **Layer count:** 3 (TwChannel + TwFlow + TwCombat) ✅
2. **collapseForOwnershipLoss:** channel primitive `collapseCommittedPayload()` called by Ownership.js ✅
3. **Kamikaze burst:** TwCombat decides → calls `channel.beginBurst()` ✅
