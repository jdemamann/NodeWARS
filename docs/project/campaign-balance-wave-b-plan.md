# Campaign Balance Wave B Plan

## Goal

Execute the next balance wave using observed behavior instead of blind global tuning.

This wave should stay conservative:

- prefer local tuning
- preserve authored identity
- do not rewrite core mechanics

## Priority phases

1. `18 MAELSTROM`
2. `21 OBLIVION`
3. `24 RELAY RACE`
4. `30 SIGNAL LOCK`
5. `32 TRANSCENDENCE`

## Observation checklist per phase

- opening objective clarity
- first fail reason
- pressure source readability
- comeback space
- whether the main mechanic was actually the reason the phase felt hard
- whether tutorial knowledge transferred correctly

## Allowed tuning knobs for Wave B

Use this order:

1. `playerStartEnergy`
2. `enemyStartEnergy`
3. `purpleEnemyStartEnergy`
4. `aiThinkIntervalSeconds`
5. `distanceCostMultiplier`
6. structural opening support only if the phase still snowballs unfairly

Do not start with:

- broad global rule changes
- par-only tuning
- new mechanics

## Deliverables

For each phase, record:

- observed issue
- hypothesis
- tuning change
- expected effect
- checks run

## Required checks

```bash
npm run check:campaign
```

If UI/tutorial text changes:

```bash
npm run check:ui
```

If a gameplay rule changes:

```bash
npm run check:full
```
