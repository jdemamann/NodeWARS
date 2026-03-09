# NodeWARS Codex Tasks V2 Review

Date: March 9, 2026

Source reviewed:
- [nodewars_codex_tasks_v2.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/nodewars_codex_tasks_v2.md)

Scope of this review:
- verify whether each task still makes sense in the current codebase
- identify what is already implemented, partially implemented, or still missing
- assess expected value and regression risk against the current stabilized mechanics
- produce an execution plan before any implementation work

This review does not modify gameplay code. It is a planning and validation document only.

## Executive Summary

The V2 task list is still relevant.

None of the six tasks should be discarded outright. The document is materially aligned with the current codebase and focuses on the right surfaces:
- input consistency
- timing correctness
- hot-path allocation
- stale async state
- developer ergonomics
- lifecycle hygiene

The three highest-value tasks remain the same as the original document suggests:
1. canonicalize touch-promoted slice initialization
2. remove wall-clock timing from tap/slice input flow
3. eliminate per-point slice-path array reallocation

Those three tasks all touch the same gesture subsystem and still belong in one coherent wave.

The remaining three tasks also make sense:
- stale tutorial defeat timers are still a real risk
- `package.json` still underexposes existing validation scripts
- global input bindings still have no teardown path

## Current Code Reality

The project has evolved substantially since the earlier task review, but these specific areas are still not fully closed:

- touch-promoted slice still manually recreates part of the slice init flow in [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js)
- touch tap timing still uses `Date.now()` in [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) and [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js)
- slice-path append still reallocates the whole array on each point in [InputState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/InputState.js)
- tutorial defeat still uses a raw delayed reload in [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)
- `package.json` is still minimal and exposes no validation scripts
- `bindGameInputEvents(...)` still does not return an unbind/dispose function

So the V2 task list is not stale. It is still actionable.

## Review Method

I reviewed:
- the task document itself
- the current input path
- relevant gesture helpers
- tutorial defeat flow
- package metadata
- binding lifecycle points

Primary code checked:
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)
- [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js)
- [InputState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/InputState.js)
- [package.json](/home/jonis/.claude/projects/nodewars-v2-codex/package.json)

## Task-by-Task Review

### Task 1 — Canonicalize touch-promoted slice initialization

Status: `APPROVED`

Current relevance: `high`

Current implementation state:
- not implemented
- still materially needed

Evidence:
- in [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js), touch promotion still manually does:
  - `game.slicing = true`
  - `game.slicePath = createSlicePathStart(...)`
  - `game._extendSlice(...)`
- the code does not route this path through [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) `_beginSlice(...)`

Why it still matters:
- `_beginSlice(...)` is clearly the canonical entry point for mouse slice
- manual setup increases risk of drift in:
  - frenzy bookkeeping
  - tutorial gating
  - button metadata
  - future cleanup logic

Risk if left alone:
- touch slice can subtly diverge from mouse slice over time
- future fixes to `_beginSlice(...)` will not automatically apply to touch promotion

Implementation value:
- high
- localized
- low behavior risk if done carefully

Recommended action:
- implement exactly as described in the task document

Priority assessment: `HIGH`

---

### Task 2 — Remove wall-clock timing from tap/slice input flow

Status: `APPROVED`

Current relevance: `high`

Current implementation state:
- not implemented

Evidence:
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) still uses `Date.now()` when creating tap candidates
- [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js) still uses `Date.now()` on `touchend` for tap duration evaluation

Why it still matters:
- the rest of the project already moved many visuals and mechanics away from wall-clock drift
- `Date.now()` remains a weak point around:
  - pause
  - tab switching
  - visibility changes
  - deterministic reasoning

What makes sense now:
- use one consistent monotonic timing source
- the best fit is still:
  - `performance.now()` for gesture timing, or
  - a dedicated monotonic input timer

Recommendation on approach:
- `performance.now()` is the cleanest choice for gestures
- it keeps gesture timing independent from simulation pacing
- it avoids coupling tap recognition to paused game time unless there is a deliberate product reason to freeze gestures during pause

Risk if left alone:
- subtle interaction edge cases
- continued timing inconsistency inside the input subsystem

Implementation value:
- high
- low surface area
- should be paired with Task 1

Priority assessment: `HIGH`

---

### Task 3 — Eliminate per-point slice-path array reallocation in hot path

Status: `APPROVED`

Current relevance: `high`

Current implementation state:
- not implemented

Evidence:
- [InputState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/InputState.js) still does:
  - `return [...slicePath, { x: screenX, y: screenY }];`

Why it still matters:
- slice path is a hot path
- this reallocation happens every move event during slicing
- on mobile, this is exactly the kind of thing that causes micro-GC and responsiveness degradation

Current compatibility assessment:
- current readers of `slicePath` treat it as mutable game-owned state
- there is no strong evidence that path immutability is required

Best implementation shape:
- mutate with `push(...)`
- keep API simple
- avoid overengineering with buffer abstractions

Risk if left alone:
- continued unnecessary allocation pressure during slicing
- poorer behavior on lower-end mobile devices

Implementation value:
- high
- low conceptual risk
- should be implemented in the same input wave as Tasks 1 and 2

Priority assessment: `HIGH`

---

### Task 4 — Prevent stale delayed tutorial defeat reload callbacks

Status: `APPROVED`

Current relevance: `medium-high`

Current implementation state:
- not implemented

Evidence:
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) still contains:
  - `setTimeout(() => { SFX.lose(); this.loadLevel(STATE.curLvl); }, 1500);`

Why it still matters:
- tutorial flow has already been hardened in many other ways
- leaving this stale delayed callback path unguarded keeps an intermittent class of bugs alive
- this is especially relevant because tutorial/menu transitions are already special-case heavy

Likely failure modes:
- delayed reload after leaving tutorial
- delayed reload after switching phases quickly
- stray reload after state transition

Best implementation shape:
- store timeout id on `Game`
- clear it in `loadLevel(...)`
- optionally guard callback with a level or generation token

Risk if left alone:
- intermittent state jumps
- hard-to-reproduce UX bugs

Implementation value:
- medium-high
- focused and worthwhile

Priority assessment: `MEDIUM`

---

### Task 5 — Improve package.json developer scripts

Status: `APPROVED`

Current relevance: `medium`

Current implementation state:
- not implemented

Evidence:
- [package.json](/home/jonis/.claude/projects/nodewars-v2-codex/package.json) still only declares:
  - `"type": "module"`

Why it still matters:
- the repo now depends heavily on guardrails:
  - smoke checks
  - campaign sanity
  - soak
- not exposing those as scripts slows local verification and onboarding

Recommended scripts:
- `smoke`
- `campaign-sanity`
- `soak`
- `check`

Risk if left alone:
- low gameplay risk
- moderate workflow friction

Implementation value:
- medium
- trivial code risk
- good contributor ergonomics

Priority assessment: `MEDIUM`

---

### Task 6 — Add teardown/unbind support for global input listeners

Status: `APPROVED`

Current relevance: `medium`

Current implementation state:
- not implemented

Evidence:
- [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js) registers listeners on:
  - `canvas`
  - `window`
  - `document`
- it does not return an unbind/dispose function
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) just calls `bindGameInputEvents(this);`

Why it still matters:
- today the game is effectively singleton-style, so this is not a visible runtime bug
- but it is still lifecycle debt
- it becomes relevant for:
  - hot reload
  - reinits
  - embedding
  - future app-shell work

Best implementation shape:
- return `dispose()` from `bindGameInputEvents(...)`
- store it on the `Game` instance
- add a small destroy/cleanup path or at least make the binder teardown-capable

Risk if left alone:
- medium structural debt
- potential duplicate bindings in future boot flows

Implementation value:
- medium
- low gameplay risk

Priority assessment: `MEDIUM`

## Classification Summary

### High Priority
- Task 1 — Canonicalize touch-promoted slice initialization
- Task 2 — Remove wall-clock timing from tap/slice input flow
- Task 3 — Eliminate per-point slice-path array reallocation in hot path

### Medium Priority
- Task 4 — Prevent stale delayed tutorial defeat reload callbacks
- Task 5 — Improve package.json developer scripts
- Task 6 — Add teardown/unbind support for global input listeners

### Low Priority
- none

The document is notably well-targeted. None of the tasks should be dropped outright.

## Recommended Execution Plan

### Wave A — Input Consistency and Hot Path

Includes:
- Task 1
- Task 2
- Task 3

Reason:
- same subsystem
- shared regression surface
- best handled together

Expected difficulty: `medium`

Risk profile:
- moderate regression risk if done sloppily
- low regression risk if kept localized and validated immediately

Suggested implementation order:
1. route touch-promoted slice through canonical init
2. replace `Date.now()` with monotonic gesture timing
3. switch slice-path append to in-place mutation

Validation focus:
- mouse slice
- touch slice promotion
- tap vs drag thresholds
- tutorial slice gating
- frenzy bookkeeping

### Wave B — Stale Async Tutorial Flow

Includes:
- Task 4

Reason:
- isolated
- easy to validate
- worthwhile UX hardening

Expected difficulty: `low-to-medium`

Validation focus:
- lose tutorial then leave quickly
- restart during delayed defeat window
- switch phases or menu before timeout fires

### Wave C — Developer Ergonomics and Lifecycle Hygiene

Includes:
- Task 5
- Task 6

Reason:
- lower gameplay risk
- strong maintenance value

Expected difficulty:
- Task 5: `low`
- Task 6: `medium`

Validation focus:
- scripts run cleanly
- no listener duplication on rebind
- startup path remains unchanged

## Proposed Task Breakdown

### TASK-V2-01 — Touch Slice Canonical Entry

Goal:
- ensure touch-promoted slice enters via `_beginSlice(...)`

Files:
- [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js)
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)

Acceptance:
- no manual partial reconstruction of slice init remains in touch promotion path

### TASK-V2-02 — Monotonic Gesture Timing

Goal:
- remove `Date.now()` from tap/slice input flow

Files:
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)
- [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js)
- possibly [InputState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/InputState.js)

Acceptance:
- gesture timing uses one monotonic source consistently

### TASK-V2-03 — Slice Path Allocation Cleanup

Goal:
- stop reallocating the entire slice path on every append

Files:
- [InputState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/InputState.js)
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)

Acceptance:
- append is in-place
- no slice regressions

### TASK-V2-04 — Tutorial Defeat Timer Guard

Goal:
- prevent stale delayed reload from firing after context change

Files:
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)

Acceptance:
- delayed reload is cancellable or guarded

### TASK-V2-05 — Validation Scripts in package.json

Goal:
- expose check scripts through npm

Files:
- [package.json](/home/jonis/.claude/projects/nodewars-v2-codex/package.json)

Acceptance:
- `npm run smoke`
- `npm run campaign-sanity`
- `npm run soak`
- `npm run check`

### TASK-V2-06 — Input Binding Dispose Support

Goal:
- make global input listener binding explicitly disposable

Files:
- [GameInputBinding.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/GameInputBinding.js)
- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)

Acceptance:
- binding utility returns cleanup
- current startup still works

## Final Recommendation

Proceed with implementation.

This is a good task set for the current state of the project because it:
- does not fight the existing stabilized architecture
- targets real weak points still present in code
- improves both gameplay robustness and engineering hygiene
- has a clear low-risk execution order

Recommended implementation order:
1. `TASK-V2-01`
2. `TASK-V2-02`
3. `TASK-V2-03`
4. `TASK-V2-04`
5. `TASK-V2-05`
6. `TASK-V2-06`

Recommended stop point after each wave:
- stop after Wave A and re-run all validation
- stop after Wave B and re-check tutorial flow
- stop after Wave C and re-check startup/binding behavior

## Decision Table

| Task | Recommendation | Criticality | Current status |
|---|---|---:|---|
| Task 1 | APPROVED | High | Not implemented |
| Task 2 | APPROVED | High | Not implemented |
| Task 3 | APPROVED | High | Not implemented |
| Task 4 | APPROVED | Medium | Not implemented |
| Task 5 | APPROVED | Medium | Not implemented |
| Task 6 | APPROVED | Medium | Not implemented |
