# TentacleWars Level Authoring Principles
# Derived from original game screenshot analysis (35 levels, 2026-03-13)
# Sources: tutorial/1-5.webp, world1/1-20.webp, wolrd2/21-30.webp + level_helper.txt

---

## 1. Energy Distribution Principles

### 1.1 Player starts near Power Limit (energyCap)

In every observed original level, the player cell starts at or very close to its Power Limit:
- Tutorial 1: PL=30, Green=30 (100%)
- Tutorial 3: PL=30, Green=30 (100%, slot-limit demo)
- World 1-01: PL=30, Green=30 (100%)
- World 1-03: PL=70, Green=30 (~43% but cell is Pulsar class — visual size implies different floor)
- World 1-06: PL=100, 7 player cells all=20 (20% but energy cap is very high, each cell at 20 is grade-1)
- World 1-09: PL=150, player visible as medium-high energy
- World 1-16: PL=30, this is a constraint level (low cap is the mechanic, not penalization)

**Rule:** Player initial energy should be ≥ 80% of energyCap for tutorial/intro phases,
≥ 60% for mid-difficulty, ≥ 40% for hard phases.
Exception: when low starting energy IS the mechanic (W1-16 Power Limit 30 as range constraint).

### 1.2 Red/hostile cells start well below player

In all observed levels, hostile cells start at ≤50% of the player's starting energy:
- W1-01: player=30, red=5 (17%)
- W1-02: player=25, red=5 (20%)
- W1-07: player=19, red=20, blue=20 (roughly equal — this level is notably hard)
- W2-04 (level 24): Purple described as "starts with higher strength" — explicit exception

**Rule:** Red starting energy ≤ 50% of player starting energy for early/mid phases.
Exceeding this ratio signals the level is intended to be difficult (W1-07 style).

### 1.3 Neutral cells start at intermediate values

Neutrals are typically set between player and hostile energy levels:
- Cheap neutrals (first-move targets): ≤ player's initial energy — cheap to capture
- Contested neutrals (races): ≈ player energy or slightly above

**Rule:** Neutral initialEnergy ≤ player initialEnergy for "grab me first" neutrals.
Neutral initialEnergy ≈ 1.2–1.5× player energy for "contested race" neutrals.

---

## 2. Power Limit (energyCap) Progression

### 2.1 Original W1 Power Limit values

| Level | Original PL | Our energyCap | Ratio |
|-------|-------------|---------------|-------|
| W1-01 | 30          | 15            | 0.50  |
| W1-02 | 50          | 20            | 0.40  |
| W1-03 | 70          | 30            | 0.43  |
| W1-04 | 50          | 40            | 0.80  |
| W1-05 | 60          | 50            | 0.83  |
| W1-06 | 100         | 60            | 0.60  |
| W1-07 | 100         | 70            | 0.70  |
| W1-08 | 60          | 80            | 1.33  |
| W1-09 | 150         | 90            | 0.60  |
| W1-10 | 80          | 100           | 1.25  |
| W1-15 | 100         | 125           | 1.25  |
| W1-16 | 30          | 130           | 0.23  |
| W1-18 | 200         | 140           | 0.70  |
| W1-19 | 100         | 145           | 0.69  |
| W1-20 | 200         | 150           | 0.75  |

**Note:** Our current caps are systematically lower in early W1 and over-sized in some mid W1.
The original W1-16 uses PL=30 as a deliberate constraint — player can't reach far, forcing
the connect-disconnect cycle. Our W1-16 at PL=130 does not reproduce this constraint.
This is a confirmed fidelity debt. Addressed in separate pass (TWL-009b or TWL-010 prep).

### 2.2 energyCap progression pattern

Original curve (W1): 30 → 50 → 70 → 50 → 60 → 100 → 100 → 60 → 150 → 80 →
                     60 → 100 → 150 → 150 → 100 → 30 → 70 → 200 → 100 → 200

This is NOT a monotone increase. Key observations:
- Dips are intentional: W1-04 (50), W1-08 (60), W1-10 (80), W1-15 (100), W1-16 (30)
- Dips serve as mechanic introduction or constraint scenarios
- Late peaks W1-18 and W1-20 both hit 200 (max observable)

**Rule:** Do not make energyCap monotonically increasing across a world.
Deliberate dips introduce strategic constraints. The dip level usually has a specific mechanic tag.

---

## 3. Spatial Layout Patterns

### 3.1 Progression of cell count

Tutorial → W1 early → W1 mid → W1 late follows a clear escalation:

| Phase group | Typical layout |
|-------------|----------------|
| Tutorial 1-2 | 1p vs 1r (or 1p + 1n + 1r) — pure 1v1 |
| W1-01–02    | Same as tutorial (repetition to confirm skill) |
| W1-03–04    | 2p vs 2r, or 3p vs 1r — first multi-cell |
| W1-05–06    | 1-2p + 1-2n vs 1r, or 7p vs 1r (mass coordination) |
| W1-07–10    | 1-2p + 2n vs 2r, multi-faction (blue introduced) |
| W1-11–15    | 2p + 2-3n vs 2-3r — multi-stage routing |
| W1-16–20    | 2-3p + 1n vs 3-4r — high-grade pressure, obstacles |
| W2-01–10    | 3-faction games (green vs red+blue, or vs purple) |

### 3.2 Cell placement conventions

**Player cells:** Always left side of screen (x < 0.30). First-move targets are clearly reachable.
**Red/hostile cells:** Right side (x > 0.60). Single high-grade boss cell typically at x ≈ 0.80–0.90.
**Neutral cells:** Middle zone (x ≈ 0.35–0.60). Often vertically between player and hostile.
**Support cells (p3 style):** Slightly ahead of main player cells (x ≈ 0.25–0.40), vertically centered.

### 3.3 Vertical symmetry

Most levels use bilateral vertical symmetry (cells mirrored across y=0.50):
- Tutorial 1, W1-01: pure horizontal axis
- W1-03: p1(0.16,0.30)/p2(0.16,0.70), r1(0.74,0.32)/r2(0.74,0.68) — near-symmetric
- W1-06 (gamma level): player in ring formation, boss in exact center (0.50, 0.50)

Asymmetric levels are deliberate and signal narrative/mechanical exception:
- W1-07: Blue faction at bottom, Red at top-right, player centered
- W1-14: Player starts slightly off-center by design (one-side race)

### 3.4 Boss cell positioning

Boss cells (high-grade, hard to capture) are always placed at the far right, separated from
intermediate enemies that must be captured first:
- W1-06: boss at center surrounded by player (inverted — player must not lose flanks)
- W1-09: solar-grade boss at center-right (can be bypassed for easier flanks)
- W1-12: boss at far right (x≈0.82), player must punch through two intermediate reds

**Rule:** Do not place the hardest cell as the first thing the player can reach.
Layer difficulty: cheap route first, then grade escalation to boss.

---

## 4. Mechanic Introduction Sequence

### 4.1 Original introduction order

| Level   | Mechanic introduced |
|---------|---------------------|
| Tut-1   | Connect (basic tentacle) |
| Tut-2   | Neutral capture + gray cells |
| Tut-3   | Tentacle/slot limit |
| Tut-4   | Energy timing (connect-wait-cut-connect) |
| Tut-5   | Counter-attack (enemy extends → you extend → cut) |
| W1-03   | Pulsar class first appearance |
| W1-06   | Gamma (high-grade) cell first appearance |
| W1-07   | Multi-faction (two hostile colors) |
| W1-09   | Solar class first appearance (non-boss, skip-able) |
| W1-16   | Power Limit as range constraint (low cap) |
| W2-01   | Purple faction (third hostile color) |
| W2-09   | Dominator class in level (Grade 5) |

### 4.2 Pattern: introduce mechanic in low-pressure context first

- Pulsar first appears as a PLAYER cell (W1-03), not as an enemy
- Gamma (100-energy enemy) first appears when player has 7 cells (W1-06) — overwhelming advantage
- Solar first appears as an optional skip (W1-09) — player can win without touching it
- Dominator first appears mid-level, never captured by AI (W2-09) — observation before confrontation

**Rule:** When introducing a new cell class, give the player overwhelming positional advantage
on that first encounter. Save threatening versions for 3–5 levels later.

### 4.3 Mechanic tags to carry forward

Recommended tags for authored levels:
- `connect` — basic tentacle attachment
- `neutral-capture` — gray cell first move
- `slice` — cut enemy tentacle
- `support-loop` — feed energy to a node before attacking
- `slot-limit` — energyCap limits number of tentacles
- `range-constraint` — low Power Limit forces short connections
- `multi-faction` — two or more hostile colors
- `obstacle-routing` — amoeba or circle obstacles
- `timed-race` — contested neutral, first-come wins
- `pulsar-class` — pulsar node present
- `gamma-class` — high-grade (grade 3+) node present
- `solar-class` — ultra-high-grade node present
- `dominator-class` — dominator node present

---

## 5. Faction Introduction Timeline

| World | Factions active |
|-------|-----------------|
| W1    | Green (player) + Red; Blue introduced at W1-07 |
| W2    | Green + Red + Purple (primary W2 threat); Blue as sub-enemy |
| W3    | (inference) Orange or Yellow based on visual analysis of W2-ending screens |
| W4    | All factions + Dominator-class cells |

### 5.1 Blue faction role in W1

Blue appears as a peer hostile to red, not a separate challenge to the player.
In W1-07: "red and blue are not helping each other — both are enemies [of green]."
This framing establishes the coalition mechanic before purple introduces the three-way faction game.

### 5.2 Purple faction role in W2

Purple consistently described as more proactive than red:
- W2-01: Purple takes over Red/Blue if player doesn't act fast
- W2-03: Purple starts with higher strength (aggressive opening)
- W2-04: Purple can extend two tentacles (slot advantage)
- W2-05: Purple "cuts the line right away" (reactive aggression)

**Rule:** Purple AI should be tuned more aggressively than red (faster tentacle decisions).
Purple faction introduction in W2 should immediately demonstrate this behavioral difference.

---

## 6. Obstacle Usage Principles

### 6.1 Original "amoeba" = static circle obstacles

W1-05 introduces the amoeba as a wall. The key rule (from wiki):
"That amoeba is a wall, you can't connect through an amoeba — whether friend or foe.
You can only attack with the one in the middle given first."

This confirms obstacles are line-of-sight blockers. Tentacles cannot pass through them.

### 6.2 Obstacle placement patterns

From W1-05 (first obstacle level):
- Single obstacle placed directly on the center path between player and enemy
- A neutral cell exists adjacent to the obstacle (above it), giving an alternate route
- The player must first capture the neutral to get a new angle past the obstacle

**Rule:** Every level with obstacles should have at least one valid alternate route.
An obstacle with no bypass is a puzzle failure, not a puzzle.

### 6.3 Obstacle escalation

- W1-05: 1 circular obstacle on center path
- W1-13: 2 obstacles flanking a neutral cell (creates bottleneck)
- W1-14: 2 obstacles creating a channel (forces specific routing)
- W1-15: 3 obstacles (two side, one center) — full maze structure
- W1-16: 4 obstacles — maximum density in W1
- W1-20: 3 obstacles protecting the boss cell

**Rule:** Increase obstacle count by 1 every 2–3 levels after introduction.
Maximum W1 density = 3–4 obstacles. Dense obstacle maps (5+) for W3+.

---

## 7. Difficulty and Par Calibration

### 7.1 Par time as difficulty signal

Original game par times are not visible in screenshots, but from our authored data and
the wiki hints, the pattern is:
- Easy/tutorial phases: resolve in 15–40 sec with optimal play
- Mid-difficulty: 40–80 sec
- Hard: 80–120 sec
- Boss/late: 120–180 sec

Under PASSIVE_REGEN_FRACTION=2/3, grade-0 combat is slower (0.33/sec net drain).
Adjust all early-W1 pars upward by ~30–50% vs pre-fraction values.

### 7.2 Level difficulty signals from wiki hints

Levels with the word "quickly" in their hint are racing levels — par should reward speed.
Levels with "wait" or "until" are timing/patience levels — par should allow time for learning.
Levels with "repeat" are cycle-mechanic levels (connect/disconnect loops) — par accounts for cycling.

---

## 8. Cell Class Reference

| Class   | Grade | Observed first in | Visual cue       |
|---------|-------|-------------------|------------------|
| Basic   | 0     | Tutorial 1        | Small circle     |
| Grade-1 | 1     | W1-03 context     | Medium circle    |
| Gamma   | 3     | W1-06             | Large, distinctive |
| Pulsar  | —     | W1-03 (player)    | Pulsing animation |
| Solar   | —     | W1-09             | Largest circle   |
| Dominator | 5   | W2-09             | Maximum size     |

**Note:** Pulsar and Solar are class modifiers (affect regen/behavior), not just grade labels.
Gamma in the original appears to be a named tier equivalent to our grade 2–3 range.

---

## 9. World 2 Structural Observations

### 9.1 Layout shift from W1

W2 introduces asymmetric faction positions and contested central zones:
- W2-01: Red and Blue occupy separate sides, Purple in the middle
- W2-06: Player must race to the center-placed Purple boss
- W2-09: Dominator cell in center — contested between all factions, never resolved

### 9.2 Multi-faction dynamics

W2 often places Red/Blue as sub-enemies that the player can use:
- W2-01: Player can let Red and Blue fight Purple, then clean up
- W2-07: Player captures all Reds to use their energy to defeat Purples

**Rule:** In multi-faction W2 levels, there should be at least one "use the enemy" line
(capture faction A to overwhelm faction B). This is distinct from W1 which is pure 1vN.

### 9.3 Purple aggressiveness design requirement

Multiple W2 levels note Purple acts faster or cuts first:
- Design intent: Purple should have a shorter decision cycle than Red AI
- Purple should extend tentacles before Red in similar tactical situations
- Purple should cut sooner than Red after a contested connection

This should be reflected in AI timing constants for the Purple owner (owner=3).

---

## 10. Summary Authoring Checklist

For each new level:

**Energy viability:**
- [ ] Player initialEnergy ≥ energyCap * 0.60 (or note exception)
- [ ] viable_reserve = initialEnergy − buildCost(cheapest first move) ≥ 4
- [ ] Red/hostile initialEnergy ≤ 50% of player initialEnergy (or note intentional exception)
- [ ] No red cell at grade-1+ unless player has cheap neutral route to match first

**Layout:**
- [ ] Player cells at x < 0.30
- [ ] Hostile cells at x > 0.60
- [ ] Boss cell at far right (x > 0.80) if applicable
- [ ] Clear "first move" exists (obvious cheap neutral or direct connection)
- [ ] Obstacles have at least one bypass route

**Mechanic:**
- [ ] introMechanicTags populated if new mechanic introduced
- [ ] New mechanic is introduced in low-pressure context (player has advantage)
- [ ] Level is playable without the optimal mechanic (teaching, not gatekeeping)

**Pacing:**
- [ ] Par time calibrated under PASSIVE_REGEN_FRACTION=2/3
- [ ] Grade-0 levels: par accounts for 0.33/sec net drain
- [ ] Grade-1 advantage levels: par can be tighter (0.83/sec net drain)

**Faction:**
- [ ] Blue not introduced before W1-07 equivalent
- [ ] Purple not introduced before W2-01 equivalent
- [ ] Multi-faction levels have at least one "use enemy A vs enemy B" line
