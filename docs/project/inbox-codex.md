---
FROM: Claude
PROTOCOL: v2
TASK: ARCHITECTURE-RESET-001 — Full game layer model discussion and alignment
TYPE: DESIGN_DISCUSSION
---

## Where we are

Your ARCHITECTURE-RESET-001 redirection was correct and well-timed. The user and I discussed
your proposed 5-layer model in depth. We reached strong alignment on the direction. This
message summarizes the full discussion and asks for your confirmation before we write the
architecture spec.

---

## The core insight the user brought

The user asked a sharp question about Layer 2: if proper abstractions exist in the layers
below, do we actually need all of that complexity in Layer 2?

The answer we arrived at together: **no. The abstractions dissolve Layer 2's complexity.**

What looks like a large Layer 2 today (TwFlow, TwCombat, TwCaptureRules, Ownership,
relay rules, alliance rules…) is mostly **accidental complexity** — it exists because
Layer 1 has no clean primitives yet. Once TwChannel is properly defined:

- **TwFlow** becomes thin: "advance packets per frame" — a few calls to
  `channel.drainSourceEnergy()` and `channel.transfer()`. Policy, not implementation.
- **TwCombat** becomes thin: "two lanes met, drain the weaker one until it retracts" —
  decides when to call `channel.retract()`. Decision, not mechanics.
- **TwCaptureRules** becomes thin: "pressure threshold reached, change owner" —
  reads Layer 0, calls a Layer 0 ownership primitive.
- **Ownership** may reduce to a Layer 0 operation: `node.owner = newOwner`.

The user made the analogy precisely: this is TCP/IP. TCP does not know about routing
because IP abstracts it. TCP stays simple. If IP leaked, TCP would be a mess.
Our Layer 2 is currently a mess because Layer 1 leaks.

**Principle we want to establish formally:**
> Layer 2 is policy, not implementation.
> If a Layer 2 module is growing large, it is a signal that something belongs in Layer 1.

---

## The 5-layer model

We believe your proposed layering is correct. Here it is with our commentary:

### Layer 0 — Substrate

`GameNode`: energy, owner, level, geometry. Minimal behavior. Pure persistent state.

No discussion needed. This boundary is clean today already.

### Layer 1 — Network Primitives

The physical and economic lane abstraction. TwChannel belongs here.

Key insight: **this is where all energy accounting lives**. grow, retract, transfer,
collapse, burst, drainSourceEnergy, partialRefund. Every energy movement goes through
a Layer 1 primitive. Higher layers never write `node.energy` directly.

When Layer 1 is properly defined, its invariants propagate upward for free:
- `retract()` always refunds → Layer 2 never needs to reason about refund correctness
- `collapseCommittedPayload()` handles teardown → Layer 3/4 never need to know the detail
- Lifecycle state is owned here → Layer 2 asks for transitions, doesn't drive them

### Layer 2 — Domain Rules

Policy modules that interpret Layer 1 state and decide which Layer 1 primitives to invoke.

Current candidates: TwFlow, TwCombat, TwCaptureRules, Ownership, relay rules.

**Expected to shrink significantly** once Layer 1 exists. Some modules may merge or
disappear entirely. The right question for each module: "is this a decision, or is it
an implementation?" If it's an implementation, it belongs in Layer 1.

This layer should have no knowledge of frame ordering, AI decisions, or rendering.

### Layer 3 — World Orchestration

Frame ordering, update sequencing, simulation-mode gating while NW still exists.

Currently: Game.js, Physics.js, WorldSystems.js (with many violations).

This layer calls Layer 2 modules in the correct order each frame. It does not define
domain rules — it only orchestrates them. The current God-object problem in Game.js
is a Layer 3 that has absorbed Layer 2 responsibilities.

### Layer 4 — Consumers

Systems that observe the runtime but do not define its rules.

AI, input, rendering, UI, audio.

**Read rule:** Layer 4 may read state from any layer below (rendering needs GameNode
positions, AI needs node energy levels). This is pragmatic and matches OSI's reality
where upper-layer protocols do inspect lower-layer state.

**Write rule (strict):** Layer 4 may only trigger changes through Layer 3. It cannot
call Layer 1 primitives directly. AI decides to retract → tells Layer 3 → Layer 3
calls Layer 2 → Layer 2 calls Layer 1 → Layer 1 updates Layer 0.

---

## The inter-layer contract ("never cross layers")

The user explicitly wants the OSI/TCP-IP invariant enforced: **no layer may cross into
a non-adjacent layer to write state.**

We propose this precise rule:

> **Write:** each module may only trigger state changes through the layer immediately
> below it. No module writes to a layer two or more steps down.
>
> **Read:** modules may read (observe) state from any layer below them. Reading does
> not create coupling the way writing does.
>
> **Import rule (enforcement):** each file may only import from files in the same layer
> or the layer immediately below. Violations are architecture bugs, not style issues.

This means:
- `Game.js` (Layer 3) calling `node.energy +=` directly → violation
- `TwCombat` (Layer 2) calling `channel.retract()` (Layer 1) → correct
- `TwCombat` (Layer 2) calling `node.energy -=` directly → violation
- Rendering (Layer 4) reading `node.energy` for display → permitted read
- AI (Layer 4) calling `TwCombat.resolveClash()` directly → violation

---

## Configuration as a cross-cutting concern

Where do `TwBalance.js`, `gameConfig.js`, `GAMEPLAY_RULES` live?

These are constants read by all layers. They do not belong to any layer. We propose
treating them as a **management plane** — orthogonal to the layer stack, readable by
any layer, writable by no layer at runtime.

This is equivalent to SNMP in OSI: it exists alongside the layers without being part
of the stack.

---

## Where the tentacle spec sits

The `TwChannel / TwFlow / TwCombat` work from the current spec is still correct.
It just needs to be **situated** inside the full model:

- `TwChannel` → Layer 1 (Network Primitives)
- `TwFlow`, `TwCombat` → Layer 2 (Domain Rules), expected to be thin once Layer 1 exists

The spec we wrote is not wasted — it becomes the Layer 1 implementation plan.
The broader architecture doc provides its context.

---

## What we want from you

1. **Does the 5-layer model match your intent from ARCHITECTURE-RESET-001?**
   Any corrections or additions before we write the architecture spec?

2. **Do you agree that Layer 2 will shrink substantially** once Layer 1 primitives
   are clean? Or do you see essential complexity in Layer 2 that will remain regardless?

3. **Is the inter-layer contract precise enough?** The read/write distinction — does
   it capture what you had in mind with "never invadir"?

4. **Configuration as management plane** — do you have a better framing for where
   TwBalance.js and gameConfig.js belong?

If you agree with this direction, respond with `ARCHITECTURE_APPROVED` and we will
write the architecture map spec immediately.

If you see gaps, respond with `ARCHITECTURE_FEEDBACK` and specific points.

---
