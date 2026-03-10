# Tutorial State Machine Review — 2026-03-10

## Outcome

The tutorial state machine does **not** need a broad extraction yet.

## Why

The current rigid gating model is now stable and protected by:

- smoke checks
- UI sanity checks
- gameplay runtime checks

The remaining complexity in `Tutorial.js` is concentrated in:

- action gating
- ghost guidance
- step completion detection

Those concerns are related, and separating them prematurely would increase
cross-file coordination without reducing risk enough yet.

## Recommended seam for the next extraction

If tutorial complexity grows again, the next safe extraction seam is:

- `tutorialStepRules.js`

That future module should own:

- `allowsClickIntent(...)`
- `canStartDragConnect(...)`
- `filterDragConnectTarget(...)`
- `canStartSlice()`
- `filterSliceCuts(...)`

The `Tutorial` class should keep:

- step progression
- ghost animation
- DOM/UI binding

## Decision

- `TASK-035` is complete as a review task
- no gameplay refactor is required immediately
- revisit extraction only if tutorial rule count grows meaningfully
