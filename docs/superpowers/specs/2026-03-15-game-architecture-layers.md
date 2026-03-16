# TentacleWars — Full Game Architecture Spec

**Status:** APPROVED — co-signed Claude + Codex (ARCHITECTURE-RESET-001)
**Date:** 2026-03-15

---

## Governing Principle

> The game runtime is a layered stack. Each layer owns one kind of responsibility.
> Complexity at a higher layer is a signal that a lower layer is still leaking.

This is the OSI / TCP-IP principle applied to game architecture:
- Lower layers provide primitives and invariants
- Higher layers express policy and orchestration
- No layer knows the internal details of a non-adjacent layer

**The test for any module:** can you describe what it does in one sentence without
mentioning the concerns of another layer? If not, it has mixed responsibilities.

---

## The Layer Stack

```
  ┌─────────────────────────────────────────────────┐
  │  Config / Control Plane  (read-only, all layers) │
  └─────────────────────────────────────────────────┘
          ↕ read only, no runtime writes

  ┌─────────────────────────────────────────────────┐
  │  Layer 4 — Consumers                            │
  │  AI · Input · Rendering · UI · Audio            │
  └─────────────────────────────────────────────────┘
          ↓ commands via Layer 3 only
  ┌─────────────────────────────────────────────────┐
  │  Layer 3 — World Orchestration                  │
  │  Game · Physics · WorldSystems                  │
  └─────────────────────────────────────────────────┘
          ↓ calls domain rule modules
  ┌─────────────────────────────────────────────────┐
  │  Layer 2 — Domain Rules                         │
  │  TwFlow · TwCombat · TwCaptureRules · Ownership │
  └─────────────────────────────────────────────────┘
          ↓ calls channel primitives
  ┌─────────────────────────────────────────────────┐
  │  Layer 1 — Network Primitives                   │
  │  TwChannel (lane identity · lifecycle · payload) │
  └─────────────────────────────────────────────────┘
          ↓ reads / writes substrate state
  ┌─────────────────────────────────────────────────┐
  │  Layer 0 — Substrate                            │
  │  GameNode (energy · owner field · geometry)     │
  └─────────────────────────────────────────────────┘
```

---

## Layer Definitions

### Config / Control Plane

Declarative inputs. Sit outside the stack. All layers may read; no runtime layer writes.

**Files:** `src/config/gameConfig.js`, `src/tentaclewars/TwBalance.js`,
`src/tentaclewars/TwGradeTable.js`, `src/config/levelConfig.js`

These are configuration, not behavior. They are versioned as data, not code.

---

### Layer 0 — Substrate

Pure persistent state with minimal behavior. The game's domain entities. No rules, no
flow logic, no orchestration. What the game IS, not what it does.

**Responsibility:** own canonical entity state and provide minimal substrate primitives
that commit that state atomically.

**Current files:**
- `src/entities/GameNode.js` — node state (energy, owner field, level, geometry)

**Ownership split (critical):**
The `owner` field lives here as raw substrate state. However, the adjacent-write rule
means Layer 2 cannot write `node.owner` directly — that would skip Layer 1.

The clean model:
- **Layer 0:** owns the `owner` field (pure substrate state)
- **Layer 1:** exposes `commitOwnershipTransfer(node, newOwner, startingEnergy)` — the
  narrow primitive that performs the ownership-state mutation safely, including any
  invariant-preserving bookkeeping (e.g. energy reset)
- **Layer 2:** `Ownership.js` decides *when* and *how* to invoke it — policy only

This means Layer 1 is not just lane primitives (`TwChannel`). It also includes
node-state commit primitives like `commitOwnershipTransfer`. Both belong to Layer 1
because both are the lowest-level invariant-preserving state mutations in the game.

**Does NOT know:** lanes, packets, rules, frame order, rendering, AI.

---

### Layer 1 — Network Primitives

The physical and economic lane abstraction. Connects two Layer 0 nodes. Owns all
energy accounting and lane lifecycle. The only layer that writes `node.energy` directly.

**Responsibility:** own lane identity, lifecycle state machine, committed payload, and
invariant-preserving energy primitives. Higher layers never write `node.energy` — they
call Layer 1 primitives.

**Target files:**
- `src/tentaclewars/TwChannel.js` — lane lifecycle, grow/retract/burst/collapse/transfer
- `src/tentaclewars/TwNodeOps.js` — node-state commit primitives:
  `commitOwnershipTransfer(node, newOwner, startingEnergy)` and future node-level ops

Layer 1 is the **only** layer whose modules write `node.energy` or `node.owner`.
All other layers go through these primitives.

**Current state:** lane logic is still inside `src/entities/Tent.js`.
The TwChannel extraction is the first implementation wave.
`TwNodeOps` is a new thin module to be created alongside it.

**Key invariants Layer 1 enforces for free:**
- `retract()` always refunds → Layer 2 never reasons about refund correctness
- `collapseCommittedPayload()` includes teardown → callers get a clean result
- Lifecycle state is owned here → Layer 2 requests transitions, doesn't drive them
- All energy writes go through named primitives → violations are auditable

**Does NOT know:** ownership rules, AI decisions, frame ordering, rendering.

---

### Layer 2 — Domain Rules

Policy modules that interpret lane and node state and decide which Layer 1 primitives
to invoke. **This layer is policy, not implementation.**

If a Layer 2 module is growing large, Layer 1 is still leaking. The right question for
any code in this layer: "is this a decision, or is it an implementation?"
If it's an implementation, it belongs in Layer 1.

**Responsibility:** express game rules — flow, clash, capture, ownership-transition
policy, relay behavior, alliance/hostility interpretation. Layer 2 is **policy plus
thin runtime operators built on Layer 1 primitives**. It decides *when* and *why*
to invoke Layer 1; Layer 1 handles *how*.

The distinction: if a module is deciding (threshold, condition, classification) it is
policy. If it is computing an energy delta or mutating lifecycle state, that belongs
in Layer 1. Layer 2 modules that contain both are incomplete extractions.

**Target files:**
- `src/tentaclewars/TwFlow.js` — packet advance orchestration and delivery decisions;
  thin runtime operators that schedule `channel.transfer()` calls per frame
- `src/tentaclewars/TwCombat.js` — clash outcome decisions, slice classification,
  thin operators that invoke `channel.retract()` / `channel.beginBurst()`
- `src/tentaclewars/TwCaptureRules.js` — capture pressure thresholds, timing decisions,
  calls Layer 1 ownership commit when threshold is reached
- `src/systems/Ownership.js` — ownership-transition policy (calls Layer 1
  `commitOwnershipTransfer` primitive, not `node.owner` directly)

**Expected behavior:** once Layer 1 primitives are complete, these modules become thin.
The runtime-mechanics parts of TwFlow (packet queue math, accumulator) may shift toward
Layer 1 over time as the boundary clarifies. Right now they sit in Layer 2 as thin
operators; if they grow, that signals Layer 1 is still leaking.

Essential policy complexity that remains in Layer 2 regardless:
- capture thresholds and timing
- alliance/hostility interpretation
- clash outcome tie-breaking and force computation
- relay policy decisions

**Does NOT know:** frame ordering, AI intent, rendering, direct `node.energy` writes.

---

### Layer 3 — World Orchestration

Frame ordering, system sequencing, simulation-mode gating. Calls Layer 2 modules in
the correct order each frame. Does not define domain rules — only orchestrates them.

**Responsibility:** make lower layers execute coherently within one simulation frame.
The current "God object" problem in Game.js is Layer 3 that absorbed Layer 2 work.

**Current files:**
- `src/core/Game.js` — main loop, level loading, simulation-mode gating
- `src/systems/Physics.js` — per-frame bookkeeping, double-buffer swap, outCount update
- `src/systems/WorldSystems.js` — world-mechanic orchestration (fog, pulsar, vortex, relay)
- `src/systems/EnergyBudget.js` — regen helpers (straddles Layer 2/3 today — refine over time)

**Intent receives come here:** Layer 4 (AI, input) emits intent; Layer 3 receives and
dispatches to the right Layer 2 module. Layer 4 does not call Layer 2 directly.

**Does NOT know:** rendering details, audio cues, UI state.

---

### Layer 4 — Consumers

Systems that observe the runtime and drive it through intent, but do not define its rules.

**Responsibility:** render, decide, listen, display — never mutate game state directly.

**Current files:**
- `src/rendering/` — canvas rendering pipeline, node/tent/HUD renderers
- `src/input/` — click, drag, slice, hover, preview helpers
- `src/ui/` — menus, HUD, result screens
- `src/audio/` — music and SFX
- AI behavior modules (within `src/core/Game.js` today — should extract over time)

**Read rule:** Layer 4 may read state from any layer below (rendering reads GameNode
positions and energy, AI reads node levels and ownership). Read-only observation does
not create the same coupling that writes do.

**Write rule (strict):** Layer 4 may only trigger changes through Layer 3.
No Layer 4 module calls Layer 1 or Layer 2 directly to change state.

---

## Inter-Layer Contract

This is an architecture rule, not a style preference. Violations are bugs.

### Write rule
> Each module may only trigger state changes through the layer immediately below it.
> No module writes to a layer two or more steps down.

### Read rule
> Modules may read (observe) state from any layer below them.
> Reading does not create coupling the way writing does.

### Import rule
> Each file may only import from files in the same layer or the layer immediately below.
> Cross-layer imports that skip a layer are architecture violations.

### Examples
| Action | Layer | Verdict |
|---|---|---|
| `Game.js` calls `node.energy +=` | L3 → L0 | ❌ violation — skips L1, L2 |
| `TwCombat` calls `channel.retract()` | L2 → L1 | ✅ correct |
| `TwCombat` calls `node.energy -=` | L2 → L0 | ❌ violation — skips L1 |
| Rendering reads `node.energy` for display | L4 reads L0 | ✅ permitted read |
| AI calls `TwCombat.resolveClash()` directly | L4 → L2 | ❌ violation — skips L3 |
| `Physics.js` calls `TwFlow.advanceTwFlow()` | L3 → L2 | ✅ correct |

---

## Cross-Cutting Communication

The 5-layer stack is the primary architecture. This section defines a narrow, constrained
communication protocol for coordination and observability — it is **not** a sixth layer
and **not** a license for arbitrary cross-layer mutation.

### Command path (downward only)
Intent descends through the official route:
```
Layer 4 (AI/input emits intent)
  → Layer 3 (orchestrates intent, dispatches to domain rules)
    → Layer 2 (interprets policy, selects primitives)
      → Layer 1 (executes primitives)
        → Layer 0 (state committed)
```
No shortcutting. No layer calls two steps down to change state.

### Event path (upward/outward, observation only)
Events, telemetry, and debug signals may propagate upward without violating the write rule.
Examples: `node:levelup`, `tent:connect`, `capture:complete` — emitted by lower layers,
consumed by higher layers for rendering, audio, UI, and AI awareness.

**Rule:** the event path may never be used to mutate state in a non-adjacent lower layer.
Events are observation, not commands. A Layer 4 handler that receives an event and then
calls a Layer 1 primitive is still a write-rule violation.

**Current mechanism:** `src/core/EventBus.js` — already exists, already used for this.

---

## Current Violations Map

Known places where layers currently cross. These are migration targets, not immediate
blockers. NodeWARS code violations stay until NW is retired.

| Location | Violation | Target |
|---|---|---|
| `Game.js` | Writes `node.energy` directly in several places | Route through Layer 1 primitive |
| `Tent.js` | Mixes Layer 1 (lifecycle) + Layer 2 (flow, combat) in one file | Extract TwChannel (Layer 1) |
| `TentCombat.js` | Has Layer 1 flow helpers and Layer 2 combat helpers mixed | Split into TwFlow + TwCombat |
| `Physics.js` calls `node.update(dt)` for regen | L3 invokes L0 self-update | ✅ permitted — see regen model below |
| `Game.js` writes `node.energy +=` directly | L3 → L0 direct field write | ❌ violation — must route through Layer 1 primitive |
| `EnergyBudget.js` | Straddles Layer 2 and Layer 3 | Clarify over time as Layer 2 matures |
| AI in `Game.js` | Layer 4 behavior fused with Layer 3 orchestration | Extract AI to Layer 4 module over time |

---

## Regen Model (explicit resolution)

Regen is the only `node.energy` write that does not come from a lane operation.
The rule for regen is:

> `GameNode.update(dt)` is a **Layer 0 self-update** — the node manages its own
> passive regen internally. Layer 3 (`Physics.js`) invokes it as an orchestration
> call, not as a direct field write.

This is not a Layer 3 → Layer 0 write violation. It is Layer 3 *triggering* a Layer 0
self-update method. The distinction: Layer 3 does not compute or assign the energy
delta — GameNode does that internally using its own rate and cap.

**Rule:** any code that computes an energy delta and assigns it to `node.energy` from
outside `GameNode.update()` or a Layer 1 primitive is a violation. Regen stays
self-contained inside `GameNode.update()`.

---

## Implementation Sequence

Layers should be built and stabilized bottom-up. Each layer is stable when its violations
count is zero and its tests pass independently.

1. **Layer 0** — already mostly clean. Minor cleanup: confirm `owner` field semantics in
   `GameNode` are substrate-only. The public ownership-write surface lives in Layer 1
   (`TwNodeOps.commitOwnershipTransfer`), not here.
2. **Layer 1** — TwChannel extraction (the current TW tent-layer spec covers this).
3. **Layer 2** — TwFlow and TwCombat thin once Layer 1 exists. TwCaptureRules and
   Ownership-policy already largely separate.
4. **Layer 3** — clean up Game.js God-object over time. Extract AI to Layer 4.
5. **Layer 4** — rendering/audio/UI already mostly correct. AI extraction is the main work.

NodeWARS code stays in Tent.js (delegation shell, D5 from tent-layer spec) until NW
is retired. After retirement, delete all NW paths and the layer boundaries become clean
throughout.

---

## Relation to TW Tent-Layer Spec

`docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md` defines the first
concrete implementation of this architecture:

- `TwChannel` → **Layer 1** first full extraction
- `TwFlow`, `TwCombat` → **Layer 2** policy modules, expected to be thin

That spec is the Layer 1-2 implementation plan. This document is its architectural context.
