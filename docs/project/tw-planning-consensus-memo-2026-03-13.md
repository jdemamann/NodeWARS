# TentacleWars Planning Consensus Memo

## Status

Updated 2026-03-13 after convergence session. **TWL-001 is done. TWL-002 is active.**

All corrections below have been applied to the planning documents.
This memo is now the handoff record — not an open negotiation.

---

## Purpose

This memo records the converged state of TentacleWars campaign planning so future
sessions can proceed without reopening settled decisions.

## Read These Files First

1. `docs/project/tentaclewars-campaign-skeleton-2026-03-13.md`
2. `docs/project/tentaclewars-level-implementation-plan-2026-03-13.md`
3. `docs/project/tw-campaign-task-definitions.md`
4. `docs/tentaclewars/tw-campaign-product-spec.md`
5. `docs/project/task-backlog.md`
6. `docs/project/operational-kanban.md`
7. `src/config/gameConfig.js`
8. `src/levels/FixedCampaignLayouts.js`
9. `scripts/campaign-sanity.mjs`
10. `docs/implementation/tentaclewars-fidelity-spec.md`

## User Decisions Already Closed

Do not reopen these unless the user explicitly changes them:

- TentacleWars must be a separate campaign track from NodeWARS
- NodeWARS campaign must remain intact
- rollout should proceed one world at a time
- fidelity target is reconstruction, not loose reinterpretation
- TentacleWars uses its own scoring/result system
- amoeba blockers must remain in the world-one planning scope
- canonical authoring format should start as `JS objects`

## What Was Correct In The Reorganization

- splitting `TWL-008` into `008a/008b`
- adding explicit dependencies
- moving `TWL-017` before authoring
- centralizing win condition ownership in `TWL-001`
- separating blocking vs informative completion criteria

## What Needed Correction

### 1. `TWL-007` Was Too Late And Too Broad

Problem:

- it required "all authored levels pass" before authoring started
- `TWL-008a` depended on it, creating a practical planning deadlock

Correction:

- `TWL-007` is now the bootstrap sanity harness
- it validates fixture/sample data first
- authored-world coverage gets extended during `TWL-008a`, `TWL-008b`, and later world tasks

### 2. `TWL-005` Referenced A Later Check

Problem:

- loader DoD referenced campaign sanity as if the full TW campaign suite already existed

Correction:

- loader DoD now requires loader integration checks against schema-valid fixture data
- full TW campaign sanity remains owned by `TWL-007`

### 3. `TWL-001` Closed UI Decisions Too Early

Problem:

- product spec treated main-menu entry flow and "no hint system in World 1" as settled
- those were not actually approved by the user as blocking product decisions

Correction:

- campaign-entry UI is now provisional
- hint-system stance is now a recommendation, not a closed decision

## Recommended Convergence Rule

Please optimize for this:

- keep the project moving
- stop reopening settled user decisions
- only challenge sequencing, validation, or missing contracts
- prefer the smallest doc change that removes ambiguity

Do not optimize for this:

- perfect speculative completeness
- redesigning the whole campaign plan every pass
- rewording docs that are already directionally correct without adding execution value

## Agreed Sequence to World 1

```
Phase A
  TWL-001  DONE
  TWL-002  ACTIVE  ← current
  TWL-003  planned (parallel to TWL-002, depends TWL-001 ✓)
  TWL-004  planned (parallel to TWL-002 and TWL-003, depends TWL-001 ✓)

Phase B  (after Phase A complete)
  TWL-007  (depends TWL-002)
  TWL-005  (depends TWL-002 + TWL-003)
  TWL-006  (depends TWL-003)
  TWL-017  (depends TWL-002, must finish before TWL-008a)
  TWL-016  (depends TWL-005)

Phase C  (after all Phase B complete)
  TWL-008a  prototype W1-01..05, pipeline gate
  TWL-008b  complete W1-06..20, after gate confirmed
  TWL-009   playtest and reconstruction review
```

## If You Disagree

If you disagree with any part of the current plan, frame it in one of these buckets only:

- blocking sequencing issue
- missing validation contract
- user decision appears contradicted
- unnecessary task split causing churn

Please avoid broad restarts of the planning structure unless one of those is true.
