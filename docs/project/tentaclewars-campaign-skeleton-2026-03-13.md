# TentacleWars Campaign Skeleton

## Purpose

Define the macro structure of the future TentacleWars campaign before formal specs and before authored level implementation.

This is the bridge between:

- the external reconstruction target
- the current repository capabilities
- the task sequence needed for safe implementation

## Planning Position

The right order is:

1. campaign skeleton
2. structural specs that the skeleton requires
3. runtime and progression support
4. world-by-world authored implementation
5. world-by-world validation

This avoids two common failures:

- writing abstract specs without a campaign shape
- authoring levels before the runtime and progression contracts are frozen

## Product Structure

The product will contain three distinct Tentacle/strategy surfaces:

- `NodeWARS campaign`
- `TentacleWars sandbox`
- `TentacleWars campaign`

The new campaign must not mutate the current NodeWARS campaign.

## Campaign Shape

Recommended target:

- `4` worlds
- `20` phases per world
- total target: `80` phases

Recommended rollout:

- architect for `80`
- implement `World 1` first
- only move to the next world after the previous one has:
  - authored content
  - playtest notes
  - sanity coverage
  - score/par review

## World Structure

Each world should be planned as four internal bands:

1. `Tutorial / Introduction`
2. `Core expansion band`
3. `Pressure / mastery band`
4. `Boss / climax band`

That gives a stable authoring rhythm without forcing all 20 phases to be designed at once.

Suggested internal split per world:

- phases `1-4`: introduction and lesson lock-in
- phases `5-10`: mechanic reinforcement
- phases `11-16`: pressure and combination play
- phases `17-20`: high-intensity mastery and boss closure

## World-by-World Skeleton

### World 1

Purpose:

- teach the base language of TentacleWars
- establish low-cap pacing
- teach neutral conversion, support, early slicing, and lane commitment
- introduce static amoeba blockers late in the world, not immediately

Core identity:

- constrained growth
- readable small layouts
- high clarity over spectacle

Expected introduced mechanics:

- connect
- reinforce
- hostile capture
- neutral capture
- slice for tactical acceleration
- limited tentacle-cap pressure
- first obstacle routing

Energy-cap band:

- very low to low
- should preserve the "small-scale tactical pressure" identity

Design warning:

- do not overload World 1 with advanced purple behavior or dense obstacle mazes

### World 2

Purpose:

- introduce purple as a real disruption force
- shift from "learn the rules" to "execute under pressure"
- create central contest patterns around valuable neutrals

Core identity:

- pressure spikes
- contested center
- reactive slicing

Expected introduced mechanics:

- purple slice pressure
- multi-front hostile timing
- stronger neutral contest urgency

Energy-cap band:

- low-mid to mid

Design warning:

- purple should feel like an escalation, not arbitrary punishment

### World 3

Purpose:

- emphasize route planning and structural density
- increase obstacle presence substantially
- stress long-form tactical control under more constrained paths

Core identity:

- labyrinth routing
- obstacle-driven expansion choices
- mid-to-high complexity maps

Expected introduced mechanics:

- obstacle-heavy pathing
- denser overlap
- larger hostile ecosystems

Energy-cap band:

- mid-high

Design warning:

- route readability must stay ahead of difficulty

### World 4

Purpose:

- close the reconstruction arc with maximum pressure
- require mastery of loops, cuts, pressure timing, and survival under crowding

Core identity:

- high-cap chaos
- severe obstacle pressure
- dominant hostile openings

Expected introduced mechanics:

- full late-game loop play
- heavy purple pressure
- hardest routing and timing tests

Energy-cap band:

- high to max

Design warning:

- difficulty must come from mastery, not visual unreadability

## World 1 Detailed Skeleton

World 1 should be the first implementation milestone.

Recommended structure:

- `W1-01` to `W1-04`
  - pure onboarding
  - very small layouts
  - no obstacle complexity
- `W1-05` to `W1-08`
  - first meaningful route decisions
  - first repeated need for slice and retarget timing
- `W1-09` to `W1-12`
  - first advanced pressure cases
  - first strong central enemy or central contest
- `W1-13` to `W1-16`
  - obstacle introduction and reinforcement
  - limited maze identity, still readable
- `W1-17` to `W1-19`
  - mastery checks around repeated cuts and support loops
- `W1-20`
  - world boss closure

## Reconstruction Philosophy

The campaign should be reconstructed in this order of fidelity priority:

1. mechanic introduction order
2. world difficulty curve
3. faction introduction timing
4. energy-cap pacing
5. obstacle density curve
6. representative structural layouts
7. exact level coordinates and star timings when verified

This is the right compromise because the project currently does not yet have authoritative original data for every single phase coordinate and timer.

## Task Definition Reference

Full per-task definition of done, explicit dependencies, and risk resolutions are in:

- `docs/project/tw-campaign-task-definitions.md`

Do not start any TASK-TWL task without reading that file first.

---

## Required Specs Implied By This Skeleton

Before authoring `World 1`, the following specs must be formalized:

- campaign product spec
- level-data schema
- progression/save-state spec
- score/result spec
- obstacle spec

These are not optional paperwork.
They are the minimum contract required to keep world authoring from drifting.

## Validation Strategy

Every world should follow the same validation loop:

1. schema validation
2. campaign sanity
3. gameplay smoke
4. world-specific playtest worksheet
5. score/par review
6. visual capture set for representative phases

Recommended minimum checks once implementation starts:

- `node scripts/campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/game-state-progression-sanity.mjs` when progression changes
- `node scripts/ui-actions-sanity.mjs` and `node scripts/ui-dom-sanity.mjs` when campaign-facing UI changes

## Task Sequence

This is the recommended execution order, revised after critical risk review (2026-03-13).

Seven concrete risks were identified and resolved in this sequence. See
`docs/project/tw-campaign-task-definitions.md` for per-task definition of done
and explicit dependency declarations.

### Phase A: Pre-Implementation Design

- `TASK-TWL-001 TentacleWars Campaign Product Spec`
  - defines win condition canonically (referenced by 002 and 003, not re-defined there)
  - blocking done: product shape, win condition, purple timing, world names, fidelity scope
- `TASK-TWL-002 TentacleWars Level Data Schema`
  - co-developed with schema-driven tests that define completion criteria
  - blocking done: all fields in the level contract, `cells`, `obstacles`, `energyCap`, `winCondition`, `par`
- `TASK-TWL-003 TentacleWars Progression and Score Spec`
  - **explicit blocker**: TWL-005, TWL-006, and TWL-007 must not start until this is marked done
  - defines the progression namespace isolation contract
- `TASK-TWL-004 TentacleWars Obstacle Spec`
  - must include a closed complexity decision: static-circle-only vs composite-blob
  - if composite-blob is chosen, a runtime sub-task (TWL-004b) is created before TWL-008

### Phase B: Runtime and Tooling Support

- `TASK-TWL-005 TentacleWars Campaign Loader`
  - requires TWL-002 done (schema) and TWL-003 done (namespace)
- `TASK-TWL-006 TentacleWars Campaign State Namespace`
  - **requires TWL-003 done** — do not start before progression namespace spec is closed
- `TASK-TWL-007 TentacleWars Campaign Sanity Suite`
  - bootstraps the executable sanity harness using fixture/sample data
  - schema tests from TWL-002 provide the validator; TWL-007 wires them into a runnable script
  - harness must work against fixture data before any authored level exists
- `TASK-TWL-016 TentacleWars Level Preview and Jump Tools`
- `TASK-TWL-017 TentacleWars Spreadsheet Balance Matrix`
  - moved from Phase G — balance scaffolding must exist before World 1 authoring begins
  - the table format must be created before TWL-008a; rows are filled phase by phase

### Phase C: World 1

- `TASK-TWL-008a TentacleWars World 1 Prototype`
  - scope: phases W1-01 to W1-05 only
  - goal: validate the full pipeline end-to-end (schema → sanity → smoke → playtest manual)
  - success criterion: one phase passes all four validation gates
  - do not proceed to TWL-008b until pipeline is confirmed working
- `TASK-TWL-008b TentacleWars World 1 Complete`
  - scope: phases W1-06 to W1-20
  - requires TWL-008a pipeline validated
- `TASK-TWL-009 TentacleWars World 1 Playtest and Reconstruction Review`

### Phase D: World 2

- `TASK-TWL-010 TentacleWars World 2 Authoring Pack`
- `TASK-TWL-011 TentacleWars World 2 Playtest and Reconstruction Review`

### Phase E: World 3

- `TASK-TWL-012 TentacleWars World 3 Authoring Pack`
- `TASK-TWL-013 TentacleWars World 3 Playtest and Reconstruction Review`

### Phase F: World 4

- `TASK-TWL-014 TentacleWars World 4 Authoring Pack`
- `TASK-TWL-015 TentacleWars World 4 Playtest and Reconstruction Review`

### Phase G: Polish Final

- `TASK-TWL-018 TentacleWars Phase Editor Feasibility Review`
  - TWL-017 was completed in Phase B and is not repeated here

## Project Management Recommendation

Do not open all content tasks at once in active execution.

Only one of these should be active at a time:

- one spec task
- or one runtime-support task
- or one world-authoring task

That will keep the validation trail clean and prevent the same world assumptions from being rewritten in multiple places.

## Current Conclusion

The next best step is:

- formalize the four pre-implementation specs

not:

- start authoring the 80 phases immediately

The skeleton is now strong enough to guide those specs without premature implementation drift.
