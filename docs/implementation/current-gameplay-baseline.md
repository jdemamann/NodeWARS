# Current Gameplay Baseline

## Purpose

This document captures the intended current behavior of the game before larger stabilization refactors.

It is not a fidelity target. It is a reference snapshot used to avoid accidental gameplay drift while cleaning the codebase.

See also:

- `docs/project/stabilization-status.md` for implementation progress
- `docs/implementation/tentaclewars-fidelity-spec.md` for later fidelity-oriented decisions

## Core Rules Snapshot

### Cells

- owned non-relay cells regenerate energy by tier
- growth level is derived from current energy
- higher levels increase slots and offensive throughput
- cells retain a reduced fraction of self-regeneration while feeding allies

### Tentacles

- tentacles are created by selecting a player-owned cell and targeting another cell
- the same connect action can be done by click-click or drag-and-release
- tentacles grow over time before becoming active
- cancelling a tentacle during growth refunds the full construction energy already paid
- retract and refund paths always give the payload back to the effective source end, including reversed links
- active tentacles transport energy through a pipe model
- opposing tentacles can clash and push against each other
- fresh active-vs-active clashes visually travel toward the midpoint instead of appearing there instantly

### Capture and Attack

- allied targets receive energy
- neutral targets accumulate contest progress until captured
- enemy targets lose energy until ownership flips
- ownership changes retract invalid opposing links

### Slicing

- slicing is a primary tactical input
- right-drag always slices, and left-drag can slice when the gesture does not start from a player node
- both player cuts and purple AI strategic cuts use the same canonical slice entry point
- the current implementation maps cut zones as:
  - near source: burst
  - middle: split
  - near target: refund
- frenzy only triggers when 3 active tentacles are cut in the same continuous slice gesture

### Relays

- relays do not regenerate independently
- relays only forward buffered upstream flow
- sending from a relay amplifies outgoing transfer

### AI

- AI remains heuristic-based
- owner 3 uses the same shared burst path as the player
- owner 3 checks strategic burst cuts every update tick
- owner 3 is more biased toward kill-confirm pressure on weak player cells
- AI can evaluate relay targets and can launch from relays when real pass-through budget exists

### Timing and Visual Motion

- core simulation-adjacent tentacle and node motion now follows `game.time`, not wall-clock timing
- this keeps clash approach, pulse motion, and related visual state deterministic with the simulation step

### Campaign / Meta Rules

- world tutorials are optional onboarding content
- when a new world unlocks, both its tutorial and its first real phase become available immediately
- normal campaign progression can still flow into the next world's tutorial when crossing world boundaries
- tutorial completion and next-phase resolution now go through canonical campaign-state helpers
- late high-pressure authored phases can give the player more than one starting node
- phase skip only unlocks after repeated defeats and stays blocked on tutorial, boss, and final phases

### World-Specific Mechanics

- vortex hazards can drain tentacle energy in transit
- pulsars periodically inject area energy
- signal towers grant temporary full-map visibility
- fog of war can hide non-player nodes

## Use

Before changing a gameplay-critical rule:

1. compare the current implementation to this baseline
2. decide whether the task is:
   - bug fix
   - behavior-preserving refactor
   - deliberate gameplay change
3. update this file when the intended current behavior changes

Current highest-priority remaining stabilization work:

- world mechanics boundary isolation
- final tentacle decomposition review
- optional expansion of lightweight behavior checks
