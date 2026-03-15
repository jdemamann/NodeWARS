# TentacleWars Campaign Task Definitions

## Purpose

This file is the authoritative definition for TASK-TWL-001 through TASK-TWL-018.

It exists to address seven concrete risks identified in the planning review of
2026-03-13. Specifically:

- each spec task has a clearly defined "blocking done" vs "informative" split
- explicit dependencies are declared so tasks cannot start out of order
- TWL-008 is split to validate the pipeline before committing full authoring
- TWL-004 must close the obstacle complexity decision before World 1 authoring
- win condition is owned by TWL-001 and only referenced downstream
- TWL-007 bootstraps the sanity harness against fixture data (schema validator from TWL-002)
- TWL-017 is Phase B tooling, not Phase G afterthought

---

## Definition of Done — Format

Each task below lists:

- **Blocking done**: the minimum output required before the next task can start
- **Informative**: useful but does not block the next task
- **Explicit dependencies**: must be fully done before this task opens

---

## Phase A — Pre-Implementation Design

---

### TASK-TWL-001 TentacleWars Campaign Product Spec

- Owner: `campaign-level-owner`
- Suggested Agent: `docs/agents/campaign-level-agent.md`
- Status: `completed`
- Output: `docs/tentaclewars/tw-campaign-product-spec.md`

**Goal:**
Define the canonical product shape of TentacleWars campaign in a single
authoritative document. Win condition, world names, product boundary, and
fidelity target must be resolved here — not re-decided in downstream specs.

**Blocking done** (TWL-002 cannot start until all of these are confirmed):

- [ ] TentacleWars campaign confirmed as separate campaign track from NodeWARS
- [ ] Win condition canonical definition:
  - is win "all hostile cells converted" only?
  - are neutral cells optional for win or required?
  - is there a timer-based fail condition?
- [ ] World count and provisional world names (4 worlds, names can be placeholders)
- [ ] Fidelity scope closed: "structural reconstruction, not pixel-perfect"
- [ ] Purple faction introduction timing: World 2, not World 1
- [ ] Progression model: independent from NodeWARS (own stars, own current-level, own namespace)
- [ ] Level authoring format: JS objects canonical, JSON export optional later

**Informative** (can be in progress when TWL-002 starts):

- Story copy per world
- Final world names
- In-game hint system design
- World-select UI art direction
- Answers to all 46 implementation questionnaire items

**Output document:** `docs/tentaclewars/tw-campaign-product-spec.md`

---

### TASK-TWL-002 TentacleWars Level Data Schema

- Owner: `campaign-level-owner`
- Suggested Agent: `docs/agents/campaign-level-agent.md`
- Status: `active`
- **Depends on:** TWL-001 blocking done ✓

**Goal:**
Define the JS object contract for a single authored TentacleWars level.
Schema tests must be written as part of this task — they define what "done" means.

**Blocking done** (TWL-005 and TWL-007 cannot start until all confirmed):

- [ ] All required fields defined and documented:
  - `id`, `world`, `phase`, `energyCap`
  - `cells` (positions, owner, initialEnergy)
  - `obstacles` (positions, shape descriptor)
  - `winCondition` (references TWL-001 definition, not re-defined here)
  - `par` (time for 3-star)
  - `introMechanicTags`
- [ ] Schema validation function exists and is importable
- [ ] At least one sample level object passes schema validation
- [ ] At least one invalid object is rejected with a descriptive error
- [ ] Schema tests committed to `scripts/` or `src/tentaclewars/`

**Informative:**

- JSON export format
- Visual editor compatibility hints
- Full migration guide for future format bumps

**Output document:** `docs/tentaclewars/tw-level-data-schema.md`
**Schema validator:** `src/tentaclewars/TwLevelSchema.js` (or equivalent)

---

### TASK-TWL-003 TentacleWars Progression and Score Spec

- Owner: `meta-progression-owner`
- Suggested Agent: `docs/agents/meta-progression-agent.md`
- Status: `planned`
- **Depends on:** TWL-001 blocking done

**Goal:**
Define progression namespace isolation and score/star model.
This task is an explicit blocker for TWL-005 and TWL-006.
TWL-007 depends on TWL-002 only.

**Blocking done** (TWL-005 and TWL-006 must wait; TWL-007 does not depend on this):

- [ ] TentacleWars GameState namespace isolated — no key collision with NodeWARS keys
- [ ] Key list enumerated: which keys live under which namespace prefix
- [ ] Stars/par model defined: how 1-star, 2-star, 3-star are awarded
- [ ] Unlock model: are stars required for progression or only mastery?
- [ ] Save/load behavior on namespace miss (fresh TW save does not corrupt NW save)
- [ ] Debug override behavior in TW campaign matches NW pattern (or diverges intentionally)

**Informative:**

- Cross-campaign "best of" aggregation UI
- Cloud save migration path

**Output document:** `docs/tentaclewars/tw-progression-score-spec.md`

---

### TASK-TWL-004 TentacleWars Obstacle Spec

- Owner: `campaign-level-owner`
- Suggested Agent: `docs/agents/campaign-level-agent.md`
- Status: `planned`
- **Depends on:** TWL-001 blocking done

**Goal:**
Define obstacle runtime requirements and close the complexity decision.
This decision gates whether World 1 authoring needs a runtime sub-task first.

**Blocking done** (must be resolved before TWL-008a opens):

- [ ] Complexity decision closed — one of:
  - **Option A**: static circles only, line-of-sight blocking, no composite shape
  - **Option B**: composite blobs, custom shape assembly, may require TWL-004b
- [ ] If Option B chosen: `TASK-TWL-004b Obstacle Runtime` is created and inserted before TWL-008a
- [ ] Obstacle fields for the level schema defined (feeds back into TWL-002 if schema not yet frozen)
- [ ] Rendering expectation documented (tentacles render behind? stop before intersection?)
- [ ] Static-only confirmed (no moving obstacles in scope for Worlds 1 or 2)

**Informative:**

- Future dynamic obstacle design
- Physics interaction with packets

**Output document:** `docs/tentaclewars/tw-obstacle-spec.md`

---

## Phase B — Runtime and Tooling

---

### TASK-TWL-005 TentacleWars Campaign Loader

- Owner: `gameplay-owner`
- Suggested Agent: `docs/agents/gameplay-systems-agent.md`
- Status: `planned`
- **Depends on:** TWL-002 blocking done AND TWL-003 blocking done

**Goal:**
Implement the loading path that reads authored TW level objects and initializes
the TentacleWars sandbox with the correct config.

**Blocking done:**

- [ ] A level object passes through the loader and initializes game state correctly
- [ ] Loader integration checks pass against schema-valid fixture data
- [ ] `smoke-checks` passes

---

### TASK-TWL-006 TentacleWars Campaign State Namespace

- Owner: `meta-progression-owner`
- Suggested Agent: `docs/agents/meta-progression-agent.md`
- Status: `planned`
- **Depends on:** TWL-003 blocking done (hard dependency — do not start early)

**Goal:**
Implement the progression/state namespace isolation defined in TWL-003.
A premature implementation before TWL-003 is done risks key collisions that
are hard to undo after save data exists.

**Blocking done:**

- [ ] All keys enumerated in TWL-003 are present under the correct namespace
- [ ] NodeWARS save round-trip is unaffected
- [ ] TW fresh-start does not corrupt NW save
- [ ] `game-state-progression-sanity` passes

---

### TASK-TWL-007 TentacleWars Campaign Sanity Suite

- Owner: `qa-owner`
- Suggested Agent: `docs/agents/qa-checks-agent.md`
- Status: `planned`
- **Depends on:** TWL-002 blocking done (core schema tests already written in TWL-002)
- Note: TWL-002 delivers the schema validator; TWL-007 wires it into an executable sanity
  script against fixture data. TWL-007 does not depend on authored levels existing.

**Goal:**
Bootstrap the TentacleWars campaign sanity harness on top of the schema-driven
tests from TWL-002. This task establishes the executable validation path that
later world-authoring tasks will extend with real authored content.

**Blocking done:**

- [ ] Fixture or sample TW campaign data passes schema validation through the sanity suite
- [ ] World numbering and level ordering checks exist and run against fixture data
- [ ] Mechanic-tag introduction checks exist and run against fixture data
- [ ] Loader/progression expectations can be asserted without depending on all 80 authored levels
- [ ] Sanity script runnable as `node scripts/tw-campaign-sanity.mjs`

**Informative:**

- full-world authored coverage
- late-world continuity assertions
- final 80-phase campaign regression coverage

---

### TASK-TWL-016 TentacleWars Level Preview and Jump Tools

- Owner: `qa-owner`
- Suggested Agent: `docs/agents/qa-checks-agent.md`
- Status: `planned`
- **Depends on:** TWL-005 blocking done

**Goal:**
Add debug commands to load a specific TW level by id and jump to a specific world
without replaying earlier levels.

**Blocking done:**

- [ ] `?twLevel=W1-03` or equivalent URL param or CLI flag loads that level
- [ ] World jump works in debug mode without completing prior levels

---

### TASK-TWL-017 TentacleWars Spreadsheet Balance Matrix

- Owner: `campaign-level-owner`
- Suggested Agent: `docs/agents/campaign-level-agent.md`
- Status: `planned`
- **Depends on:** TWL-002 blocking done (need schema to know what columns to track)
- **Must be completed before TWL-008a** — table format must exist before any level is authored

**Goal:**
Create the balance scaffolding spreadsheet (or JS/JSON equivalent) that tracks
per-level design parameters. Rows are filled phase by phase as World 1 is authored.
The format must exist first — not after authoring is done.

**Blocking done:**

- [ ] Column headers defined matching level schema: `id`, `world`, `phase`, `energyCap`, `par`, `introMechanicTags`, `obstacles`, `hostileCount`, `notes`
- [ ] Format is a JS export or CSV importable by a spreadsheet tool
- [ ] At least one sample row exists (can be W1-01 placeholder)
- [ ] Matrix location documented: `docs/tentaclewars/tw-balance-matrix.js` or equivalent

---

## Phase C — World 1

---

### TASK-TWL-008a TentacleWars World 1 Prototype

- Owner: `campaign-level-owner`
- Suggested Agent: `docs/agents/campaign-level-agent.md`
- Status: `planned`
- **Depends on:** TWL-005 done, TWL-006 done, TWL-007 done, TWL-016 done, TWL-017 done

**Goal:**
Author phases W1-01 through W1-05 only.
Primary goal is pipeline validation, not content polish.

**Success criterion (pipeline is validated when):**

- [ ] At least one phase passes: schema validation → campaign sanity → smoke check → manual playtest
- [ ] Level loads correctly via the loader (TWL-005)
- [ ] Balance matrix row is filled for each of W1-01..W1-05
- [ ] `tw-campaign-sanity` is extended from fixture data to the authored `W1-01..W1-05` subset
- [ ] No schema changes needed after authoring begins (if schema changes required, pause and update TWL-002)

**Do not proceed to TWL-008b until this criterion is confirmed.**

---

### TASK-TWL-008b TentacleWars World 1 Complete

- Owner: `campaign-level-owner`
- Suggested Agent: `docs/agents/campaign-level-agent.md`
- Status: `planned`
- **Depends on:** TWL-008a pipeline validated (explicit gate)

**Goal:**
Author phases W1-06 through W1-20.
By this point the pipeline is proven; focus shifts to content quality and curve.

**Blocking done:**

- [ ] All 15 phases authored and passing schema + sanity
- [ ] Balance matrix filled for W1-06..W1-20
- [ ] World 1 difficulty curve reviewed against skeleton target
- [ ] Obstacle introduction phases (W1-13..W1-16) validated with obstacle runtime
- [ ] `tw-campaign-sanity` now covers all World 1 authored phases, not only fixtures

---

### TASK-TWL-009 TentacleWars World 1 Playtest and Reconstruction Review

- Owner: `campaign-level-owner`
- Status: `planned`
- **Depends on:** TWL-008b done

**Goal:**
Playtest all 20 World 1 phases, record observations, and close reconstruction review.

**Blocking done:**

- [ ] All 20 phases manually playtested
- [ ] Par times reviewed and calibrated
- [ ] Reconstruction notes per phase (what matches source, what diverges, why)
- [ ] Known balance issues documented for future wave

---

## Phases D–F — Worlds 2, 3, 4

Tasks TWL-010 through TWL-015 follow the same structure as Phase C.
Each Authoring Pack must follow the same split discipline (prototype first) if
any schema or loader changes are expected. If pipeline is already stable from
World 1, a single task per world is acceptable.

---

## Phase G — Polish Final

---

### TASK-TWL-018 TentacleWars Phase Editor Feasibility Review

- Status: `planned`
- Note: TWL-017 was completed in Phase B. This task is a feasibility review only,
  not an implementation commitment.

**Goal:**
Assess whether a visual level editor is worth building after World 1 is complete.
Decision should be based on actual authoring friction observed during Worlds 1–2,
not speculation.

**Blocking done:**

- [ ] One-page feasibility assessment written
- [ ] Decision: build editor now / defer / skip

---

## Summary of Risk Resolutions

| Risk | Resolution applied |
|------|--------------------|
| No definition of done per spec | Blocking done lists added to every task |
| TWL-008 too large | Split into TWL-008a (W1-01..05) and TWL-008b (W1-06..20) |
| Implicit dependency TWL-003 → TWL-005/006 | Explicit "depends on" declarations in every runtime task |
| TWL-004 obstacle complexity unresolved | Must close Option A vs Option B before TWL-008a opens |
| Win condition fragmented across docs | Owned by TWL-001; TWL-002 and TWL-003 reference it only |
| TWL-007 too late to validate schema | Schema tests written during TWL-002; TWL-007 extends only |
| TWL-017 after authoring | Moved to Phase B; must exist before TWL-008a |
