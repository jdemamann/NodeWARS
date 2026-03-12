# Tentacle Wars Mechanics Consolidated Study

## Sources

- Local gameplay footage:
  - `~/imgs/tent.mp4`
- Local Namu Wiki capture:
  - `~/imgs/index.html`

## Purpose

This document consolidates:

- direct textual mechanic descriptions from the local wiki capture
- observational findings from the gameplay video study
- implementation-relevant comparisons against current NodeWARS behavior

It is intended as a stronger reference for future Tentacle Wars fidelity work than the video-only study.

## Confidence Model

This study separates findings into:

- `Documented`
  - explicitly stated in the local wiki capture
- `Observed`
  - directly supported by the gameplay footage
- `Inferred`
  - not stated as a formula, but strongly implied by the combination of both sources

## Documented Mechanics From The Wiki

The local HTML capture contains enough embedded article text to treat it as a usable mechanic source.

### Core Energy Model

Documented:

- each cell has an energy value
- each stage has an energy cap
- the maximum cap in the whole game is `200`
- base regen starts at `1 energy every 2 seconds`
- friendly incoming tentacle flow increases energy by `1`
- hostile incoming tentacle flow decreases energy by `1`
- when a cell is reduced to `0`, it flips ownership and is restored to `10`

Implication:

- the original game appears to think in discrete packet flow much more explicitly than current NodeWARS
- the wiki language strongly supports a packetized lane model rather than a soft continuous budget model

### Neutral Cells

Documented:

- gray cells are neutral
- they do nothing on their own
- when they receive a certain amount of energy, they convert to a side

Implication:

- neutral capture is threshold-based and still energy-driven
- this aligns conceptually with NodeWARS neutral contest, even if the exact model differs

### Level Growth

Documented:

- higher energy means higher production and larger cell size
- when energy exceeds a threshold, the cell levels up
- level-down thresholds are lower than level-up thresholds to prevent immediate drop after promotion

This is an explicit confirmation of hysteresis in the original game.

That matters a lot, because we recently had to add level hysteresis to prevent visual and audio thrash near caps in NodeWARS.

### Level Thresholds And Regen Rates

Documented:

- `Spore`
  - ascend: `15`
  - descend: `5`
  - emits `1 energy every 2s`
- `Embryo`
  - ascend: `40`
  - descend: `30`
  - emits `1 energy every 1s`
- `Pulsar`
  - ascend: `80`
  - descend: `60`
  - emits `1 energy every 0.666...s`
- `Gamma`
  - ascend: `120`
  - descend: `100`
  - emits `1 energy every 0.5s`
- `Solar`
  - ascend: `160`
  - descend: `140`
  - emits `1 energy every 0.25s`
- `Dominator`
  - highest grade
  - emits `2 energy every 0.25s`

This is one of the most important pieces of hard mechanic data we have.

Practical reading:

- regen scales aggressively with level
- the top tier does not merely give more storage or more slots
- the top tiers radically change offensive throughput
- the final tier appears to multiply output in a way that feels much more explosive than current NodeWARS growth pacing

### Tentacle Count

Documented:

- cells can extend at least `1` tentacle
- they can extend up to `3` depending on the case

The wording suggests tentacle capacity is tied to level progression.

### Tentacle Cutting

Documented:

- tentacles can be cut after being extended
- cutting injects energy equal to the amount stored on the tentacle into the connected side
- cut position matters:
  - cutting near the stretched side sends more energy toward the destination side
  - cutting near the connection direction side sends less energy toward that side

This strongly supports the idea that cut geometry is not cosmetic in the original game.

### Tentacle Build Cost

Documented:

- extending a tentacle costs energy
- longer tentacles cost more
- if energy is insufficient during extension, the tentacle is canceled and returns to the origin cell

This matches a core NodeWARS principle already in place.

### Overflow

Documented:

- when a cell has reached its stage energy limit
- and receives more allied energy
- that energy exits through its connected tentacles
- the article explicitly calls this `overflow`

This is the single most important fidelity clue for the current NodeWARS roadmap.

It confirms that overflow is not just a visual feel issue or a speculative design theory. It is a documented part of the original game model.

### Tutorial Design

Documented:

- tutorial stages restrict the player to the instructed actions

This validates the recent direction we took in NodeWARS to gate tutorial interaction.

### Purple Faction

Documented:

- purple first appears in the later arc
- purple is described as smarter than red and blue enemies
- purple is associated with cutting lines quickly

This is an important fidelity note:

- purple should not merely be a recolor
- purple should be behaviorally distinct
- line-cut pressure is part of its identity

## Observations Confirmed By The Video

### Saturated Support Networks Matter A Lot

Observed:

- support triangles and short feedback loops create much stronger offensive output than isolated nodes
- attacks launched from saturated structures feel significantly stronger
- full allied cells visibly continue expressing pressure through active lanes

This is consistent with the documented overflow behavior.

### Flow Looks Packetized And Dense

Observed:

- lane traffic looks like dense repeated pulses, not a vague continuous leak
- pressure visually scales with network saturation

This aligns with the wiki wording that energy moves through tentacles in unit-like increments.

### Stage Caps Matter

Observed:

- visible stage caps in the footage include values like `60`, `70`, `100`, `150`, `200`
- the cap clearly influences tempo and how quickly a network can become threatening

This matches the wiki statement that each stage has its own energy limit, capped globally at `200`.

### Enemy Behavior Feels More Structural Than Current NodeWARS

Observed:

- enemies often feel more front-oriented and structure-aware than current NodeWARS AI
- the video does not prove a sophisticated planner
- but it does show stronger local support behavior and timing than a purely stat-driven opponent

This is consistent with the wiki's explicit note that purple is smarter and cuts lines aggressively.

## Strong Inferences

These are not direct formulas from the wiki, but they are strongly implied by the combination of text and footage.

### 1. Overflow Is A Primary Offensive Multiplier

The most important combined conclusion is:

- high-level saturated cells do not simply waste incoming support
- they convert excess energy into outbound lane pressure
- network saturation is therefore a core offensive mechanic, not just a defensive storage state

This is almost certainly why the original game feels so strong when building reinforcement triangles.

### 2. Current NodeWARS Is Still Too Flat In Its Feed Expression

Compared against the documented and observed Tentacle Wars model:

- NodeWARS currently distributes output too conservatively
- its offensive escalation from saturated support networks is too weak
- tentacles often feel underpowered relative to the structural setup required

This is the clearest confirmed mechanical gap between the two games.

### 3. Level Growth In Tentacle Wars Is More Meaningful Than A Pure Size/Rate Bump

Because documented regen jumps are steep:

- level growth increases both storage and throughput sharply
- the late grades appear to be true momentum breakpoints

Current NodeWARS progression can still feel comparatively restrained.

### 4. Purple Should Be More Than "Aggressive AI"

Because the wiki explicitly ties purple to line cutting:

- purple should pressure the board through slice-like disruption
- purple should threaten established player structures
- purple should feel like a tempo breaker, not just a stronger damage dealer

## High-Value Fidelity Targets For NodeWARS

If the goal is to move NodeWARS closer to Tentacle Wars without blind rewriting, these are the best targets.

### Target A: Overflow To Lane Pressure

This is the highest-value mechanic target.

Requirements:

- saturated allied cells should spill excess support into connected lanes
- reinforced structures should produce qualitatively stronger attacks
- the model should be parameterized, not hardcoded

### Target B: Stronger Level Throughput Breakpoints

NodeWARS should consider:

- more meaningful per-level throughput changes
- clearer network power spikes after promotion
- preserving hysteresis to avoid visual/audio thrash

### Target C: Packet Feel In Rendering

Even if the underlying simulation stays continuous:

- lane rendering should increasingly communicate discrete pressure packets
- dense overflow should be visible as visibly richer lane traffic

### Target D: Purple Identity Through Disruption

Purple should be improved around:

- timing of cuts
- pressure on established support structures
- opportunistic disruption of high-value player networks

### Target E: Tutorial And Player Messaging

If overflow becomes more faithful:

- onboarding should teach support triangles and saturated spill pressure explicitly

## What The Wiki Still Does Not Give Us

Even with this capture, some things remain incomplete:

- exact tentacle build cost formula
- exact neutral capture thresholds for all contexts
- exact AI target-selection functions
- precise packet travel speed
- exact overflow allocation rule when multiple tentacles are active

Those still need:

- isolated clips
- more frame-by-frame study
- or additional source material

## Comparison Against Current NodeWARS

### Already Aligned

- tentacle extension costs energy
- failed low-energy extension retracts
- cut location matters
- tutorials can be gated by instruction
- level hysteresis exists
- purple has distinct behavioral intent

### Partially Aligned

- level growth
- support structures
- AI front pressure
- cut-centric tactical play

### Still Meaningfully Divergent

- overflow expression
- strength of saturated support loops
- packetized feel of lane pressure
- degree of top-tier offensive throughput

## Recommended Next Implementation Study

Before changing gameplay code, the most useful next document would be a parameter-model report answering:

1. How should overflow be represented in NodeWARS?
2. Should overflow be:
   - direct spill to all connected lanes
   - spill only to active output lanes
   - stored as lane pressure buffer
   - or expressed through a network amplification multiplier?
3. How should top-tier output scale if we want a closer Tentacle Wars feel without breaking campaign balance?

## Final Executive Read

The local wiki capture is sufficient and valuable.

It confirms several mechanics that were previously only suspected from video:

- per-grade regen rates
- per-grade up/down thresholds
- explicit overflow behavior
- distance-sensitive tentacle build cost
- cut geometry effects
- purple's smarter, line-cutting identity

Together with the gameplay footage, this gives us a much stronger basis for future fidelity work than we had before.
