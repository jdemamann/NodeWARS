# NodeWARS Codex Task Plan Review

Date: March 9, 2026

Source reviewed:

- `~/imgs/nodewars_codex_tasks.md`

Purpose:

- compare the task-plan document against the current codebase
- identify which tasks are already implemented, partially implemented, stale, or still high-value
- classify each task by current criticality
- provide a practical execution order aligned with the mechanics that exist today

This is a review document only. It does not propose code changes directly.

## Executive Summary

The task-plan document is still useful, but it is no longer fully current.

Since that plan was written, the project has already advanced substantially in:

- relay mechanics
- owner-3 palette and AI identity foundations
- tutorial flow
- documentation alignment
- render profile structure
- canonical burst/slice path
- world unlock flow
- project structure and naming

That means the document now falls into three buckets:

1. tasks that are still important and should likely be implemented
2. tasks that were already largely completed
3. tasks that still make sense but need to be reframed against the current architecture

The highest-value unresolved items are:

- `Task 4` immediate clash cost consistency
- `Task 5` purple strategic cut scheduling
- `Task 1` real `NodeRenderer` runtime bug
- `Task 7` AI relay-origin usage

The least urgent items are:

- `Task 3`, because it is already largely done
- `Task 9`, because it is mostly a determinism / polish improvement
- `Task 10`, because it depends on resolving the remaining behavior decisions first

## Review Method

The review compared each task against:

- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)
- [GameState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/GameState.js)
- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js)
- [GameNode.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/GameNode.js)
- [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js)
- [EnergyBudget.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/EnergyBudget.js)
- [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js)
- [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)
- the current implementation docs under [docs/implementation](/home/jonis/.claude/projects/nodewars-v2-codex/docs/implementation)

The judgment criteria were:

- correctness risk
- gameplay impact
- documentation drift
- architectural fit with the current codebase
- whether the task is already satisfied by the current implementation

## Task-by-Task Review

### Task 1 — Fix the `highGraphics` runtime bug in `NodeRenderer`

Current status:

- `NOT IMPLEMENTED`

Current criticality:

- `HIGH`

Why it still matters:

- this is a real correctness bug, not just cleanup
- the task-plan is still accurate here

Evidence:

- in [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js), `highGraphics` is defined in `draw(...)`
- but inside `_drawSpecial(...)`, the `NodeType.HAZARD` branch still references `highGraphics` without defining it in that function scope

Observed consequence:

- this can still throw a `ReferenceError` when that code path executes

Assessment:

- the task-plan is fully valid on this point
- this should be treated as an active bug

Recommendation:

- `APPROVED`
- implement soon

Suggested priority:

- top-tier, but still below the immediate clash-cost inconsistency because that affects core economic rules

---

### Task 2 — Remove duplicate layout finalization in `Game.loadLevel`

Current status:

- `NOT IMPLEMENTED`

Current criticality:

- `MODERATE`

Why it still matters:

- not a visible bug every time
- but it is still redundant and error-prone

Evidence:

- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) still calls `_finalizeLoadedLayout(cfg)` inside the `fixedLayout` branch
- and then calls `_finalizeLoadedLayout(cfg)` again after the layout branch block

Why that is risky:

- tutorial initialization may be repeated
- world banner / SFX logic may be triggered in ways that are only accidentally correct today
- future growth of `_finalizeLoadedLayout(...)` makes this worse

Assessment:

- the task-plan is still correct
- however, this is more of a structural correctness cleanup than a player-facing critical bug

Recommendation:

- `APPROVED`

Suggested priority:

- medium

---

### Task 3 — Align comments and docs with the actual energy model

Current status:

- `LARGELY IMPLEMENTED`

Current criticality:

- `LOW`

What has already been done:

- [energy-model.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/implementation/energy-model.md) already describes:
  - owned non-relay regen
  - relay non-generation
  - relay buffered forwarding
- [GameNode.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/GameNode.js) already explains the hybrid regen-budget model
- [gameConfig.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/config/gameConfig.js) already documents:
  - hybrid regeneration-budget model
  - `SELF_REGEN_FRACTION`
  - relay pass-through behavior
- [EnergyBudget.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/EnergyBudget.js) is already conceptually aligned

What remains:

- routine maintenance only
- no sign of a serious current mismatch here

Assessment:

- the original task made sense
- but it is now mostly historical

Recommendation:

- `ALREADY IMPLEMENTED`
- do not schedule as a standalone task unless new drift is found later

---

### Task 4 — Decide and implement the final rule for immediate clash cost

Current status:

- `NOT IMPLEMENTED`

Current criticality:

- `HIGH`

Why it still matters:

- this remains one of the most important systemic inconsistencies in the codebase

Evidence:

- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js): `activateImmediate()` still charges only `computeBuildCost(this.distance)`
- build preview and normal move validation still reason about the full build cost
- AI scoring also still reasons about the full build cost

Current inconsistency:

- affordance says “this move costs full amount”
- actual debit in the immediate-clash fast path is lower

Why that matters:

- player expectation is wrong
- economic clarity is reduced
- player and AI both live in a mixed model
- this complicates balance tuning of reactive counters

Assessment:

- the task-plan remains fully valid
- this is still one of the most valuable unresolved design tasks

Recommendation:

- `APPROVED`

Recommended design choice:

- keep the document’s recommendation: `Option A`
- immediate clash should pay full build cost
- only the visual growth phase should be skipped

Why `Option A` still fits the current codebase best:

- the codebase already moved strongly toward canonical/shared rules
- full-cost immediate clash matches that direction
- it reduces hidden exceptions

Suggested priority:

- highest

---

### Task 5 — Refine the purple AI strategic cut scheduling

Current status:

- `NOT IMPLEMENTED`

Current criticality:

- `HIGH`

Evidence:

- [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js): `update(dt)` returns early if `_timer < _interval`
- `_checkStrategicCuts(game)` still runs only after that gate

Why it matters:

- the code comments imply a more responsive purple AI
- the actual runtime behavior is slower and less threatening than intended

Current state of owner 3:

- the cut ratio is now correct and canonical
- the burst path is shared correctly with the player
- the faction identity exists

What is still missing:

- scheduling consistency

Assessment:

- this is a live inconsistency
- it directly affects how distinct and responsive owner 3 feels

Recommendation:

- `APPROVED`

Suggested priority:

- same wave as `Task 4`

---

### Task 6 — Revisit the purple AI design, not just the scheduling

Current status:

- `PARTIALLY IMPLEMENTED`

Current criticality:

- `MODERATE`

What is already true now:

- owner 3 has its own personality object
- owner 3 is more aggressive than red AI
- owner 3 uses the canonical strategic burst cut path
- owner 3 can participate in relay-oriented play better than before

What is still limited:

- macro target preference is still mostly a scoring extension of the same model
- owner 3 does not yet feel fully distinct as a faction across all decisions

What still makes sense from the original task:

- stronger player-focus
- better kill-confirm behavior
- less passive reinforcement bias
- clearer pressure identity

What no longer makes sense as originally framed:

- treating this as a near-term bug-fix
- it is now more of a design iteration task

Assessment:

- still valuable
- but should be reframed as a later AI behavior wave, not a critical fix

Recommendation:

- `REPLAN`

Suggested priority:

- after `Task 5`

---

### Task 7 — Allow AI to actually use relays as origins when appropriate

Current status:

- `NOT IMPLEMENTED`

Current criticality:

- `MODERATE`

What has already been done:

- AI can now evaluate relay targets
- relay scoring exists

What is still missing:

- [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js) still excludes relays from `sourceNodes`
- so relay control is still underused structurally

Why it matters:

- it weakens World 3 depth
- it reduces the payoff of relay capture for AI
- it makes relay contesting less meaningful than it should be

Assessment:

- the task-plan is still valid
- it would still create visible gameplay gains

Recommendation:

- `APPROVED`

Suggested constraints remain good:

- allow relay-origin only with usable buffered budget
- keep it tactically focused
- do not create relay spam

Suggested priority:

- medium-high

---

### Task 8 — Improve UX for invalid player actions

Current status:

- `NOT IMPLEMENTED`

Current criticality:

- `MODERATE`

Evidence:

- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js): invalid action branches still call `this.clearSel()` after:
  - `cantReverse`
  - `no_free_slots`
  - `insufficient_energy`

Why it matters:

- this hurts retry speed
- it increases friction under pressure
- it is especially noticeable on touch / smaller screens

Assessment:

- still valid
- meaningful UX improvement with low systemic risk

Recommendation:

- `APPROVED`

Suggested priority:

- medium

---

### Task 9 — Reduce `Date.now()` dependence in simulation-adjacent visuals

Current status:

- `NOT IMPLEMENTED`

Current criticality:

- `LOW`

Evidence:

- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js) still uses `Date.now()` for:
  - control-point oscillation
  - clash spark timing
- [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js) still uses `Date.now()` in visual oscillations
- input timing also still uses wall-clock where appropriate

Why it matters:

- determinism
- reproducibility
- more test-friendly visuals

Why it is not urgent:

- it does not currently look like a gameplay bug
- it is primarily polish and technical quality

Assessment:

- the task-plan is still reasonable
- but it should not outrank gameplay/system consistency work

Recommendation:

- `APPROVED LATER`

Suggested priority:

- low

---

### Task 10 — Update comments for purple AI and clash cost after implementation

Current status:

- `PARTIALLY IMPLEMENTED / BLOCKED BY OPEN DECISIONS`

Current criticality:

- `LOW`

What is already aligned:

- several core gameplay comments were updated in previous passes
- owner-3 burst commentary is much closer to runtime reality now

What still depends on future work:

- immediate clash cost rule is not yet finalized
- purple scheduling is still inconsistent with the intended design

Assessment:

- still necessary
- but only after tasks `4`, `5`, and any expanded `6` work are settled

Recommendation:

- `DEFER`

Suggested priority:

- final cleanup wave only

## Consolidated Status Matrix

### Approved and Still High-Value

- `Task 1`
- `Task 2`
- `Task 4`
- `Task 5`
- `Task 7`
- `Task 8`
- `Task 9`

### Already Implemented or Largely Satisfied

- `Task 3`

### Replan / Reframe

- `Task 6`

### Defer Until Behavior Decisions Are Closed

- `Task 10`

## Criticality Summary

### High

- `Task 1` — real runtime bug in `NodeRenderer`
- `Task 4` — immediate clash cost inconsistency
- `Task 5` — purple strategic cut scheduling inconsistency

### Moderate

- `Task 2` — duplicate level finalization
- `Task 6` — purple faction differentiation wave
- `Task 7` — AI relay-origin usage
- `Task 8` — invalid-action UX

### Low

- `Task 3` — mostly already done
- `Task 9` — determinism / visual timing cleanup
- `Task 10` — dependent final comment/doc pass

## Recommended Execution Order Now

1. `Task 4` — immediate clash cost
2. `Task 5` — purple strategic cut scheduling
3. `Task 1` — `NodeRenderer` runtime bug
4. `Task 2` — duplicate finalization in `loadLevel`
5. `Task 7` — AI relay-origin support
6. `Task 8` — invalid-action UX
7. `Task 6` — purple faction differentiation wave
8. `Task 9` — `Date.now()` reduction
9. `Task 10` — final comments/docs cleanup

## Why This Order Makes Sense

### First Wave — Correctness and Systemic Consistency

- `Task 4`
- `Task 5`
- `Task 1`

This wave removes the most important rule and runtime inconsistencies.

### Second Wave — Structural and UX Gains

- `Task 2`
- `Task 7`
- `Task 8`

This wave improves maintainability, World 3 depth, and player interaction quality.

### Third Wave — Distinction and Polish

- `Task 6`
- `Task 9`
- `Task 10`

This wave is for identity and finish, not urgent system repair.

## Final Recommendation

The original document should not be discarded.

It is still directionally strong.

But it should now be treated as:

- a partially historical task plan
- with several still-valid items
- and several tasks that need to be reclassified based on the much more mature current codebase

If this plan is used as the next implementation source of truth, it should be updated to explicitly mark:

- `Task 3` as largely completed
- `Task 6` as a replan/design wave
- `Task 10` as dependent cleanup

The best immediate implementation targets remain:

- immediate clash cost consistency
- purple strategic cut scheduling
- the `NodeRenderer` `highGraphics` bug

