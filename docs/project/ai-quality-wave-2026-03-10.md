# AI Quality and Faction Behavior Wave — 2026-03-10

## Goal

Raise the AI from "structurally correct" to "more intentional and less wasteful" without introducing a heavy planner.

## Problems addressed

- AI could overcommit multiple lanes onto the same low-value target
- coalition partners did not value support on already-pressured allied nodes strongly enough
- neutral captures with allied progress were not attractive enough to continue
- player nodes that were already vulnerable were not prioritized strongly enough as kill-confirm opportunities

## Implemented direction

### 1. Better continuation of coalition neutral captures

The AI now adds a stronger score bonus when:

- the AI coalition already has meaningful contest progress on a neutral node
- at least one allied lane is already committed there

This makes red/purple coalition pressure feel more deliberate.

### 2. Better allied support under player pressure

Allied nodes that are already under visible player pressure now receive a stronger support score.

This improves:

- coalition cohesion
- rescue behavior
- support to red/purple partner nodes without needing bespoke scripted rules

### 3. Stronger kill-confirm on player cells

The AI now adds explicit bonuses for player nodes that are:

- low energy
- already under attack
- overextended via multiple outgoing links

This improves punish behavior without making the AI globally more spammy.

### 4. Reduced wasteful overcommit

The AI now penalizes piling too many allied lanes into:

- a neutral node that is already sufficiently covered
- a player node that is not yet a strong kill-confirm

It also only allows multi-source focus onto the same target when the target score is high enough to justify a deliberate finish.

## Design intent

This wave does **not** try to make the AI omniscient.

It keeps the AI:

- heuristic
- readable
- cheap to run

while making it:

- more coherent
- more punitive when the player is actually vulnerable
- less wasteful in coalition play

## Validation

Required:

```bash
npm run check:gameplay
npm run check:campaign
```

If any shared gameplay rule is touched later:

```bash
npm run check:full
```
