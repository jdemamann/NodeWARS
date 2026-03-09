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

## Intent

The lifecycle should stay readable as a state machine, not as a single monolithic method with mixed concerns.
