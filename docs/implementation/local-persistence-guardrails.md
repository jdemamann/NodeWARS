# Local Persistence Guardrails

## Goal

Make sure local progress and settings survive player return without silent drift.

## Persisted Now

[GameState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/GameState.js) now persists:

- completed progress
- current level
- score table
- level fail streaks used by skip unlock rules
- language
- active world tab in level select
- full settings payload

## Settings Normalization

Saved settings are normalized on load/save:

- invalid `graphicsMode` falls back through the legacy `highGraphics` flag
- invalid `theme` falls back to `AURORA`
- invalid `fontId` falls back to `exo2`
- `textZoom` is clamped to the supported `0.5–2.0` range
- boolean flags are coerced back to booleans

## Why This Matters

Without this, a player can come back to:

- the wrong level
- the wrong world tab
- a skip state that no longer matches prior repeated losses
- broken display settings caused by older or partial saves

## Validation

The smoke suite now checks:

- `nw_curLvl` is persisted
- `nw_activeWorldTab` is persisted
- fail streak state survives save/load
- invalid settings are normalized before storage
