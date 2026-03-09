# Tentacle Lifecycle

## Purpose

This document identifies the main lifecycle stages of a tentacle and their canonical handlers.

## States

- `GROWING`
- `ACTIVE`
- `ADVANCING`
- `RETRACTING`
- `BURSTING`
- `DEAD`

## Canonical Internal Handlers

Inside `src/entities/Tent.js`, the lifecycle is organized through these state handlers:

- `update()` delegates by state
- `_updateGrowingState()`
- `_updateActiveState()`
- `_updateActiveFlowState()`
- `_updateClashState()`
- `_updateAdvancingState()`
- `_updateRetractingState()`
- `_updateBurstingState()`

## Shared Rule Entry Points

- player and purple AI cuts: `applySliceCut()`
- ownership transitions: shared ownership helper
- energy budget usage: shared energy-budget helper

## Refund Notes

- programmatic retract refunds the full invested payload to the effective source
- cancelling a tentacle during `GROWING` must refund the full construction cost already paid
- reversed tentacles also refund the effective source, not the historical source endpoint
- refund paths intentionally do not silently discard energy just because the source was already near its nominal cap
- immediate clash links skip the visible growth phase only; they still commit the full build cost

## Clash Notes

- the clash outcome still resolves from the canonical shared clash front
- fresh `ACTIVE`↔`ACTIVE` clashes now advance toward the exact lane midpoint at normal tentacle growth speed before the tug-of-war starts resolving
- mid-air collisions during `GROWING` still start from their real collision point

## Intent

The lifecycle should stay readable as a state machine, not as a single monolithic method with mixed concerns.
