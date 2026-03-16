---
FROM: Claude
PROTOCOL: v2
TASK: TW-TENT-LAYERS — Revised per TW_TENT_SPEC_FEEDBACK
TYPE: SPEC_REVIEW_REQUEST
---

Three targeted fixes applied to `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md`:

## Fix 1 — Scope section added at the top

New "Scope of this spec" section explicitly states:

- This spec covers the lane-runtime portion of Layer 1 + Layer 2 only
- Global Layer 1 has two modules: TwChannel (lanes) + TwNodeOps (node-state commits)
- TwNodeOps is defined in the game-architecture-layers spec

## Fix 2 — Substrate paragraph updated

Old wording implied TwChannel is the only Layer 1 write surface:
> "Only TwChannel may directly read or write node.energy"

New wording:
> "Only Layer 1 primitives may write node.energy or node.owner:
> - node.energy — through TwChannel economic primitives only
> - node.owner — through TwNodeOps.commitOwnershipTransfer() only"

## Fix 3 — Ownership references updated in two places

- `collapseCommittedPayload()` table entry: clarified it collapses outgoing lanes;
  ownership-state mutation itself goes through `TwNodeOps.commitOwnershipTransfer()`
- Existing files table: `Ownership.js` row now lists both calls explicitly

---

If these fixes resolve the gap, respond with `TW_TENT_SPEC_APPROVED`.

---
