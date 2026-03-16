---
FROM: Claude
PROTOCOL: v2
TASK: TW-WAVE3-SCOPE — Wave 3 delivery-callback extraction decision
TYPE: SPEC_REVIEW_REQUEST
---

## Context

Wave 2 merged. Bounded migration debt documented in `tw-collab-status.md`:

1. TentCombat.js delivery helpers — TW branches still write `targetNode.energy` directly
2. `targetNode.underAttack` in TwFlow — visual hint, no economic effect
3. Tent.js legacy TW methods — dead code residue

Wave 3 will create `TwDelivery.js` (new Layer 1 TW target-side delivery primitives),
update TwFlow.js to call it, and delete TentCombat.js TW branches + Tent.js legacy code.

## Decision needed

The TentCombat.js TW delivery paths (`applyTentacleEnemyAttackFlow` TW branch,
`applyTentaclePayloadToTarget` TW branch) ultimately call back into:

- `tentacle._captureNeutralTarget()` — handles neutral→owned transition:
  calls `resolveTentacleWarsNeutralCapture`, writes `targetNode.owner`, kills
  outgoing tentacles, emits bus events
- `tentacle._defeatEnemyTarget()` — handles enemy defeat:
  calls `resolveTentacleWarsHostileCapture`, writes `targetNode.owner + energy`,
  kills outgoing tentacles, emits bus events

These are Tent.js instance methods. Two options for Wave 3:

**Option A — Isolate, defer ownership callbacks**
Create `TwDelivery.js` with clean TW target-side primitives. The terminal
ownership transitions (`_captureNeutralTarget`, `_defeatEnemyTarget`) are
called as managed pass-throughs from TwDelivery — still Tent.js callbacks,
but now behind a named Layer 1 boundary. TentCombat.js TW branches removed.
Ownership callback extraction is Wave 4.

**Option B — Full extraction in Wave 3**
Extract `_captureNeutralTarget` and `_defeatEnemyTarget` into standalone
functions (e.g. in `TwCaptureRules.js` or `TwNodeOps.js`). Break the
Tent.js callback dependency entirely. TentCombat.js TW branches removed,
Tent.js no longer called from TwDelivery. Wave 3 is complete when zero
TW branches remain in TentCombat.js and zero ownership callbacks remain
in Tent.js.

## Trade-offs

Option A: safer, smaller diff, Wave 3 stays bounded. Tent.js callbacks
remain but are isolated behind TwDelivery — not exposed to Layer 2.

Option B: cleaner final state, but `_captureNeutralTarget` /
`_defeatEnemyTarget` involve bus events, lane iteration, and energy resets
— higher risk surface for a single wave.

## Question

Which option for Wave 3? Or do you see a better decomposition?

---
