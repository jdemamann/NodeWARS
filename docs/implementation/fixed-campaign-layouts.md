# Fixed Campaign Layouts

## Goal

Make the campaign deterministic and authored enough to support consistent difficulty, mechanic teaching, and boss identity.

## Implementation

The campaign now loads fixed layouts from:

- `src/levels/FixedCampaignLayouts.js`

Integration points:

- `src/core/Game.js`
  - checks for a fixed layout by `level.id`
  - populates authored nodes first when a layout exists
  - uses procedural loading only as fallback
- `src/systems/WorldSetup.js`
  - applies authored nodes
  - applies authored hazards and pulsars

## Design Rules

Each fixed layout may define:

- `nodes`
  - normalized `x` / `y`
  - `energy`
  - `owner`
  - `type`
  - optional `isBunker`
  - optional `captureThreshold`
- `hazards`
  - normalized `x` / `y`
  - radius and movement/pulsing parameters
- `pulsars`
  - normalized `x` / `y`
  - radius, interval, strength, and super-pulsar flags

Normalized coordinates are scaled against the active canvas size at load time.

## Current State

All configured campaign levels now have fixed deterministic layouts.

Validation currently checks:

- every configured level resolves to a fixed layout
- each fixed layout matches the configured node count
- levels with `ai3` enabled include purple starting presence

## Why This Matters

- difficulty is now more repeatable
- tutorial and boss identity are no longer left to procedural chance
- named maps can express real positional lessons
- future level balancing can be done phase by phase instead of seed by seed

## Remaining Design Work

The infrastructure is complete, but balance is not “finished forever”.

Still recommended:

- manual playtest passes for every world
- phase-specific tuning of starting energy and objective placement
- authored choke/bottleneck polish on the highest-priority boss and tutorial levels
