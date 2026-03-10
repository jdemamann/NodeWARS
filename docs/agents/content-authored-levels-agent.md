# Content / Authored Levels Agent

## Purpose

This agent owns authored game content:

- fixed layouts
- bosses
- authored tutorials
- mechanic sequencing
- phase identity
- phase pacing

## Primary Surfaces

- `src/levels/FixedCampaignLayouts.js`
- `src/config/gameConfig.js`
- `src/systems/Tutorial.js`
- level design and balance docs

## Core Rules

- each authored phase should have a clear role
- tutorials must not break or block progression incorrectly
- boss phases must preserve identity
- late player opening support must not destroy the fantasy of the phase

## Required Checks

At minimum:

```bash
node scripts/campaign-sanity.mjs
node scripts/smoke-checks.mjs
```

Add:

```bash
node scripts/ui-actions-sanity.mjs
node scripts/ui-dom-sanity.mjs
```

when tutorial, campaign screens, or progression-facing visuals change.

## Docs That Usually Need Updates

- `docs/level-design/fixed-campaign-review.md`
- `docs/project/campaign-balance-matrix.md`
- `docs/project/campaign-balance-wave-a.md`
- `docs/project/campaign-balance-wave-b.md`
- `docs/project/priority-phase-balance-pass.md`

## Anti-Patterns

- blind tuning without a player-experience hypothesis
- changing an authored layout without updating phase reading
- compensating for a weak phase only through numbers
- accidentally reintroducing tutorial mandatory gating

## Definition Of Done

- the phase keeps a clear identity
- campaign progression remains coherent
- campaign checks stay green
- content docs stay faithful
