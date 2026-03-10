# Red/Purple Alliance Review

Date: March 10, 2026

## Objective

Review whether owners `2` (red AI) and `3` (purple AI) currently behave as allies or enemies, identify the exact code surfaces involved, and propose a safe implementation plan to make them act as partners against the player.

This is a report only. No gameplay code is changed in this step.

## Executive Summary

The current codebase does **not** model red and purple as allies.

At the gameplay-core level, owners `2` and `3` are treated as different factions, which means:
- they can attack each other
- they can capture each other's cells
- they are counted as separate hostile ownerships in combat logic
- their tentacles clash as opponents
- ownership-change cleanup retracts links between them

So your observation is correct: this is not just an AI-targeting issue. It is a broader faction-model issue.

If the design goal is:
- player = faction A
- red + purple = faction B with two personalities

then the current implementation needs a **team/faction layer**, not just a few AI exceptions.

## Current Reality

### What is correct today

Purple already differs from red in behavior:
- purple has its own AI personality in [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js)
- purple runs strategic cuts every update tick
- purple is more kill-confirm / pressure oriented
- purple has distinct visual palette and campaign presence

So the project already has the idea of “two enemy subtypes”.

### What is wrong today

The simulation still treats `owner === 2` and `owner === 3` as hostile to each other because most core rules compare direct owner equality instead of team allegiance.

That is why purple and red fight.

## Where The Problem Exists

### 1. Tentacle payload logic

In [TentCombat.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/TentCombat.js):

- friendly transfer only happens when:
  - `targetNode.owner === sourceNode.owner`
- otherwise:
  - neutral path
  - enemy damage path

This means:
- red -> purple is treated as enemy attack
- purple -> red is treated as enemy attack

This is one of the primary root causes.

### 2. Tentacle active flow branching

In [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js):

- active flow also branches on direct owner equality
- anything not equal is treated as opposition unless neutral

So the lane-level behavior is built on “same owner” rather than “same team”.

### 3. Clash logic

Fresh clashes and force resolution happen between opposing tentacles based on effective source/target ownership and lane opposition.

Because red and purple are not considered allied, their lanes can oppose and clash.

Files involved:
- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js)
- [TentCombat.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/TentCombat.js)
- [TentacleCommands.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/TentacleCommands.js)

### 4. Ownership change cleanup

In [Ownership.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/Ownership.js):

- invalid tentacles are retracted when:
  - `effectiveTargetNode.owner !== newOwner`
  - `effectiveSourceNode.owner !== newOwner`

Again, this is strict owner equality, not alliance logic.

So if red captures something while purple is linked to it, those links are treated as invalid.

### 5. AI target scoring

In [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js):

- red and purple both score any `targetNode.owner === 1` as player hostile
- same-owner targets are treated as friendly
- but “other AI owner” is not modeled as an ally class

So purple does not have an explicit red-allied worldview, and red does not have an explicit purple-allied worldview.

Even if some branches happen not to select those targets often, the core model is still wrong.

### 6. UI and game-state summaries

Several UI surfaces currently aggregate enemies as:
- `owner !== 0 && owner !== 1`

This is not itself wrong if both red and purple are on the same hostile team against the player.

But some labels still imply separate hostile factions rather than one coalition with two personalities.

Relevant files:
- [HUD.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/HUD.js)
- [UIRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/UIRenderer.js)
- [resultScreenView.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/resultScreenView.js)

These are secondary concerns. The core issue is not UI wording; it is the ownership/combat model.

## Recommended Design Direction

## Design choice that makes the most sense

Treat red and purple as:
- one hostile coalition against the player
- two different AI personalities on the same team

That means:
- they should not attack each other
- they should not capture each other
- they should be able to reinforce each other
- they should treat each other's tentacles as friendly, not opposing
- victory logic can still count both as hostile team members against the player

This gives you:
- the same dramatic “two enemy styles” feel
- no nonsense infighting
- cleaner late-game pressure

## Best technical model

Do **not** solve this by sprinkling special cases like:
- `owner === 2 && target.owner === 3`
- `owner === 3 && target.owner === 2`

That would become brittle immediately.

Instead, add a canonical faction/team helper layer, for example:
- `getTeamId(owner)`
- `areAlliedOwners(a, b)`
- `isHostilePair(a, b)`

Likely mapping:
- owner `0` -> neutral team
- owner `1` -> player team
- owner `2` -> enemy coalition team
- owner `3` -> enemy coalition team

This is the right abstraction.

## What should change

### High-priority core changes

#### A. Combat / payload routing

Update all “friendly vs enemy” branches to use alliance/team logic instead of strict owner equality.

This includes:
- friendly transfer
- neutral capture
- enemy damage
- clash detection

Primary files:
- [TentCombat.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/TentCombat.js)
- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js)

#### B. Ownership cleanup

Update invalid-link cleanup to keep allied links valid after ownership changes.

Primary file:
- [Ownership.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/Ownership.js)

#### C. AI target legality and scoring

Make both red and purple treat the other as allied.

That means:
- do not attack the other enemy subtype
- allow support/reinforcement behavior
- preserve purple’s distinct personality, but against the player

Primary file:
- [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js)

### Medium-priority supporting changes

#### D. Command/path helpers

Any helper that currently assumes “friendly == same owner” should move to alliance logic.

Likely file:
- [TentacleCommands.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/TentacleCommands.js)

#### E. UI language and metrics

Keep the player-facing summary coherent:
- “hostile starts” can still aggregate both
- but labels that imply red/purple are separate enemy sides may need review

Likely files:
- [HUD.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/HUD.js)
- [UIRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/UIRenderer.js)
- [resultScreenView.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/resultScreenView.js)

### Low-priority polish

#### F. Event semantics

Some event names like:
- `cell:killed_enemy`
- `cell:lost`

may still be good enough, but if they are used with owner-specific assumptions, review them.

Likely files:
- [Ownership.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/Ownership.js)
- [main.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/main.js)

## Recommended Task Plan

### TASK-RP-01 — Add canonical owner-alliance helpers

Goal:
- introduce canonical helpers for team/faction relationship

Suggested shape:
- `getOwnerTeamId(ownerId)`
- `areAlliedOwners(ownerA, ownerB)`
- `areHostileOwners(ownerA, ownerB)`

Expected difficulty: `low`

Risk: `low`

### TASK-RP-02 — Switch tentacle combat routing to alliance logic

Goal:
- make red and purple reinforce instead of attack each other

Files:
- [TentCombat.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/TentCombat.js)
- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js)

Expected difficulty: `medium`

Risk: `high`

Reason:
- this is the real gameplay-core change

### TASK-RP-03 — Switch clash/opposition checks to alliance logic

Goal:
- allied enemy tentacles should not clash

Files:
- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js)
- possibly [TentacleCommands.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/input/TentacleCommands.js)

Expected difficulty: `medium`

Risk: `high`

### TASK-RP-04 — Preserve allied links on ownership changes

Goal:
- red/purple links remain valid after allied captures

Files:
- [Ownership.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/Ownership.js)

Expected difficulty: `low-to-medium`

Risk: `medium`

### TASK-RP-05 — Update AI target legality/scoring for enemy coalition

Goal:
- red and purple stop considering each other valid hostile targets
- preserve purple’s identity as a more aggressive member of the same coalition

Files:
- [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js)

Expected difficulty: `medium`

Risk: `medium`

### TASK-RP-06 — UI/telemetry coherence pass

Goal:
- ensure summaries still read correctly after alliance model changes

Files:
- [HUD.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/HUD.js)
- [UIRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/UIRenderer.js)
- [resultScreenView.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/resultScreenView.js)

Expected difficulty: `low`

Risk: `low`

### TASK-RP-07 — Regression checks for allied red/purple behavior

Goal:
- add smoke checks for:
  - no red↔purple direct damage
  - no red↔purple clash
  - no red↔purple invalid-link retract on allied ownership change
  - AI does not select the allied subtype as hostile target

Expected difficulty: `low`

Risk: `low`

## Criticality by Task

### High
- `TASK-RP-02`
- `TASK-RP-03`
- `TASK-RP-05`

### Medium
- `TASK-RP-01`
- `TASK-RP-04`
- `TASK-RP-07`

### Low
- `TASK-RP-06`

## Recommended Execution Order

1. `TASK-RP-01`
2. `TASK-RP-02`
3. `TASK-RP-03`
4. `TASK-RP-04`
5. `TASK-RP-05`
6. `TASK-RP-07`
7. `TASK-RP-06`

This order reduces risk because:
- the canonical alliance helper lands first
- combat logic and clash logic move together
- AI is updated after the simulation can actually support the alliance
- UI cleanup comes last

## Product Considerations

This change will likely improve the game in the following ways:
- late-game phases with purple feel more coherent
- pressure on the player becomes more intentional
- purple stops wasting power fighting red
- World 3 reads more like “enemy coalition with two personalities”

Potential side effects:
- some later phases may become harder because enemy pressure stops self-canceling
- balance may need follow-up after the alliance model is fixed

That is expected and manageable.

## Final Recommendation

Yes, this change makes sense.

It is not just a bug fix; it is also a design alignment improvement.

But it should be implemented as a **team-model wave**, not as a couple of AI exceptions.

If done correctly:
- red and purple become allied
- purple keeps its identity
- the simulation becomes more coherent
- future balancing becomes easier because the faction logic is explicit
