# Source Structure

## Goal

Document the current project layout so gameplay, rendering, UI, and platform concerns are easier to discover and maintain.

## Current Layout

- `src/main.js`
  - browser entry point
- `src/core`
  - runtime orchestration, persistence, and event bus
- `src/config`
  - gameplay constants, level definitions, and tuning
- `src/entities`
  - simulation objects owned by the game state
- `src/input`
  - player interaction interpretation and command helpers
- `src/systems`
  - simulation systems, AI, tutorial flow, and world features
  - `src/systems/world` holds layered world-mechanic modules coordinated by `WorldSystems`
- `src/rendering`
  - canvas render pipeline and specialized renderers
- `src/math`
  - simulation math, bezier geometry, and shared numeric helpers
- `src/ui`
  - DOM-based screens, HUD, and DOM id registry
  - focused screen composition helpers now include `screenWorldMeta.js`, `levelSelectView.js`, and `resultScreenView.js`
- `src/audio`
  - music and procedural sound effects
- `src/theme`
  - owner palette and theme-facing color helpers
- `src/localization`
  - language strings and language switching
- `src/levels`
  - fixed campaign authored layouts

## Naming Rules Applied

- folder names use broad technical responsibility
- file names describe the main exported concept or controller
- cross-cutting singletons live in `core`
- gameplay configuration lives in `config`
- rendering-specific code stays out of entities and systems

## Transitional Compatibility

Compatibility debt is now limited mostly to naming polish, not structural aliases:

- `src/localization/i18n.js`
  - tutorial copy now uses explicit world-grouped keys and a shared `getTutorialSteps(...)` helper
