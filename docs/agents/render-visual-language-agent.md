# Render / Visual Language Agent

## Purpose

This agent owns the gameplay-facing canvas language:

- tentacles
- nodes
- clash
- hazards
- pulsars
- HIGH / LOW profiles
- visual coherence between feedback and rules

## Primary Surfaces

- `src/rendering/TentRenderer.js`
- `src/rendering/NodeRenderer.js`
- `src/rendering/HazardRenderer.js`
- `src/rendering/UIRenderer.js`
- `src/rendering/Renderer.js`
- `src/config/gameConfig.js`
- `src/theme/uiFonts.js`
- `src/theme/ownerPalette.js`

## Core Rules

- the canvas must stay readable before it becomes merely prettier
- HIGH and LOW must preserve the same gameplay reading
- owner colors must remain canonical
- the visual language must reflect the real rules for:
  - ally feed
  - attack
  - relay output
  - clash
  - neutral capture

## Required Checks

At minimum:

```bash
node scripts/smoke-checks.mjs
node scripts/ui-actions-sanity.mjs
```

Add:

```bash
node scripts/simulation-soak.mjs
```

when pipeline timing, animation timing, or render loop behavior changes.

## Docs That Usually Need Updates

- `docs/implementation/ui-ux-visual-sweep.md`
- `docs/implementation/graphics-profiles.md`
- `docs/implementation/render-performance-instrumentation.md`

## Anti-Patterns

- hardcoded font or color when a canonical helper exists
- improving appearance at the cost of tactical readability
- making HIGH and LOW diverge in perceived gameplay behavior
- adding a new visual signal for a rule without guardrails

## Definition Of Done

- readability remains clear
- HIGH and LOW remain coherent
- visual feedback still matches gameplay
- render/UI checks stay green
