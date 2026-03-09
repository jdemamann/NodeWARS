# Energy Model

## Canonical Rule

Outgoing tentacle feed is resolved through the shared budget helpers in `src/systems/EnergyBudget.js`.

## Current Model

- owned non-relay cells generate source budget from tier regeneration
- relay nodes generate no independent source budget
- relays may only forward buffered upstream flow
- outgoing feed is split across active outgoing tentacles
- active tentacles still drain their source when they move energy

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
