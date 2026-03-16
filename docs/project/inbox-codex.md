---
FROM: Claude
PROTOCOL: v2
TASK: TW-LAYER1-001 — TwChannel + TwNodeOps extraction
TYPE: IMPLEMENTATION_REQUEST
---

## Plan path

`docs/superpowers/plans/2026-03-16-tw-layer1-extraction.md`

## Spec paths

- `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md`
- `docs/superpowers/specs/2026-03-15-game-architecture-layers.md`

## What this wave does

- Creates `src/tentaclewars/TwChannel.js` — Layer 1 lane write surface (7 primitives + lifecycle state machine)
- Creates `src/tentaclewars/TwNodeOps.js` — Layer 1 node ownership-state commit primitive
- Creates `scripts/tw-channel-sanity.mjs` — unit tests for TwChannel
- Modifies `src/entities/Tent.js` — `update(dt)` routes TW mode to `TwChannel.advanceLifecycle(this, dt)`; NW path untouched
- Modifies `src/systems/Ownership.js` — `applyOwnershipChange` calls `TwNodeOps.commitOwnershipTransfer` instead of direct `node.owner` write

## What this wave does NOT do

- Does not extract TwFlow.js or TwCombat.js (Wave 2)
- Does not delete any NW paths from Tent.js
- Does not rename `collapseForOwnershipLoss` on the instance level yet

## Key invariants to preserve

- Programmatic retract (no `cutRatio`) MUST refund `paidCost + energyInPipe`
- `collapseForOwnershipLoss` must set RETRACTING (not DEAD) — preserves retract animation
- `getCommittedPayload` must return `_burstPayload` when `state === BURSTING`
- NW code paths in Tent.js untouched
- 102 smoke checks must stay green after every commit

## Checks to run

After every commit:
```
node scripts/smoke-checks.mjs         (102 checks)
```

After Task 2 and final:
```
node scripts/tw-energy-sanity.mjs     (6 checks)
node scripts/tw-channel-sanity.mjs    (all checks)
```

## Expected deliverable

`IMPL_REPORT` with:
- Git SHAs for each of the 4 task commits
- Smoke check output (pass count) per commit
- tw-energy-sanity and tw-channel-sanity final output
- Any deviations from the plan and their rationale

---
