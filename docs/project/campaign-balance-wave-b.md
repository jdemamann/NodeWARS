# Campaign Balance Wave B

## Goal

Apply the next conservative campaign tuning wave on the priority authored phases using the stabilized mechanical baseline.

This wave assumes:

- core systems are already stable
- coalition logic is already correct
- the objective is fairness and readability, not dramatic redesign

## Applied changes

### Level 18 — MAELSTROM

- `enemyStartEnergy: 46 -> 44`
- `playerStartEnergy: 34 -> 36`
- `aiThinkIntervalSeconds: 3.0 -> 3.2`
- `par: 196 -> 202`

Intent:

- soften the first few hazard-driven mistakes
- give the player slightly more space before the moving/pulsing pressure fully stacks

### Level 21 — OBLIVION

- `enemyStartEnergy: 62 -> 60`
- `playerStartEnergy: 40 -> 42`
- `purpleEnemyStartEnergy: 46 -> 42`
- `aiThinkIntervalSeconds: 1.6 -> 1.75`
- `par: 274 -> 282`

Intent:

- keep the boss identity hard
- reduce the feeling that purple pressure plus super-vortex overwhelm the player at once

### Level 24 — RELAY RACE

- `enemyStartEnergy: 30 -> 28`
- `playerStartEnergy: 32 -> 34`
- `aiThinkIntervalSeconds: 5.0 -> 5.3`
- `par: 114 -> 120`

Intent:

- give the player a better chance to actually contest the relay race rather than always reacting late

### Level 30 — SIGNAL LOCK

- `enemyStartEnergy: 55 -> 53`
- `playerStartEnergy: 38 -> 40`
- `purpleEnemyStartEnergy: 44 -> 42`
- `aiThinkIntervalSeconds: 2.4 -> 2.55`
- `par: 238 -> 246`

Intent:

- make signal priority more legible before dual-faction pressure compounds

### Level 32 — TRANSCENDENCE

- `enemyStartEnergy: 68 -> 66`
- `playerStartEnergy: 42 -> 44`
- `purpleEnemyStartEnergy: 58 -> 55`
- `aiThinkIntervalSeconds: 1.5 -> 1.6`
- `par: 300 -> 308`

Intent:

- keep the final phase hard
- reduce the chance that failure feels purely numeric instead of multi-system tactical

## Design reading

Wave B stays conservative:

- it does not alter mechanics
- it does not erase phase identity
- it improves first-failure fairness and readability

## Validation

After this wave:

```bash
npm run check:campaign
npm run check:gameplay
```

Both remain required before further tuning.
