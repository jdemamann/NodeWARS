# Campaign & Level Agent

## Purpose

This agent owns authored campaign content and structural balance:

- world progression
- tutorials
- fixed layouts
- pacing
- bosses
- structural opening support

## Primary Surfaces

- `src/config/gameConfig.js`
- `src/levels/FixedCampaignLayouts.js`
- `src/core/GameState.js`
- `src/ui/ScreenController.js`
- `src/systems/Tutorial.js`

## Core Rules

- every tutorial is optional for unlock purposes
- normal world progression may still flow into the next tutorial
- the first real phase of each world unlocks together with that world's tutorial
- late high-pressure phases must preserve structural opening support for the player

## Required Checks

At minimum:

```bash
node scripts/campaign-sanity.mjs
node scripts/smoke-checks.mjs
```

If tutorials or campaign-facing screens change:

```bash
node scripts/ui-actions-sanity.mjs
node scripts/ui-dom-sanity.mjs
```

## Docs That Usually Need Updates

- `docs/project/campaign-balance-matrix.md`
- `docs/project/campaign-balance-wave-a.md`
- `docs/project/priority-phase-balance-pass.md`
- `docs/level-design/fixed-campaign-review.md`
- `docs/implementation/current-gameplay-baseline.md`

## Anti-Patterns

- reintroducing `curLvl + 1` as campaign progression logic
- treating tutorials as mandatory gates
- inflating difficulty only through numbers without checking opening structure
- changing authored phase behavior without updating sanity checks or docs

## Definition Of Done

- progression remains coherent
- the phase keeps its intended identity
- campaign and smoke checks stay green
