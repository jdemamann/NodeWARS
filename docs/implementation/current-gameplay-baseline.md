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
- level-0 cells now start at `1.0 e/s`
- growth level is derived from current energy
- capped nodes use a small level-down hysteresis so they do not spam level-up /
  level-down feedback when energy hovers around a threshold
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
- neutral capture between red and purple is coalition-aware and parameterized:
  - `sum` combines both hostile AIs toward one neutral-capture threshold
  - `lockout` lets the first allied captor keep the lane uncontested by the other
- neutral capture visuals now surface coalition contribution explicitly instead of pretending summed red+purple pressure came from one owner only
- neutral capture pacing is kept close to the prior opening tempo by a lower `CAPTURE_SPEED_MULT` after the tier-0 regen increase
- enemy targets lose energy until ownership flips
- ownership changes always retract tentacles rooted at the captured node, while incoming lanes from other nodes keep resolving naturally

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
- owners 2 and 3 are one hostile coalition against the player and no longer attack each other
- enemy slice pressure now exists as a real coalition mechanic, still routed through the same shared burst path as the player
- owner 3 keeps more permissive slice thresholds and cooldowns than owner 2
- AI derives a lightweight tactical state (`expand`, `pressure`, `support`, `finish`, `recover`) before scoring moves
- owner 3 is more biased toward kill-confirm pressure on weak player cells
- AI now scores player structural weakness, including isolated fronts, weak support, and overextended branch pressure
- AI can evaluate relay targets and can launch from relays when real pass-through budget exists

### Timing and Visual Motion

- core simulation-adjacent tentacle and node motion now follows `game.time`, not wall-clock timing
- this keeps clash approach, pulse motion, and related visual state deterministic with the simulation step

### Notifications

- bottom-right notifications are the canonical short-form runtime feedback channel
- duplicate notifications are suppressed inside a short dedupe window
- high-priority warnings and objectives can evict lower-priority informational cards

### Campaign / Meta Rules

- world tutorials are optional onboarding content
- when a new world unlocks, both its tutorial and its first real phase become available immediately
- normal campaign progression can still flow into the next world's tutorial when crossing world boundaries
- tutorial completion and next-phase resolution now go through canonical campaign-state helpers
- tutorial UI labels are localized through `i18n`, and tutorial progress only advances when the expected node or cut action is completed
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
