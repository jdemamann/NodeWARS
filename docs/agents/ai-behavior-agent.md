# AI Behavior Agent

## Purpose

This agent owns AI behavior quality:

- target selection
- offensive pressure
- allied support
- red/purple coordination
- relay usage
- kill-confirm
- faction differentiation

## Primary Surfaces

- `src/systems/AI.js`
- `src/config/gameConfig.js`
- `src/systems/NeutralContest.js`
- `src/systems/OwnerTeams.js`

## Core Rules

- red and purple must behave as one hostile coalition against the player
- owner `3` keeps a more aggressive identity without breaking the canonical slice path
- AI should not waste pressure on already-covered low-value targets without a strong reason
- relays may only be used when real pass-through budget exists
- heuristics should stay simple and not evolve into a heavy planner

## Required Checks

At minimum:

```bash
node scripts/smoke-checks.mjs
node scripts/campaign-sanity.mjs
```

Add:

```bash
node scripts/simulation-soak.mjs
```

when combat, energy, or coalition coordination rules change.

## Docs That Usually Need Updates

- `docs/implementation/ai-structure-notes.md`
- `docs/implementation/ai-relay-targeting.md`
- `docs/implementation/current-gameplay-baseline.md`
- `docs/project/ai-quality-wave-2026-03-10.md`

## Anti-Patterns

- scattering owner-specific AI rules outside the AI layer
- giving purple AI a different mechanic from the canonical player mechanic
- stacking heuristic bonuses without documenting intent and expected effect
- hiding new tuning outside `gameConfig`

## Definition Of Done

- the new behavior is intentional and explainable
- coalition behavior remains coherent
- smoke and campaign checks keep the AI quality bar
- AI docs still describe the real rule set
