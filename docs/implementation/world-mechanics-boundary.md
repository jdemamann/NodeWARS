# World Mechanics Boundary

## Goal

Keep optional world-layer mechanics separate from the core NodeWARS simulation loop.

## Current Boundary

Core simulation:

- `src/systems/Physics.js`
  - outgoing tentacle counts
  - per-node tentacle feed rate assignment
- `src/entities/GameNode.js`
  - node energy, growth, and level updates
- `src/entities/Tent.js`
  - tentacle lifecycle, flow, clash, burst, and capture effects

World-layer mechanics:

- `src/systems/WorldSystems.js`
  - vortex drain
  - pulsar broadcast
  - relay capture events
  - signal-tower fog reveal
  - fog of war recomputation
  - auto-retract from dying cells
  - camera follow
- `src/systems/WorldSetup.js`
  - hazard spawn
  - relay spawn
  - pulsar spawn
  - signal node spawn
  - neutral bunker upgrades

## Rule

If a mechanic can be disabled without breaking the baseline energy, tentacle, capture, slice, or AI loop, it belongs in the world layer.

## Why This Matters

- reduces the chance of world features accidentally changing core gameplay rules
- makes future Tentacle Wars fidelity work easier, because optional mechanics are easier to isolate or disable
- keeps `Game.js` closer to orchestration instead of world-rule ownership

## Remaining Work

- decide whether tutorial-specific hazard/pulsar presets should also move into `WorldSetup`
- decide whether world-specific render toggles should gain their own helper layer
