# Campaign Balance Wave A

## Goal

Record the first concrete tuning pass on the priority campaign phases.

This wave is intentionally conservative. It adjusts pacing and pressure without changing core mechanics or authored layouts.

## Tuning Principles

- ease tutorial and first-mechanic onboarding before touching late-game density
- reduce stacked pressure before reducing mechanic identity
- relax `par` only where the phase is meant to stay difficult but should not demand near-perfect execution
- prefer small numeric moves over sweeping changes in the first pass

## Applied Changes

### Level 3 — THE BRIDGE

- `playerStartEnergy: 28 -> 30`
- `distanceCostMultiplier: 0.05 -> 0.06`

Intent:

- give the player a slightly cleaner opening
- make off-lane greed a bit more expensive so the bridge matters more

### Level 10 — ECHO

- `aiThinkIntervalSeconds: 1.2 -> 1.35`
- `par: 268 -> 278`

Intent:

- preserve the mirror-boss identity
- reduce the chance that the fight becomes a pure execution wall too early

### Level 11 — VOID TUTORIAL

- `enemyStartEnergy: 20 -> 16`

Intent:

- reduce first-hazard intimidation
- keep the lesson on routing, not on early punishment

### Level 12 — ENTROPY

- `enemyStartEnergy: 24 -> 22`
- `playerStartEnergy: 30 -> 32`
- `par: 88 -> 94`

Intent:

- make the first real vortex map more readable and less brittle
- avoid punishing cautious routing too hard

### Level 18 — MAELSTROM

- `enemyStartEnergy: 48 -> 46`
- `par: 188 -> 196`

Intent:

- keep the phase tense
- slightly soften the punishment while players learn moving/pulsing denial

### Level 21 — OBLIVION

- `enemyStartEnergy: 65 -> 62`
- `purpleEnemyStartEnergy: 50 -> 46`
- `par: 262 -> 274`

Intent:

- reduce stacked boss pressure
- keep the super-vortex as the main identity instead of letting purple pressure dominate the read

### Level 22 — NEXUS TUTORIAL

- `enemyStartEnergy: 20 -> 16`

Intent:

- give the player more space to understand relay and pulsar value

### Level 24 — RELAY RACE

- `enemyStartEnergy: 32 -> 30`
- `playerStartEnergy: 30 -> 32`

Intent:

- help the player contest relay tempo proactively
- avoid the race resolving too quickly against the player

### Level 30 — SIGNAL LOCK

- `enemyStartEnergy: 58 -> 55`
- `purpleEnemyStartEnergy: 48 -> 44`
- `par: 230 -> 238`

Intent:

- reduce stacked objective overload
- give the signal priority more room to be understood before pressure spikes

### Level 32 — TRANSCENDENCE

- `enemyStartEnergy: 72 -> 68`
- `purpleEnemyStartEnergy: 62 -> 58`
- `par: 288 -> 300`

Intent:

- keep the final exam hard
- reduce the chance that failure feels purely numeric
- make the 3-star target aspirational rather than oppressive

## Validation

After this wave:

- `node scripts/smoke-checks.mjs`
- `node scripts/campaign-sanity.mjs`
- `node scripts/simulation-soak.mjs`

All remained green at the time of this update.

## Next Recommended Step

Wave B should be based on actual playtest outcomes, not more blind numeric tuning.

The best follow-up is:

1. playtest the priority phases
2. record fail reasons
3. adjust authored layout or objective clarity before making another broad numeric pass

## Structural Follow-Up

A later structural pass was added after playtest review of late-game openings.

Applied authored-layout support:

- `18 MAELSTROM`: convert the upper-left flank neutral into a small player-owned support start
- `21 OBLIVION`: convert the upper-left flank neutral into a small player-owned support start
- `30 SIGNAL LOCK`: convert the upper-left flank neutral into a small player-owned support start
- `32 TRANSCENDENCE`: convert both left-flank neutrals into small player-owned support starts

Intent:

- reduce one-node snowball pressure in late high-chaos phases
- give the player a second front before stacked hazards / signal / purple pressure fully come online
- improve comeback space without flattening the identity of relay, signal, or boss mechanics

Guardrail:

- `node scripts/campaign-sanity.mjs` now verifies that these specific high-pressure authored levels keep at least two player-owned starting nodes
