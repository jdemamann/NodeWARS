---
FROM: Claude
PROTOCOL: v2
TASK: TW-WAVE2-001 — TwFlow + TwCombat extraction
TYPE: IMPLEMENTATION_REQUEST
---

## Plan path

`docs/superpowers/plans/2026-03-16-tw-wave2-flow-combat.md`

## Spec paths

- `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md`
- `docs/superpowers/specs/2026-03-15-game-architecture-layers.md`

## What this wave does

- Creates `src/tentaclewars/TwFlow.js` — Layer 2 TW packet-flow policy
  - `advanceTwFlow(channel, dt)` — replaces `channel._updateTentacleWarsActiveFlowState`
  - `applyTwPayloadToTarget(channel, targetNode, sourceNode, payload, opts)` — wraps TentCombat
  - `getRelayFlowMultiplier(sourceNode)` — pure helper
  - `clearFlowState(channel)` — replaces `_clearPipeState` (per spec migration map)
- Creates `src/tentaclewars/TwCombat.js` — Layer 2 TW clash + cut policy
  - `advanceTwClash(channel, dt)` — replaces `channel._updateClashState(dt)` (TW path)
  - `advanceTwCutRetraction(channel, dt)` — replaces `channel._advanceTwCutRetraction(dt)`
  - `applyTwSliceCut(channel, cutRatio, payload)` — replaces `channel._applyTentacleWarsSliceCut`
- Creates `scripts/tw-flow-sanity.mjs` (7 tests) and `scripts/tw-combat-sanity.mjs` (6 tests)
- Modifies `src/tentaclewars/TwChannel.js` — exports `clearEconomicPayload` + `resolveClashPartnerOnCut`; replaces all call-backs into Tent.js methods
- Modifies `src/entities/Tent.js` — `kill()` TW slice branch routes to `TwCombat.applyTwSliceCut`

## What this wave does NOT do

- Does not delete any existing methods from Tent.js (`_applyTentacleWarsSliceCut`, `_advanceTwCutRetraction`, etc. remain as dead reference)
- Does not delete TentCombat.js (shared NW/TW helpers)
- Does not rename `collapseForOwnershipLoss`
- Does not introduce `pairChannels`/`unpairChannels` (Wave 3)

## Key invariants to preserve

- 102 smoke checks green after every commit
- Programmatic retract refunds `paidCost + energyInPipe`
- TW slice cut produces `twCutRetraction` with geometric source/target split
- Clash auto-retract fires for ALL outgoing tentacles when loser < `TW_RETRACT_CRITICAL_ENERGY`
- `advanceTwClash` is called only from `TwChannel.advanceActive` — no NW mode guard needed
- `collapseForOwnershipLoss` on `Tent.js` still calls its OWN `_resolveClashPartnerOnCut` instance method (untouched)

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

After Task 1: `node scripts/tw-flow-sanity.mjs` (7 checks)
After Task 3: `node scripts/tw-combat-sanity.mjs` (6 checks)

## Expected deliverable

`IMPL_REPORT` with:
- Git SHAs for each of the 5 task commits
- Smoke check output (pass count) per commit
- tw-energy-sanity final output (6 checks)
- tw-flow-sanity (7/7) and tw-combat-sanity (6/6) final output
- Any deviations from the plan and their rationale

---
