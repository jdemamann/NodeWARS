# Energy Model

## Canonical Rule

Outgoing tentacle feed is resolved through the shared budget helpers in `src/systems/EnergyBudget.js`.

## Current Model

- owned non-relay cells generate source budget from tier regeneration
- level-0 cells now start at `1.0 e/s`, and higher levels keep the same absolute step increases as the prior tuning
- relay nodes generate no independent source budget
- relays may only forward buffered upstream flow
- outgoing feed is split across active outgoing tentacles
- active tentacles still drain their source when they move energy
- displayed regen in the UI now comes from the same shared helper used by the runtime budget model

## Why

The game previously spread budget logic across node regen, physics out-count updates, and tentacle flow code.

The shared helper exists to keep:

- source budget calculation
- relay budget capture
- per-tentacle feed rate
- source feed clamping

in one conceptual place.

## Code Anchors

- shared helper: `src/systems/EnergyBudget.js`
- node feed assignment: `src/systems/Physics.js`
- source drain and per-tentacle usage: `src/entities/Tent.js`

## TentacleWars Sandbox Notes

- packet size stays at `1`
- grade changes packet frequency, not packet size
- hostile and neutral capture still reuse flowing lane energy instead of teleporting value
- overflow in the current TentacleWars fidelity track is not equal-split
- when a full TentacleWars cell receives support and has multiple outgoing lanes, the full overflow value is broadcast to each outgoing lane
