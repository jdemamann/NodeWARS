# TentacleWars Comparison Report

## Purpose

This report compares:

- the user-provided Android Tentacle Wars mechanic report
- the project's local TentacleWars documentation
- the current TentacleWars sandbox implementation

It is intended to guide future fidelity work.
It is not an implementation instruction by itself.

## Sources Used

User-provided report:

- "Mecânica completa e precisa de Tentacle Wars (Android) para implementação fiel"

Local project docs:

- `docs/implementation/tentaclewars-fidelity-spec.md`
- `docs/project/tentacle-wars-mode-architecture-proposal-2026-03-11.md`
- `docs/project/tentacle-wars-mechanics-consolidated-study-2026-03-11.md`
- `docs/project/tentacle-wars-answer-review-2026-03-11.md`

Current implementation surfaces reviewed:

- `src/tentaclewars/TwBalance.js`
- `src/tentaclewars/TwGradeTable.js`
- `src/tentaclewars/TwCaptureRules.js`
- `src/tentaclewars/TwEnergyModel.js`
- `src/tentaclewars/TwPacketFlow.js`
- `src/tentaclewars/TwAI.js`
- `src/entities/Tent.js`
- `src/entities/GameNode.js`
- `src/systems/EnergyBudget.js`

## Confidence Legend

- `high`: strongly supported by both local docs and current code
- `medium`: supported by one of them, but still not fully frozen
- `low`: currently ambiguous or in conflict between sources

## Executive Summary

The user-provided report is useful and directionally strong, but it should not be imported literally into the current branch.

The biggest reasons are:

1. it assumes a fully independent-regeneration model where outgoing pulses do not spend source energy
2. it assumes segment-count tentacle economics and segment-count cut bursts
3. it suggests a per-grade tentacle-slot model that the local docs still have not frozen explicitly
4. it conflicts with several design decisions already locked in the local TentacleWars docs and sandbox code

The current TentacleWars sandbox is closer to the local project docs than to the new report on these points:

- packet-native transfer
- linear distance build cost instead of literal segment-cost growth
- hostile capture reset to `10`
- neutral acquisition threshold at `40%` of displayed neutral energy
- current cut logic based on committed payload geometry, not pure segment burst
- overflow currently implemented as `broadcast_full`, not equal split

The report is still highly valuable as a comparison document, especially for:

- slot-cap expectations by grade
- the feel of level-based throughput escalation
- the importance of slice as a core tactical mechanic
- the "living tissue" pressure fantasy of the original game

## Comparison Matrix

### 1. Cell ownership and phase cap

User report:

- owners: player, red, blue, purple, neutral
- phase-specific energy cap
- global max cap `200`

Local docs:

- strongly agree on phase cap and global max `200`
- current sandbox uses one prototype cap, not full stage-by-stage fidelity yet

Current implementation:

- sandbox `nodeEnergyCap = 200`
- hostile owners in sandbox are red and purple
- neutral cells exist

Assessment:

- `high` confidence on global cap `200`
- `medium` confidence on future phase-by-phase cap fidelity

Recommended adaptation:

- preserve `200` as global hard cap
- later add stage- or scenario-specific cap presets if full fidelity becomes a target

### 2. Energy generation model

User report:

- all owned cells regenerate independently
- pulses are created from the source cell's production rate
- source energy is not consumed by transfer

Local docs:

- this area is explicitly flagged as still needing a fidelity decision
- the project leaned toward a budgeted source model rather than free duplicated output

Current implementation:

- display regen is driven by TentacleWars grade packet rate
- outgoing lanes are packetized
- emitted packets are paid from `sourceNode.energy`

Assessment:

- `low` confidence that the user report should replace the current rule directly
- this is one of the largest unresolved fidelity questions

Why it matters:

- this is not a tuning issue
- it changes the entire economy, threat curve, and support-loop behavior

Recommended adaptation:

- do not change this blindly from the user report alone
- explicitly run a dedicated fidelity decision on:
  - `free production + free transfer`
  - versus
  - `regen-backed emitted transfer with real source spend`

### 3. Grade thresholds and throughput

User report:

- `Spore`: `15 / 5`, `1 every 2s`
- `Embryo`: `40 / 30`, `1 every 1s`
- `Pulsar`: `80 / 60`, about `1.5/s`
- `Gamma`: `120 / 100`, `2/s`
- `Solar`: `160 / 140`, `4/s`
- `Dominator`: `>160 / >140`, `2 every 0.25s`

Local docs:

- current consolidated project docs froze:
  - `15/5`
  - `40/30`
  - `80/60`
  - `120/100`
  - `160/140`
  - `180/160`
- current project target throughput:
  - `1.0`
  - `1.5`
  - `2.0`
  - `2.5`
  - `3.0`
  - Dominator doubled from Grade 5

Current implementation:

- matches the local project docs, not the new report:
  - thresholds `15, 40, 80, 120, 160, 180`
  - descend `5, 30, 60, 100, 140, 160`
  - rates `1.0, 1.5, 2.0, 2.5, 3.0, 6.0`

Assessment:

- `high` confidence that the current branch is intentionally aligned to the local project docs here
- `medium` confidence that the user report might reflect a different interpretation of late-grade rates

Recommended adaptation:

- keep current thresholds/rates until a direct source proves otherwise
- if the user wants the Android report to become authoritative, run a dedicated grade-table reconciliation wave first

### 4. Tentacle slot count by grade

User report:

- slots appear level-dependent:
  - early `1`
  - middle `1-2` or `2`
  - late `3`

Local docs:

- only explicitly freeze:
  - minimum `1`
  - maximum `3`
  - "depending on the case"
- they do not currently lock an exact per-grade slot table

Current implementation:

- fixed cap `3` for all TentacleWars grades

Assessment:

- `high` confidence that this is a real open fidelity gap

Why it matters:

- it affects both mechanics and UI
- it also explains why cards and player expectations can drift badly

Recommended adaptation:

- treat this as a first-class follow-up
- do not tune around it
- freeze one authoritative slot-cap table by grade before more balance work

### 5. Tentacle build cost

User report:

- `1 energy per segment`
- growth stops when energy runs out

Local docs:

- current project direction froze:
  - pure linear distance cost
  - no fixed base cost
  - fully refundable on cancel/retract

Current implementation:

- linear distance cost through `TW_BALANCE.TENTACLE_COST_PER_PIXEL = 0.03`
- cost is committed progressively during growth
- cancellation/refund is full

Assessment:

- `high` confidence that the current branch intentionally diverges from the segment-cost interpretation

Recommended adaptation:

- keep the current linear-distance model unless the user explicitly decides to replace it
- the user report should be treated as comparison evidence, not a silent override

### 6. Packet transfer and pulse timing

User report:

- pulse frequency follows source production rate
- target receives `+1` for allied, `-1` for hostile

Local docs:

- strongly support a real packet model with packet size `1`
- fractional rates should be handled by accumulators

Current implementation:

- packet size `1`
- packet accumulator per lane
- travel queue per lane
- delayed delivery

Assessment:

- `high` confidence that current packetization matches the spirit of the report

Recommended adaptation:

- keep packetization
- use the report only as further support that packet feel is central

### 7. Overflow

User report:

- if a full target receives excess, overflow continues through connected tentacles

Local docs:

- earlier docs proposed equal split in phase 1
- later follow-up direction in this branch moved to `broadcast_full`

Current implementation:

- overflow only at full cap
- current mode uses `broadcast_full`

Assessment:

- `medium` confidence
- this is a documented project drift area, not a settled original-fidelity truth

Recommended adaptation:

- do not trust any single older note here
- if overflow feel is still off, compare:
  - user report
  - answer-sheet history
  - live sandbox feel

### 8. Slice / cut semantics

User report:

- cutting injects the exact stored target-side segment count as an immediate burst
- near source means big forward burst
- near target means small forward burst

Local docs:

- current project docs froze a different model:
  - cut payload = invested build energy + in-transit energy
  - geometry decides source share vs target share

Current implementation:

- uses the project-doc model, not the user report model
- TentacleWars cut payout is geometric and progressive during retraction presentation

Assessment:

- `high` confidence that this is the single biggest semantic divergence between the report and the current branch

Recommended adaptation:

- do not paper over this as a visual bug
- if fidelity to the Android report becomes authoritative, this requires a dedicated slice-rule review

### 9. Hostile capture

User report:

- captured hostile cell resets to `10`

Local docs:

- agree

Current implementation:

- agree

Assessment:

- `high` confidence

Recommended adaptation:

- keep current rule

### 10. Neutral capture

User report:

- neutrals use an occupancy threshold
- example suggests a large energy windfall after capture

Local docs:

- current project direction froze:
  - neutral energy remains as the base energy
  - acquisition threshold is separate
  - threshold currently modeled as `40%` of displayed neutral energy

Current implementation:

- threshold = `ceil(energy * 0.4)`
- captured neutral keeps its displayed energy as base
- extra pressure becomes carryover

Assessment:

- `medium` confidence that the user report and the current branch are describing different neutral semantics

Recommended adaptation:

- treat the "25 turns into 76" example as comparison evidence only
- do not replace the current neutral rule without freezing a new neutral-capture contract first

### 11. AI identity

User report:

- red/blue basic
- purple aggressive, cuts lines, reinforces, multi-target pressure

Local docs:

- strongly agree that purple should remain slice-driven and tactically distinct

Current implementation:

- purple TentacleWars AI uses the canonical slice path
- sandbox treats red and purple as hostile to each other by default

Assessment:

- `high` confidence on purple slice identity
- `medium` confidence on full original-faction behavior parity

Recommended adaptation:

- keep the current purple slice identity work
- continue tuning only after controlled scenario presets exist

## Main Divergence Clusters

### A. Economy model divergence

The user report assumes:

- independent production
- no real source-spend for lane transfer

The current sandbox assumes:

- packetized output with source-spend

This is the biggest systemic divergence.

### B. Slice-rule divergence

The user report assumes:

- segment-count immediate burst semantics

The current sandbox uses:

- geometric split of committed payload

This is the biggest combat-rule divergence.

### C. Slot-table divergence

The user report implies:

- grade-linked slot progression

The current sandbox uses:

- fixed cap `3`

This is the most actionable unresolved divergence right now.

## Recommendations

### Priority 1

Freeze an authoritative TentacleWars grade-slot table.

Why:

- it is clearly unresolved
- it affects both mechanics and UI
- it is already causing interpretation drift

### Priority 2

Run a dedicated economy-model review.

Question to resolve:

- should TentacleWars use free production plus independent transfer
- or the current source-spend packet budget model

### Priority 3

Run a dedicated slice semantics review.

Question to resolve:

- should TentacleWars cuts behave like geometric committed-payload redistribution
- or immediate segment-count burst injection toward the target side

### Priority 4

Keep the current confirmed rules unless one of the above reviews explicitly changes them:

- global cap `200`
- packet size `1`
- hostile reset `10`
- separate neutral acquisition threshold
- purple slice identity
- disabled world-layer gimmicks in the sandbox

## Suggested Task Impact

The comparison suggests these backlog items remain correct:

- `TASK-TW-019 TentacleWars HUD and Card Fidelity Contract`
- `TASK-TW-023 TentacleWars Grade Slot Table Reconciliation`
- `TASK-TW-017 TentacleWars Controlled Scenario Presets`
- `TASK-TW-018 TentacleWars Sandbox Playtest and Tuning Wave B`

The comparison also suggests two future design-review waves may be needed before deeper implementation:

- `TentacleWars Economy Model Reconciliation`
- `TentacleWars Slice Semantics Reconciliation`

## Final Position

The user-provided report should be treated as:

- a strong comparison source
- a good challenge to some current assumptions
- not yet an automatic replacement for the project's current TentacleWars mechanics

The safest path is:

1. freeze slot progression by grade
2. reconcile the economy model
3. reconcile slice semantics
4. only then retune visuals and balance around the final chosen mechanic set
