# TentacleWars Campaign Product Spec

## Status

`TASK-TWL-001` — **DONE**

All blocking fields resolved. TWL-002 is open.
Informative fields are in progress and do not block TWL-002.

---

## Resolved Decisions (Blocking)

These are closed and must not be re-opened without an explicit decision record.

### Product Shape

TentacleWars campaign is a **separate campaign track** from NodeWARS.

- NodeWARS campaign remains fully intact and unchanged
- both campaigns coexist in the same product
- no shared authoring of levels between the two tracks

Provisional implementation note:

- campaign-entry UI flow is still open
- main-menu selection is a likely direction, but not part of the blocking closure for TWL-001

### Win Condition

**Canonical definition** (referenced by TWL-002 and TWL-003 — not redefined there):

- Win is declared when all hostile-owned cells have been converted to player ownership
- Neutral cells are **optional** for win — capturing them may improve score but is not required
- There is no timer-based fail condition (the player can take as long as needed)
- 3-star timing is scored against a per-level `par` value but does not gate progression

### Worlds

- 4 worlds total
- 20 phases per world
- total target: 80 phases
- architect for 80, implement World 1 first

Provisional world names (subject to change — do not treat as final):

| World | Provisional Name | Theme |
|-------|-----------------|-------|
| 1 | Introduction | Onboarding, low-cap, readable layouts |
| 2 | Purple Menace | Purple faction enters, contested centers |
| 3 | Labyrinth | Heavy obstacle routing, dense overlaps |
| 4 | Endgame | Maximum pressure, mastery closure |

### Fidelity Scope

Target: **structural reconstruction, not pixel-perfect reproduction**

Preserve in order of priority:
1. mechanic introduction order
2. world difficulty curve
3. faction introduction timing
4. energy-cap pacing philosophy
5. obstacle density ramp
6. representative structural layouts

Do not promise exact original cell coordinates unless verified from authoritative source.

### Purple Faction Introduction

- Purple appears **in World 2**, not World 1
- World 1 contains only the player (green) and red hostile faction
- Purple may appear as a visual preview in World 1's final phase at most, but does
  not introduce its full behavior until World 2

### Progression Model

TentacleWars campaign uses an **independent progression namespace**:

- own current level pointer
- own per-level completion flags
- own per-level star counts
- own fail streak counter (if applicable)
- no shared keys with NodeWARS GameState
- key prefix: `tw_` or equivalent namespace prefix (exact prefix defined in TWL-003)

Unlock rules are fully separate from NodeWARS.

### Level Authoring Format

Canonical format: **JS objects**

- one file per world (e.g., `src/tentaclewars/levels/TwWorld1.js`)
- matches existing pattern in `src/levels/FixedCampaignLayouts.js`
- JSON export is optional and can be added later for tooling compatibility
- do not depend on a visual level editor for World 1 authoring

---

## Informative Fields (In Progress)

These do not block TWL-002.

### Story Copy

Per-world narrative text is not yet defined. Story copy will be authored once
World 1 authoring is underway. It does not need to exist before the schema
or runtime are implemented.

### World-Select UI

Art direction for the TentacleWars world-select screen is deferred.
Shared UI shells from NodeWARS may be reused initially.

### In-Game Hint System

Current recommendation only:

- do not require a dedicated scripted per-mechanic hint system for World 1 up front
- prefer teaching through authored tutorial phases and layout first
- reopen only if World 1 playtests show clarity failure

### 46-Question Questionnaire

The implementation questionnaire in `tentaclewars-level-implementation-plan-2026-03-13.md`
is the full design scope. The blocking fields above represent the minimum required
subset. Remaining questions will be closed as implementation proceeds.

---

## What This Document Does Not Define

- Level data schema fields → TWL-002
- Star/par calculation rules → TWL-003
- Obstacle runtime complexity → TWL-004
- Progression namespace key list → TWL-003

These documents reference this spec for the win condition and product shape.
They do not re-define those decisions.

---

## TASK-TWL-001 Completion Checklist

- [x] TW campaign confirmed separate track
- [x] Win condition canonical definition written
- [x] World count and provisional names established
- [x] Fidelity scope closed
- [x] Purple introduction timing set (World 2)
- [x] Progression model: independent namespace
- [x] Level authoring format: JS objects

**TASK-TWL-001 blocking done. TWL-002 may begin.**
