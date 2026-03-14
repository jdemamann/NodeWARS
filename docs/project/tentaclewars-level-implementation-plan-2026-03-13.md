# TentacleWars Level Implementation Plan

## Status

This document is a **planning artifact**. It does not authorize implementation by itself.

Decisions closed by `TASK-TWL-001` (2026-03-13) — do not reopen without explicit decision record:

- TentacleWars is a separate campaign track from NodeWARS
- NodeWARS campaign stays intact
- rollout is world-by-world (World 1 first)
- fidelity target is structural reconstruction, not pixel-perfect
- score/result system is TentacleWars-specific
- amoeba obstacles are in scope for World 1
- canonical authoring format is JS objects

The `Required Design Decisions` and `Questions That Must Be Answered` sections below are
retained for historical completeness. The six blocking questions at the bottom are now
answered via `docs/tentaclewars/tw-campaign-product-spec.md`.

---

## Purpose

Turn the current repository state plus the new external balance report into a robust level-design project plan for a TentacleWars-faithful phase track.

This document is intentionally a planning artifact only.
It does not authorize implementation by itself.

## Inputs Reviewed

Local project state:

- `src/config/gameConfig.js`
- `src/levels/FixedCampaignLayouts.js`
- `docs/implementation/tentaclewars-fidelity-spec.md`
- `docs/project/playtest-balance-plan.md`
- `docs/project/campaign-balance-matrix.md`
- `docs/project/task-backlog.md`
- `scripts/campaign-sanity.mjs`

External report from the user:

- Android-oriented world curve
- world-by-world energy-cap progression
- concrete sample phases
- obstacle concept using amoeba blockers
- proposal for an 80-level faithful campaign track

## Executive Summary

The repository is not currently structured as an 80-level TentacleWars campaign.

Today it contains:

- a `NodeWARS` campaign with `33` authored levels (`0` through `32`)
- `3` playable worlds plus tutorials and bosses
- heavy `NodeWARS`-specific world mechanics:
  - vortexes
  - pulsars
  - relays
  - signal towers
  - bunkers
- a separate `TentacleWars` sandbox track that is now mechanically and visually much closer to the target source game

So the next level-design step is not "tune the existing campaign into TentacleWars."
That would mix incompatible products.

The correct next step is:

1. define the product shape of a TentacleWars campaign track
2. define its level-data contract
3. define migration strategy relative to the existing NodeWARS campaign
4. define a world-by-world authoring and validation pipeline
5. only then start building levels

## Current State vs Report

### What already aligns well

- TentacleWars now has:
  - its own runtime boundary
  - its own grade table
  - its own slot table
  - its own packet-native lane model
  - its own capture semantics
  - its own AI track
  - scenario presets for repeatable visual tests
- the current codebase already supports:
  - authored fixed layouts
  - campaign metadata tables
  - progression helpers
  - sanity checks for level continuity and mechanic placement

### What does not align yet

- current campaign is only `33` phases, not `80+`
- current campaign worlds are:
  - `GENESIS`
  - `THE VOID`
  - `NEXUS PRIME`
- external report expects a TentacleWars-like structure:
  - World 1 tutorial / onboarding
  - World 2 Purple Menace
  - World 3 maze / advanced organisms
  - World 4 hardcore late game
- current authored campaign relies on mechanics that the TentacleWars sandbox explicitly disables for fidelity:
  - vortex hazards
  - pulsars
  - relays
  - signal towers
  - bunker identity
- current campaign sanity assumes:
  - tutorials at `0`, `11`, `22`
  - worlds only in `0..3`
  - current special mechanic placement by world

### Meaning

The external report is not a tuning patch for the current campaign.
It is a design input for a distinct authored campaign track.

## Recommended Product Direction

### Recommendation

Build TentacleWars levels as a separate campaign track, not as a rewrite of the shipped NodeWARS campaign.

### Why

- preserves the current stabilized product
- avoids breaking all existing campaign assumptions
- keeps fidelity work honest instead of hybridizing two incompatible world systems
- allows gradual rollout:
  - sandbox
  - prototype world
  - full TentacleWars campaign

### What this implies

We need a new campaign model that can coexist with:

- `NodeWARS campaign`
- `TentacleWars sandbox`
- future `TentacleWars campaign`

## Resolved Decisions

These points are now treated as closed unless explicitly reopened later.

### Campaign Relationship

- TentacleWars will become a separate game mode / campaign track
- NodeWARS campaign remains intact
- both modes must coexist in the same product

### Delivery Strategy

- implementation should proceed one world at a time
- tasks should be split by world
- this is still architected with the full multi-world campaign in mind

### Fidelity Target

- target is reconstruction, not loose reinterpretation
- do not mutate the current NodeWARS authored phase structure to force TentacleWars into it

### Scoring / Result Logic

- TentacleWars will use its own result/scoring system
- shared UI shells may be reused when practical
- result semantics must be allowed to diverge from NodeWARS where fidelity requires it

### Obstacles

- obstacle support must be planned from the start
- amoeba blockers should be included within the first TentacleWars world scope
- obstacle design must be explicitly documented so it is not forgotten during world-one authoring

### Level Authoring Format

- recommended canonical authoring format: `JS objects`
- rationale:
  - matches the current repository structure
  - easier to compose with helpers
  - easier to comment and review
  - easier to evolve while the schema is still stabilizing
- recommended future compatibility:
  - document the schema as JSON-like
  - optionally add JSON import/export later for tools or editors

## Required Design Decisions Before Implementation

These are the blocking decisions.

### 1. Product Shape

We need one canonical answer:

- Is TentacleWars campaign meant to be:
  - a full separate campaign inside the same game
  - a smaller curated "fidelity campaign"
  - a subset of reconstructed worlds first
  - or a debug/internal prototype track only

Recommendation:

- separate campaign track
- phase-based rollout
- World 1 first, not all 80 levels at once

### 2. Scope of Fidelity

We need to freeze whether level fidelity means:

- exact phase-by-phase reconstruction
- "inspired by original Android curve"
- or "same teaching order and world curve, but custom layouts"

Recommendation:

- target "high structural fidelity, not blind pixel-perfect reconstruction"
- preserve:
  - mechanic introduction order
  - world curve
  - energy-cap progression philosophy
  - faction timing
  - obstacle density ramp
- do not promise exact original coordinates unless verified

### 3. Campaign Progression Relationship

We need to decide whether TentacleWars campaign:

- has its own world select and progression
- shares stars/unlocks with NodeWARS
- shares result screens and score model
- shares tutorials or has its own

Recommendation:

- independent progression
- shared engine surfaces where possible
- separate progression/state namespace

### 4. Star / Par / Win Model

The report mentions:

- all hostile cells green for win
- neutrals optional
- 3-star timing and "no loss" style success conditions

We need to decide whether to keep:

- current NodeWARS score formula
- or a TentacleWars-specific star evaluator

Recommendation:

- keep result screen shell shared
- use TentacleWars-specific scoring/star rules
- do not reuse NodeWARS score logic blindly

### 5. Obstacles

The report describes amoeba-like blockers.
The current codebase does not currently expose a TentacleWars obstacle contract matching that concept.

We need to decide:

- are these pure line-of-sight blockers only
- do they affect packets visually
- are they static only
- what shape system is needed:
  - circle only
  - multi-circle blobs
  - polygon paths

Recommendation:

- start with static circular or blob-composed blockers
- line-of-sight blocking only
- no extra damage/drain semantics

### 6. Energy Cap Philosophy

The report expects strong per-phase cap ramping from very low values upward.
Current TentacleWars sandbox can already use configurable `nodeEnergyCap`, but no authored TentacleWars campaign exists yet.

We need to decide whether:

- low-cap lock phases are core to the fidelity campaign
- or whether to normalize upward for modern feel

Recommendation:

- preserve low-cap early worlds
- this is part of the original pacing identity

### 7. Purple Faction Introduction

The report expects purple to appear around World 2 / phase 21.
Current sandbox already supports purple.

We need to decide whether:

- the TentacleWars campaign mirrors that exact timing
- or whether purple can appear earlier in tutorials or previews

Recommendation:

- keep purple introduction later
- do not dilute the reveal

## Questions That Must Be Answered

Below is the full design questionnaire I recommend resolving before implementation.

### A. Product And Scope

1. Do you want TentacleWars levels to live:
   - inside the current product as a second campaign
   - or in a separate branch/app flavor later
2. Is the target:
   - World 1 only first
   - Worlds 1-2 first
   - or all worlds eventually
3. Is the expected endpoint:
   - `4 x 20` levels
   - `4 x 20 + Purple Menace episode`
   - or a curated smaller set
4. Do you want to preserve the current NodeWARS campaign fully unchanged?
5. Should the player choose between `NodeWARS` and `TentacleWars campaign` from the menu?

### B. Fidelity Target

6. Are we reconstructing original levels exactly, or matching only the design curve?
7. If exact reconstruction is desired, do you already have authoritative references for:
   - layouts
   - level order
   - starting energies
   - obstacle positions
   - 3-star times
8. Should the original world names be preserved or adapted to the current project fiction?
9. Should tutorials be separate levels, or integrated into the first phases of each world?

### C. Progression And Save Data

10. Should TentacleWars campaign have its own:
   - current level
   - completion flags
   - stars
   - fail streaks
11. Should unlock rules be fully separate from NodeWARS?
12. Should debug overrides for worlds work the same way in both campaigns?

### D. Score / Result Rules

13. Do you want TentacleWars to keep the current score breakdown:
   - time
   - wasted
   - frenzies
14. Or should TentacleWars use a different result model:
   - time only
   - no-cell-loss bonus
   - full-capture bonus
15. Are stars required for progression, or only optional mastery?
16. Do you want par values authorable per level from day one?

### E. Level Data Contract

17. Should TentacleWars levels use a new data file entirely separate from `LEVELS`?
18. Should authored layouts be stored:
   - inline in one file
   - one file per world
   - one file per level
19. Do you want level JSON as the canonical format, or JS objects for now?
20. Should the level contract include:
   - `energyCap`
   - `cells`
   - `obstacles`
   - `seedTentacles`
   - `par`
   - `threeStarTime`
   - `winCondition`
   - `introMechanicTags`
21. Do we need support for scripted tutorials per level from the start?

### F. Obstacles / Amebas

22. Should amoebas be:
   - simple circles
   - composite blobs
   - or hand-authored shapes
23. Can tentacles pass visually behind them, or must they stop before intersecting?
24. Do obstacles block only creation, or also existing tentacles if geometry changes?
25. Do we need moving obstacles at all, or only static ones?

### G. Neutral Cells

26. Should neutrals in authored TentacleWars levels always have explicit energy values instead of random ranges?
27. Should neutral capture thresholds be fully derived from displayed energy as today?
28. Are there any special neutral archetypes in the target campaign, or only standard cells?

### H. AI And Faction Use

29. Should red and blue both exist in the TentacleWars campaign, or should we collapse to one hostile color plus purple?
30. If blue exists, does it need distinct behavior or is it just visual variation?
31. Should purple appear only in certain phases or become persistent after introduction?
32. Do you want per-level AI behavior overrides:
   - cut frequency
   - aggression
   - multi-target pressure

### I. Grade And Cap Locking

33. The report implies some phases may effectively lock growth by energy cap. Do you want that preserved as a teaching tool?
34. Do we need explicit per-level grade ceilings beyond `energyCap`, or is cap alone enough?
35. Should early levels intentionally limit practical tentacle count through cap and energy scarcity rather than hard rule overrides?

### J. Visual / UX

36. Should the TentacleWars campaign use its own world-select art direction?
37. Should story text be separate from NodeWARS lore?
38. Should level cards show:
   - energy cap
   - mechanic tags
   - star target
   - obstacle presence
39. Do we need an in-level hint system for first-introduction mechanics?

### K. Authoring Workflow

40. Do you want a manual editor-first workflow, or author files by code first?
41. Is a future phase editor UI a requirement before full world authoring begins?
42. Should we support quick preview commands such as:
   - load level by id
   - jump to world
   - autoplay AI observation mode
43. Do you want spreadsheet support for balancing the level table?

### L. Delivery Strategy

44. Should implementation proceed world-by-world or by systems-first horizontal slices?
45. Is the first milestone:
   - one full TentacleWars world
   - or one tutorial + five representative levels
46. Do you want a public-facing incomplete release of TentacleWars campaign, or keep it hidden until a full world is complete?

## Recommended Answers

If you want the safest and strongest project shape, I recommend:

- separate TentacleWars campaign track
- independent progression/state
- World 1 first
- reconstruction target with explicit source-verification notes
- authored explicit cells and obstacles
- amoeba blockers included in World 1 scope
- TentacleWars-specific star/par model
- per-level explicit energy cap
- per-level explicit authored neutral energies
- `JS objects` as canonical authoring format
- no dependency on a visual level editor for the first world

## Proposed Execution Plan

This is the implementation order I recommend after questions are answered.

### Wave L1: Campaign Product Definition

Deliverables:

- decide product shape
- freeze progression model
- freeze scoring model
- freeze level-data schema

Output:

- campaign spec doc
- level-data schema doc
- open questions closed

### Wave L2: Level Data Model And Runtime Boundary

Deliverables:

- new TentacleWars campaign config table
- new authored layout source
- new progression namespace
- level loading path for TentacleWars campaign

Validation:

- campaign sanity for TentacleWars track
- progression sanity for separate save data

### Wave L3: World 1 Authoring Pack

Deliverables:

- tutorial + first world authored
- low-cap pacing
- first neutral-conversion lessons
- first obstacle introduction
- reconstruction notes for each authored level

Validation:

- per-level playtest worksheet
- world continuity sanity
- first star/par pass

### Wave L4: Obstacle And Authoring Support

Deliverables:

- amoeba blocker runtime if approved
- debug preview tools for obstacle-heavy levels
- visual validation captures for blocked-route cases

### Wave L5: World 2 Purple Menace

Deliverables:

- purple introduction arc
- central neutral contests
- higher cap pacing
- multi-hostile authored layouts

### Wave L6: Worlds 3-4 Advanced Density

Deliverables:

- labyrinth layouts
- higher density overlaps
- late-game survivability / loop pressure
- final boss world structure

### Wave L7: Final Campaign Polish

Deliverables:

- stars/par pass
- result flow polish
- world-select/content integration
- regression matrix for authored levels

## Proposed Task Breakdown

These are the tasks I would create after design approval.

### Planning Tasks

- `TASK-TWL-001 TentacleWars Campaign Product Spec`
- `TASK-TWL-002 TentacleWars Level Data Schema`
- `TASK-TWL-003 TentacleWars Progression and Score Spec`
- `TASK-TWL-004 TentacleWars Obstacle Spec`

### Runtime Tasks

- `TASK-TWL-005 TentacleWars Campaign Loader`
- `TASK-TWL-006 TentacleWars Campaign State Namespace`
- `TASK-TWL-007 TentacleWars Campaign Sanity Suite`

### Content Tasks

- `TASK-TWL-008 TentacleWars World 1 Authoring Pack`
- `TASK-TWL-009 TentacleWars World 1 Playtest and Reconstruction Review`
- `TASK-TWL-010 TentacleWars World 2 Authoring Pack`
- `TASK-TWL-011 TentacleWars World 2 Playtest and Reconstruction Review`
- `TASK-TWL-012 TentacleWars World 3 Authoring Pack`
- `TASK-TWL-013 TentacleWars World 3 Playtest and Reconstruction Review`
- `TASK-TWL-014 TentacleWars World 4 Authoring Pack`
- `TASK-TWL-015 TentacleWars World 4 Playtest and Reconstruction Review`

### Tooling Tasks

- `TASK-TWL-016 TentacleWars Level Preview and Jump Tools`
- `TASK-TWL-017 TentacleWars Spreadsheet Balance Matrix`
- `TASK-TWL-018 TentacleWars Phase Editor Feasibility Review`

## Risks If We Skip Planning

- we will accidentally mutate the NodeWARS campaign instead of creating a TentacleWars track
- current sanity scripts will start failing for reasons that are architectural, not buggy
- save/progression rules will drift or collide
- level data will be authored twice because the schema was not frozen first
- obstacle work will be guessed instead of designed
- exact-vs-inspired fidelity arguments will keep reopening implementation decisions

## What I Need From You Next

At minimum, I needed explicit answers to these six questions:

1. Should TentacleWars campaign be a separate campaign track from NodeWARS?
2. Do you want World 1 only first, or should we architect immediately for all 4 worlds?
3. Is fidelity target exact reconstruction, or faithful reinterpretation of the original curve?
4. Should TentacleWars use its own stars/par/result logic?
5. Should amoeba blockers be part of phase 1, or deferred until after World 1 basics?
6. Do you want authored level data as JS objects first, or JSON-first from the start?

## Review Pass

This plan was reviewed against:

- current campaign shape
- current TentacleWars sandbox capability
- current campaign sanity assumptions
- the external report's world curve
- the need to protect the existing NodeWARS product while building a new fidelity track

Those questions are now sufficiently answered to move from open discovery into formal pre-implementation planning.

Current conclusion:

The next logical step is still not level implementation.
The next logical step is to formalize:

- the TentacleWars campaign product spec
- the level-data schema
- the scoring/progression spec
- the per-world authoring plan

Only after those are frozen should the project begin authored world implementation.

See also:

- `docs/project/tentaclewars-campaign-skeleton-2026-03-13.md`
