# Priority Phase Balance Pass

## Goal

Define the first high-value balance pass for the most critical campaign phases.

These phases matter most because they are either:

- onboarding gates
- mechanic-introduction gates
- bosses
- high-identity tactical maps

This document is meant to guide the next manual tuning sessions.

## Phases Covered

- `0` TUTORIAL
- `3` THE BRIDGE
- `10` ECHO
- `11` VOID TUTORIAL
- `12` ENTROPY
- `18` MAELSTROM
- `21` OBLIVION
- `22` NEXUS TUTORIAL
- `24` RELAY RACE
- `30` SIGNAL LOCK
- `32` TRANSCENDENCE

## 0 — TUTORIAL

### Desired player experience

- learn core controls with zero ambiguity
- understand connect, capture, retract, and cut in one clean sequence
- leave the tutorial feeling empowered, not tested

### Main risks

- too much text before action
- tutorial steps explaining mechanics before the player sees them
- retract and cut being learned as “special-case UI” instead of natural actions

### Success criteria

- player understands both click-connect and drag-release
- player sees a full capture complete without confusion
- player successfully retracts once and cuts once

### First tuning targets

- keep `playerStartEnergy` generous
- keep the map spatially sparse
- make the first neutral capture finish quickly enough to avoid boredom

### If it fails

- reduce neutral durability first
- simplify path length second
- shorten tutorial copy third

## 3 — THE BRIDGE

### Desired player experience

- immediately recognize a central choke
- understand that committing to the bridge creates both opportunity and vulnerability
- win by controlling a lane, not by random wide expansion

### Main risks

- “bridge” not visually dominant enough
- side expansion overshadowing the intended choke
- phase feeling like generic 1v1 instead of a lane-control lesson

### Success criteria

- player identifies the bridge as the main objective in the first 20–30 seconds
- at least one meaningful contest happens over the choke
- victory feels positional rather than purely economic

### First tuning targets

- authored layout first
- `distanceCostMultiplier` second if flank routes are too cheap
- `enemyStartEnergy` third if the AI loses the choke too easily

## 10 — ECHO

### Desired player experience

- feel like a fair mirrored exam
- reward cleaner routing, better timing, and better cuts
- deliver a strong “boss but fair” finish to World 1

### Main risks

- boss feeling slow rather than tense
- symmetry creating a long stalemate
- par target rewarding only extreme optimization

### Success criteria

- defeat feels like the player was out-executed, not surprised
- multiple winning lines exist, but all demand efficiency
- phase reads as a capstone, not just a bigger map

### First tuning targets

- `aiThinkIntervalSeconds`
- `playerStartEnergy` and `enemyStartEnergy` symmetry pressure
- `par` only after the fight length feels good

## 11 — VOID TUTORIAL

### Desired player experience

- immediately understand that vortexes are route hazards
- recognize safe versus unsafe routes by sight
- learn hazard respect without being punished too hard

### Main risks

- first hazard lesson feeling unfair
- hazard visuals not clearly matching gameplay effect
- player assuming the hazard is random instead of geometric

### Success criteria

- player notices dimmed flow / weaker delivery when crossing the hazard
- safe route is discoverable on first inspection
- tutorial does not require perfect routing execution

### First tuning targets

- authored placement of the first vortex
- `vortexCount`
- route spacing around the hazard

## 12 — ENTROPY

### Desired player experience

- transition from “I know what a vortex is” to “I can plan around one”
- force the player to value safe routing
- still feel beatable with one clear lesson

### Main risks

- first real hazard phase being too punishing
- route choice not obvious enough
- map degenerating into passive waiting

### Success criteria

- player can explain why one path is better than another
- hazard creates tension, not paralysis
- the phase is memorable as the first true hazard problem

### First tuning targets

- layout first
- `distanceCostMultiplier` second
- `playerStartEnergy` third if the opening is too brittle

## 18 — MAELSTROM

### Desired player experience

- this should feel like mastery of moving and pulsing denial
- high tension, but still readable
- player wins by anticipating hazard timing, not brute forcing

### Main risks

- frustration spike
- too much simultaneous motion
- route readability collapsing under system noise

### Success criteria

- player can read the hazard rhythm after a small learning period
- failure feels like mistimed routing, not nonsense
- phase is stressful but not exhausting

### First tuning targets

- `movingVortexCount`
- `pulsingVortexPeriodSeconds`
- `enemyStartEnergy`

## 21 — OBLIVION

### Desired player experience

- a true World 2 boss with stacked pressure
- player must juggle vortex routing and purple threat
- winning should feel like surviving a hostile ecosystem

### Main risks

- overloaded systems
- purple pressure masking the actual boss mechanic
- no comeback after one early bad route

### Success criteria

- player can identify the super-vortex as the boss centerpiece
- purple AI sharpens pressure instead of stealing focus
- phase ends with relief and accomplishment, not confusion

### First tuning targets

- `purpleEnemyStartEnergy`
- `hasSuperVortex` area behavior via layout
- `enemyStartEnergy`

## 22 — NEXUS TUTORIAL

### Desired player experience

- immediately understand why relays and pulsars matter
- feel that infrastructure changes strategy, not just visuals
- exit ready for World 3 priorities

### Main risks

- relay value not obvious
- pulsar reward too subtle
- tutorial trying to teach two systems at once without enough clarity

### Success criteria

- player captures a relay intentionally
- player notices the pulsar cycle and benefit
- the tutorial teaches prioritization, not just identification

### First tuning targets

- authored objective spacing
- `relayCount` and `pulsarCount` should stay minimal
- ensure the first relay is central and meaningful

## 24 — RELAY RACE

### Desired player experience

- early infrastructure race
- strong central contest over relay tempo
- player understands that relays are worth fighting over before normal map cleanup

### Main risks

- relays too peripheral
- race resolved too early by spawn advantage
- relay reward still not strong enough in practice

### Success criteria

- first major clash happens around relays
- whoever controls relays gains a visible flow advantage
- phase feels fast and strategic, not grindy

### First tuning targets

- layout first
- `relayCount` second
- `enemyStartEnergy` third

## 30 — SIGNAL LOCK

### Desired player experience

- player sees a high-priority infrastructure target and has to decide when to contest it
- signal control should compete with relay and pulsar priorities
- purple pressure should complicate decisions, not erase them

### Main risks

- too many valid objectives with no hierarchy
- signal tower not visibly important enough
- purple AI making the phase feel punitive instead of tactical

### Success criteria

- the player can identify a main strategic question early
- signal control changes how the phase is played
- losing feels tied to wrong prioritization, not hidden rules

### First tuning targets

- layout first
- `signalTowerCount` and its placement second
- `purpleEnemyStartEnergy` third

## 32 — TRANSCENDENCE

### Desired player experience

- final exam of the full system
- hard, but still readable
- player wins through mastery of routing, infrastructure, cuts, and prioritization

### Main risks

- too many simultaneous demands
- final boss becoming a systems pile instead of a coherent battle
- 3-star target feeling absurd instead of aspirational

### Success criteria

- the phase has one readable opening plan and several viable adaptations
- every major system matters, but none feels decorative
- victory feels earned and conclusive

### First tuning targets

- layout first
- objective density second
- `purpleEnemyStartEnergy`, `enemyStartEnergy`, and `par` last

## Cross-Phase Recommendations

### Most likely early tuning wins

- reduce frustration by improving authored objective spacing before changing numbers
- tune `enemyStartEnergy` before making AI faster
- tune `distanceCostMultiplier` when greed needs punishment, not as a general difficulty hammer
- tune `par` only after the phase already feels fair and readable

### Most likely recurring failure patterns

- players do not identify the intended first objective quickly enough
- mechanic-introduction levels punish too hard too early
- boss phases rely on pressure stacking instead of clear authored identity
- World 3 phases overload the player with equally loud objectives

## Recommended Execution Order

1. `0 TUTORIAL`
2. `11 VOID TUTORIAL`
3. `22 NEXUS TUTORIAL`
4. `3 THE BRIDGE`
5. `12 ENTROPY`
6. `24 RELAY RACE`
7. `10 ECHO`
8. `18 MAELSTROM`
9. `30 SIGNAL LOCK`
10. `21 OBLIVION`
11. `32 TRANSCENDENCE`
