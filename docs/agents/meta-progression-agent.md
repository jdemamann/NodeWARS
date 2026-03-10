# Meta-Progression Agent

## Purpose

This agent owns meta-state:

- world unlocks
- phase progression
- optional tutorials
- skip rules
- save/load of progress
- next-level and result-screen flow

## Primary Surfaces

- `src/core/GameState.js`
- `src/ui/ScreenController.js`
- `src/main.js`
- `src/systems/Tutorial.js`
- `src/config/gameConfig.js`

## Core Rules

- `GameState` remains the canonical source of unlock and next-level resolution
- every tutorial stays optional for unlock
- natural world progression may still route into the next tutorial
- skip only unlocks after repeated defeats and stays blocked on tutorial, boss, and final phases
- manual world overrides in settings must not be overwritten by natural progression

## Required Checks

At minimum:

```bash
node scripts/smoke-checks.mjs
node scripts/campaign-sanity.mjs
node scripts/ui-dom-sanity.mjs
```

Add:

```bash
node scripts/ui-actions-sanity.mjs
```

when screens, buttons, labels, or UI-reflected persistence change.

## Docs That Usually Need Updates

- `docs/implementation/current-gameplay-baseline.md`
- `docs/implementation/local-persistence-guardrails.md`
- `docs/project/stabilization-status.md`
- `README.md`
- `AGENTS.md`

## Anti-Patterns

- reintroducing `curLvl + 1` as progression logic
- duplicating unlock rules across menu, tutorial, and result flow
- mixing manual world flags with progress without an explicit API
- changing save/local state without updating normalization and docs

## Definition Of Done

- progression remains canonical in `GameState`
- tutorial, result, and menu agree on unlock and next-level behavior
- persistence remains stable
- campaign and UI checks stay green
