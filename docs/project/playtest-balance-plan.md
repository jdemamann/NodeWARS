# Playtest and Balance Plan

## Goal

Move the project from "structurally stable" to "consistently enjoyable" through disciplined playtest and balance passes.

This plan assumes:

- the core simulation is already stable
- the fixed campaign exists
- lightweight validation scripts are already in place

It does not replace design judgment. It gives the team a repeatable way to evaluate and tune the campaign.

## Operating Principle

Each balance pass should answer three questions:

1. Is the phase readable?
2. Is the phase fair?
3. Is the phase memorable for the intended reason?

If a level is hard but unreadable, fix readability first.
If a level is readable but unfair, fix setup and pacing second.
If a level is fair but forgettable, improve authored identity third.

## Required Pre-Playtest Checks

Before any manual pass:

```bash
node scripts/campaign-sanity.mjs
node scripts/smoke-checks.mjs
```

If either script fails, do not tune the level yet.

## Playtest Session Structure

Each session should cover only one world or one tuning objective.

Recommended session types:

- `onboarding session`
  - focus: tutorial clarity, first impressions, control learning
- `difficulty session`
  - focus: challenge curve, pacing spikes, comeback space
- `mechanic session`
  - focus: vortexes, relays, pulsars, signals, purple AI
- `par session`
  - focus: star thresholds and completion pacing

## Per-Phase Evaluation Template

For each phase, capture:

- `phase id / name`
- `intended lesson`
- `observed dominant strategy`
- `first 30-second objective clarity`
- `main fail reason`
- `felt fairness`
- `snowball risk`
- `comeback potential`
- `mechanic readability`
- `par accuracy`

Use a simple 1–5 score:

- `clarity`
- `fairness`
- `pressure`
- `memorability`

## Tuning Priority Order

When a phase underperforms, tune in this order:

1. layout or authored setup
2. objective readability
3. starting energy
4. AI think interval
5. distance cost multiplier
6. neutral energy range
7. special mechanic counts
8. par value

Do not start with par tuning if the phase itself is unreadable or structurally unfair.

## Recommended Tuning Knobs

From [gameConfig.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/config/gameConfig.js):

- `playerStartEnergy`
  - use when the opening feels too slow or too punishing
- `enemyStartEnergy`
  - use when enemy snowball begins too early
- `purpleEnemyStartEnergy`
  - use only for purple spike control
- `aiThinkIntervalSeconds`
  - use to shape pressure and tactical responsiveness
- `distanceCostMultiplier`
  - use to control map greed and long-link punishment
- `neutralEnergyRange`
  - use to shape expansion tempo and contest friction
- `nodeEnergyCap`
  - use when the phase needs more or less late-fight staying power
- `vortexCount`, `movingVortexCount`, `pulsingVortexPeriodSeconds`
  - use only after route readability is confirmed
- `relayCount`, `pulsarCount`, `signalTowerCount`, `fortifiedRelayCount`
  - use to control World 3 objective density
- `par`
  - tune last

## World-Specific Focus

### World 1

Primary questions:

- does the player understand expansion and pressure?
- do cuts feel necessary but not mandatory too early?
- do bunker phases feel tactical instead of tedious?

Main risks:

- overcosted links
- slow early tempo
- bosses feeling numeric rather than positional

### World 2

Primary questions:

- are safe routes legible?
- does hazard loss feel earned?
- do moving/pulsing vortexes create tension without randomness fatigue?

Main risks:

- unfair route denial
- too much drain too early
- players losing to geometry noise instead of decisions

### World 3

Primary questions:

- are infrastructure objectives obvious?
- do relays and pulsars feel worth contesting?
- does purple AI create pressure without feeling arbitrary?

Main risks:

- too many simultaneous priorities
- relay/pulsar value not readable on sight
- purple cuts feeling like punishment without warning

## Par Tuning Rule

Use this order:

1. establish that the phase is fair
2. collect several clean wins
3. collect several messy wins
4. place `par` between "clean mastery" and "messy survival"

Practical rule:

- `3-star par` should reward skill, not perfection
- average successful first-clear should not automatically earn 3 stars
- a strong but not speedrun-level player should feel the 3-star target is achievable

## Exit Criteria For A Balanced Phase

A phase is ready when:

- its opening objective is clear
- its fail condition feels deserved
- its main mechanic is visible and understandable
- its win does not depend on lucky variance
- its par target feels aspirational but reachable

## Recommended Next Deliverables

After this plan, the most useful artifacts are:

- a per-phase balance worksheet
- a world-by-world test schedule
- a short record of observed fail cases and actual tuning decisions
