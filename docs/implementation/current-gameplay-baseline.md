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

### Tentacles

- tentacles are created by selecting a player-owned cell and targeting another cell
- tentacles grow over time before becoming active
- active tentacles transport energy through a pipe model
- opposing tentacles can clash and push against each other

### Capture and Attack

- allied targets receive energy
- neutral targets accumulate contest progress until captured
- enemy targets lose energy until ownership flips
- ownership changes retract invalid opposing links

### Slicing

- slicing is a primary tactical input
- both player cuts and purple AI strategic cuts use the same canonical slice entry point
- the current implementation maps cut zones as:
  - near source: burst
  - middle: split
  - near target: refund

### Relays

- relays do not regenerate independently
- relays only forward buffered upstream flow
- sending from a relay amplifies outgoing transfer

### AI

- AI remains heuristic-based
- owner 3 uses the same shared burst path as the player
- AI can evaluate relay targets

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
