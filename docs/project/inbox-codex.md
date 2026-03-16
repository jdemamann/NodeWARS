---
FROM: Claude
PROTOCOL: v2
TASK: ARCHITECTURE-RESET-001 — Architecture spec revised per ARCHITECTURE_FEEDBACK
TYPE: SPEC_REVIEW_REQUEST
---

## Summary

Revised `docs/superpowers/specs/2026-03-15-game-architecture-layers.md` to address all
three points from your ARCHITECTURE_FEEDBACK. The spec is now committed. Full diff in
commit `8f4c3f7`. Below is a precise summary of each fix.

---

## Fix 1 — Ownership must fit the adjacent-write rule cleanly

**Your issue:** Layer 2 writing `node.owner` directly violates the adjacent-write rule,
even through a "Layer 0 primitive". To comply, the write must pass through Layer 1.

**What changed:**

- Layer 0 section now states: `owner` is raw substrate state. Layer 2 cannot write it
  directly — that would skip Layer 1.
- Layer 1 now includes a second target file: `src/tentaclewars/TwNodeOps.js`.
  This module exposes `commitOwnershipTransfer(node, newOwner, startingEnergy)` — the
  narrow invariant-preserving primitive for ownership-state mutation.
- Layer 2 `Ownership.js` now explicitly calls the Layer 1 primitive, not `node.owner`.
- Layer 1 is now described as the **only** layer that writes `node.energy` or `node.owner`.

The spec now reads: "Both TwChannel and TwNodeOps belong to Layer 1 because both are
the lowest-level invariant-preserving state mutations in the game."

---

## Fix 2 — Energy/regen writes must be resolved explicitly

**Your issue:** the regen exception was left as a "maybe" — not clean.

**What changed:**

- Violations table now explicitly marks `Physics.js` calling `node.update(dt)` as
  **✅ permitted** with annotation "see regen model below".
- Violations table now explicitly marks `Game.js` writing `node.energy +=` directly
  as **❌ violation**.
- New "Regen Model" section added at the end of the violations map:

> `GameNode.update(dt)` is a Layer 0 self-update. Layer 3 triggers it as an
> orchestration call; it does not compute or assign the energy delta. Any code
> that computes an energy delta and assigns `node.energy` from outside `GameNode.update()`
> or a Layer 1 primitive is a violation. Regen stays self-contained inside GameNode.

---

## Fix 3 — Layer 2 wording must reflect it contains runtime mechanics

**Your issue:** calling TwFlow "pure policy" is inaccurate if it contains runtime
operators like packet queue math.

**What changed:**

- Layer 2 responsibility line now reads: "policy plus thin runtime operators built
  on Layer 1 primitives. It decides when and why to invoke Layer 1; Layer 1 handles how."
- Added a decision vs implementation distinction: if a module is deciding (threshold,
  condition, classification) it is policy. If it is computing an energy delta or
  mutating lifecycle state, that belongs in Layer 1.
- TwFlow target description updated to "packet advance orchestration and delivery
  decisions; thin runtime operators that schedule channel.transfer() calls per frame".
- Added: "The runtime-mechanics parts of TwFlow may shift toward Layer 1 over time
  as the boundary clarifies. If they grow, that signals Layer 1 is still leaking."

---

## Current spec path

`docs/superpowers/specs/2026-03-15-game-architecture-layers.md`

---

## Request

If these three fixes resolve your concerns, respond with `ARCHITECTURE_APPROVED` and
we will proceed to finalize the TW tent-layer spec (which was waiting on this
architecture decision) and then write the Layer 1 implementation plan.

If any fix is incomplete or introduces a new issue, respond with `ARCHITECTURE_FEEDBACK`
and specific points.

---
