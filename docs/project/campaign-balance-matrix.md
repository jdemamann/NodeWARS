# Campaign Balance Matrix

## Goal

Provide a compact world-by-world matrix for upcoming playtest and tuning passes.

This is not a final judgment. It is an execution board for balancing.

## World 1 — Genesis

| Phase | Name | Core Lesson | Primary Risk | First Tuning Knob |
| --- | --- | --- | --- | --- |
| 0 | TUTORIAL | controls, connect, capture, cut | unclear onboarding | tutorial copy / ghost guidance |
| 1 | FIRST LIGHT | safe expansion | too passive | playerStartEnergy |
| 2 | TWIN AXIS | lane choice | fake dual-front read | layout |
| 3 | THE BRIDGE | choke control | bridge not legible enough | layout |
| 4 | TRIANGLE WAR | multi-front pressure | sudden difficulty spike | enemyStartEnergy |
| 5 | SIEGE RING | perimeter control | ring identity too weak | layout |
| 6 | THE FORK | early strategic choice | fork not meaningful | layout |
| 7 | DEADLOCK | sustained contest | stalemate pacing | aiThinkIntervalSeconds |
| 8 | FORTRESS | bunker breaking | attrition fatigue | bunkerCount / route layout |
| 9 | OMEGA GRID | dense battlefield | overload before boss | neutralEnergyRange |
| 10 | ECHO | mirror efficiency test | numeric boss feel | layout / par |

## World 2 — The Void

| Phase | Name | Core Lesson | Primary Risk | First Tuning Knob |
| --- | --- | --- | --- | --- |
| 11 | VOID TUTORIAL | hazard reading | weak hazard communication | layout / tutorial cues |
| 12 | ENTROPY | first safe-route lesson | unfair first hazard | vortexCount |
| 13 | THE RIFT | route splitting | route ambiguity | layout |
| 14 | DRAIN FIELD | controlled drain pressure | overpunishing transit | distanceCostMultiplier |
| 15 | CORRIDORS | lane routing | corridor identity too weak | layout |
| 16 | STATIC VOID | hazard density | overlong slow play | playerStartEnergy |
| 17 | PHANTOM | pulsing hazard timing | noisy timing windows | pulsingVortexPeriodSeconds |
| 18 | MAELSTROM | moving + pulsing mastery | frustration spike | movingVortexCount |
| 19 | VORTEX RING | encirclement hazard | unfair containment feel | layout |
| 20 | ABYSS GATE | late-route commitment | low comeback space | enemyStartEnergy |
| 21 | OBLIVION | boss hazard pressure + purple threat | stacked-system overload | hasSuperVortex / purpleEnemyStartEnergy |

## World 3 — Nexus Prime

| Phase | Name | Core Lesson | Primary Risk | First Tuning Knob |
| --- | --- | --- | --- | --- |
| 22 | NEXUS TUTORIAL | relay + pulsar fundamentals | objective confusion | tutorial cues / layout |
| 23 | RESONANCE | first relay contest | relay value not obvious | relayCount |
| 24 | RELAY RACE | infrastructure race | weak central contest | layout |
| 25 | FIRST PULSE | pulsar timing | pulsar reward too subtle | pulsarCount |
| 26 | BROADCAST | multi-objective pressure | cognitive overload | playerStartEnergy |
| 27 | OVERCLOCK | relay/pulsar tempo | snowball through infrastructure | enemyStartEnergy |
| 28 | FORTIFIED SIGNAL | layered objectives | weak signal priority | fortifiedRelayCount / signalTowerCount |
| 29 | CASCADE | purple pressure intro | arbitrary loss feeling | purpleEnemyStartEnergy |
| 30 | SIGNAL LOCK | signal tower control | unclear top priority | layout |
| 31 | APEX | late-game throughput war | low comeback space | nodeEnergyCap |
| 32 | TRANSCENDENCE | final multi-system mastery | too many simultaneous demands | layout / par / special counts |

## Priority Order For Manual Review

Highest-value phases to review first:

1. `0 TUTORIAL`
2. `3 THE BRIDGE`
3. `10 ECHO`
4. `11 VOID TUTORIAL`
5. `12 ENTROPY`
6. `18 MAELSTROM`
7. `21 OBLIVION`
8. `22 NEXUS TUTORIAL`
9. `24 RELAY RACE`
10. `30 SIGNAL LOCK`
11. `32 TRANSCENDENCE`

## Practical Use

During playtest, annotate each row with:

- observed fail reason
- actual dominant strategy
- whether the lesson was successfully taught
- what knob was changed
- whether the change improved or worsened the phase
