# AI Improvement Plan and Debug Phase Editor Study

## Purpose

This document evaluates two strategic product directions without changing implementation yet:

1. a deep AI improvement wave focused on making the enemy more dynamic, threatening, and expressive without breaking the current gameplay foundation
2. the feasibility of a debug-only visual phase editor for authored campaign work

The intent is to decide the next production wave with a clear view of cost, risk, value, and sequencing.

---

## Executive Summary

### AI

The AI is currently serviceable, but not yet strong enough to carry the full game fantasy.

The main issue is not that the AI is broken. The issue is that it is still too readable in a flat way:

- it expands and attacks
- it supports allies better than before
- it coordinates red and purple better than before
- it uses relay infrastructure better than before

But it still does not create enough tactical drama.

The largest missing ingredient is exactly what the user identified:

- slice is one of the core high-expression mechanics of the game
- the enemy barely uses it in a way that changes the match rhythm

This makes the game feel more linear than it should.

### Debug phase editor

Yes, a debug-only visual phase editor is viable.

It is not a low-effort feature, but it is very realistic in the current codebase because the project already has:

- fixed authored layouts
- debug mode
- level metadata in config
- a canvas-based runtime that already knows how to place nodes, hazards, pulsars, relays, and special nodes

The right approach is not a full generic map editor first.
The right approach is an **authoring overlay for existing authored phases**.

That means:

- load an authored phase
- turn on debug edit mode
- move, add, remove, and retag authored elements
- export the resulting authored layout structure back into project-friendly data

That would be a major productivity gain for campaign tuning.

---

## Part I — AI Improvement Plan

## Current AI State

### What is already good

Recent waves improved the AI in meaningful ways:

- relay targets are now evaluated
- relays can be used as origins when they have real budget
- purple strategic cuts are frame-driven instead of tied only to think cadence
- coalition behavior between red and purple is coherent
- allied support and kill-confirm logic are better than before
- overcommit is reduced

This means the AI is no longer in "obviously broken prototype" territory.

### What still feels weak

The AI still lacks enough variation and tactical shape in live play:

- it does not create enough pressure swings
- it does not weaponize slice as a signature mechanic often enough
- it does not feel sufficiently adaptive to the player's board shape
- it can still look passive or merely numerical in difficult phases
- purple identity exists, but it is still narrower than it should be

The result is a game that can be technically stable while still feeling too monotone.

---

## Design Goal For The Next AI Wave

The goal should not be to make the AI "smarter" in a general abstract sense.

The goal should be to make the AI:

- more expressive
- more threatening
- more phase-aware
- more opportunistic
- more readable as intentional opposition

Without:

- turning it into a heavy planner
- making it unfair or hidden-information based
- breaking canonical shared mechanics

---

## Core AI Problems To Solve

### 1. Slice underuse

This is the largest gameplay-quality gap.

Current problem:

- slice is a core player-facing mechanic
- purple uses strategic cuts, but in a narrow and mostly hidden way
- the player does not experience the enemy as a real slice-capable opponent

Desired outcome:

- slice should become a meaningful enemy pressure mechanic
- especially purple should produce moments where the player must react to enemy cuts

### 2. Low tactical tempo variation

Current problem:

- the AI can still feel like steady throughput rather than shifting intent

Desired outcome:

- the AI should create recognizable tactical beats:
  - expansion window
  - pressure window
  - punish window
  - finish window

### 3. Weak board-shape reading

Current problem:

- the AI reacts to target value, but not enough to topology
- it still underreads:
  - exposed player branches
  - isolated high-value nodes
  - relay lanes that should be cut or amplified
  - conflict between player fronts

Desired outcome:

- the AI should punish player overextension and weak structure more directly

### 4. Purple identity still not broad enough

Current problem:

- purple has some distinct logic, but not enough to feel like a faction with a unique threat profile

Desired outcome:

- red feels like structural pressure
- purple feels like exploitation, opportunism, and lethality

---

## Recommended AI Workstreams

## AI Wave A — Tactical Slice Layer

### Goal

Make enemy slice behavior a real gameplay force.

### Scope

- expand purple slice behavior beyond the current narrow strategic-cut trigger
- evaluate slice opportunities based on:
  - charged lane value
  - target fragility
  - clash disruption value
  - player structural dependency on the lane

### Possible behaviors

- cut a charged lane to burst into a weak player node
- cut a lane to interrupt a favorable player clash
- cut to convert pressure before a player capture stabilizes
- cut to punish player overextension on a long lane

### Constraints

- all cuts must still route through the canonical shared slice path
- no owner-specific duplicate burst mechanics

### Value

Very high.

This is the highest-value AI upgrade available.

### Cost

Medium.

The difficulty is not code volume. The difficulty is keeping it readable and fair.

---

## AI Wave B — Tactical State Profiles

### Goal

Make the AI shift intent in recognizable ways.

### Scope

Add a small tactical state layer, still heuristic, not planner-heavy.

Suggested states:

- `expand`
- `pressure`
- `support`
- `finish`
- `recover`

### Triggers

- coalition board advantage
- player exposed key node
- allied node under heavy attack
- relay lane opportunity
- map phase progression

### Value

High.

This would make the AI feel more alive and less flat.

### Cost

Medium.

Needs discipline to avoid overcomplication.

---

## AI Wave C — Structure Reading

### Goal

Make the AI understand where the player is structurally weak.

### Scope

Improve scoring for:

- long unsupported player lanes
- thinly defended hub nodes
- isolated player expansions
- relays that enable multiple downstream attacks
- coalition finishing pressure on partially destabilized fronts

### Value

High.

This improves perceived enemy intelligence without needing deeper planning.

### Cost

Medium.

This likely extends the extracted scoring module cleanly.

---

## AI Wave D — Purple Faction Expansion

### Goal

Broaden purple's identity without giving it separate mechanics.

### Scope

Purple should become better at:

- opportunistic slice timing
- punishing weakened player fronts
- exploiting relay windows
- finishing low-energy nodes
- forcing tempo spikes

Red should remain better at:

- broad structural pressure
- support continuity
- reliable territorial expansion

### Value

High.

This improves faction readability and variety.

### Cost

Low to medium, if built on the extracted AI scoring structure.

---

## Suggested AI Tasks

These tasks are recommended for a future implementation wave.

### `TASK-037 Enemy Slice Pressure Wave`

Goal:

- make enemy slicing a real tactical mechanic, centered on purple first

Files likely involved:

- `src/systems/AI.js`
- `src/systems/AIScoring.js`
- `src/entities/Tent.js`
- `docs/implementation/ai-structure-notes.md`

Checks:

- `node scripts/smoke-checks.mjs`
- `node scripts/campaign-sanity.mjs`
- `node scripts/simulation-soak.mjs`

Priority:

- highest

---

### `TASK-038 AI Tactical State Profiles`

Goal:

- add a lightweight tactical state layer so AI shifts intent over time

Priority:

- high

---

### `TASK-039 AI Structural Weakness Scoring`

Goal:

- improve punishment of exposed player structure and high-value weak points

Priority:

- high

---

### `TASK-040 Purple Faction Identity Wave`

Goal:

- broaden purple personality into a clearly distinct live opponent

Priority:

- high

---

### `TASK-041 AI Playtest and Tuning Matrix`

Goal:

- capture observed AI failures and successes in a structured way per phase group

Priority:

- medium

---

## Recommended Execution Order For AI

1. `TASK-037 Enemy Slice Pressure Wave`
2. `TASK-039 AI Structural Weakness Scoring`
3. `TASK-040 Purple Faction Identity Wave`
4. `TASK-038 AI Tactical State Profiles`
5. `TASK-041 AI Playtest and Tuning Matrix`

This order extracts the biggest visible gameplay gains earliest.

---

## Part II — Debug Visual Phase Editor Study

## Question

Is it viable to add a visual debug-only phase editor so authored levels can be built and adjusted directly in the running game?

## Short answer

Yes.

But the right version is **not** a fully general editor first.

The right version is:

- a debug-only authored-layout editor
- scoped to the fixed campaign system that already exists

---

## Why It Is Viable In This Codebase

The project already has the right structural ingredients:

- authored fixed layouts in `src/levels/FixedCampaignLayouts.js`
- grouped level metadata in `src/config/gameConfig.js`
- debug-only UI surfaces in settings and menus
- screen/controller infrastructure that can expose editor UI
- canvas runtime with camera, selection, and node placement space

This means the editor does not need to invent a separate game representation.

It can work directly on the same authored layout model.

---

## Best Product Shape

The best version is a **phase authoring overlay**.

### Suggested model

- open an authored phase in debug
- toggle `Edit Layout`
- use overlay controls to:
  - select node
  - drag node
  - add node
  - remove node
  - change owner
  - change node type
  - set energy
  - toggle bunker / relay / signal traits
  - add / move hazards
  - add / move pulsars
- export back to a normalized layout object

This is much safer than trying to build a generic full-feature editor immediately.

---

## What The Editor Should Eventually Support

### Phase 1 — Minimal viable authored editor

- select existing layout objects
- move them
- edit owner, energy, type
- add/remove normal nodes
- add/remove hazards
- add/remove pulsars
- export JSON-like layout data

### Phase 2 — Authored gameplay controls

- set bunker flags
- relay/signal placement
- mirror or symmetry helpers
- snap/grid guides
- duplicate selected node
- layout validation panel

### Phase 3 — Production authoring tools

- import/export phase file
- save draft variants
- compare against live authored layout
- fast-play phase from editor state

---

## Technical Feasibility

### Strengths

- the current data format is simple
- the runtime already understands the authored entities
- debug mode already exists
- the UI layer already supports non-core screens and debug-only rows

### Main engineering challenge

The main cost is not rendering.

The main cost is:

- authoring UX
- export format discipline
- preventing editor-specific state from leaking into runtime gameplay

So this is viable, but it needs to be isolated cleanly.

---

## Recommended Architecture

### Editor data model

Use an explicit editor session object, not live mutation of level config objects.

Suggested shape:

- `selectedEntityId`
- `selectedEntityType`
- `draftLayout`
- `dirty`
- `tool`
- `snapMode`
- `validationMessages`

### Editor location

Suggested module group:

- `src/editor/`

Potential modules:

- `LayoutEditorSession.js`
- `LayoutEditorTools.js`
- `LayoutEditorOverlay.js`
- `LayoutEditorExport.js`
- `LayoutEditorValidation.js`

### Runtime boundary

The editor should produce a `draftLayout`, then hand that to the same layout-loading path already used by fixed authored phases.

That keeps the editor from becoming a second runtime.

---

## Risks

### Low risk

- moving nodes
- editing energy
- changing owner
- exporting layout fragments

### Medium risk

- adding special node traits cleanly
- overlay UX on top of an active game canvas
- keeping debug authoring from interfering with normal input

### Higher risk

- full save/import pipeline
- generalized editor that tries to support every future world mechanic immediately

This is why the first version should stay narrow and authored-layout focused.

---

## Recommended Debug Editor Rollout

### Phase A — Study and export contract

Before implementation:

- define the exact draft layout format
- define import/export boundaries
- define which authored entities are in scope

### Phase B — Node and hazard editing

First implementation:

- selection
- drag
- add/remove
- property edit
- export

### Phase C — Special authored tools

Then add:

- bunker/relay/signal traits
- mirror helpers
- validation panel

---

## Should This Become Tasks Now?

Not yet.

The right move now is:

- approve the direction
- keep it as a studied next wave
- only turn it into tasks when the team is ready to invest in authored-content tooling

That is why this section stays a study, not a task breakdown for implementation yet.

---

## Recommendation

### AI

Proceed with an AI quality wave soon.

The most valuable next move is to make the enemy use slice meaningfully and read structural weakness better.

### Debug phase editor

Proceed later, but keep it in the roadmap.

It is viable and strategically valuable.
It should be built as a debug-only authored-layout editor, not as a generic full editor from day one.

---

## Final Recommendation To Leadership

If only one direction is funded next:

- choose the AI wave first

Reason:

- it improves match quality immediately
- it affects every play session
- it increases challenge and replay value
- it uses the mechanics already built

If a second tooling wave is approved after that:

- build the debug authored-phase editor

Reason:

- it will accelerate campaign quality and future balance work significantly
- it turns authored content iteration into a production-strength workflow
