# Tentacle Wars Video Study

## Source

- Video: `~/imgs/tent.mp4`
- Length: `1207.41s`
- Coverage: a single player run through `20` phases
- Sampling used for this first pass:
  - coarse snapshots every `60s`
  - additional coarse extraction every `20s`
  - manual visual inspection of representative mid- and late-run states

## Scope

This report is a first-pass mechanical study from video evidence only.

It is useful for:

- pacing and feel estimates
- support / overflow pattern recognition
- enemy behavior characterization
- identifying the strongest differences from the current NodeWARS model

It is **not** sufficient to derive exact formulas with confidence for:

- per-level regen values
- build cost formulas
- exact capture-rate equations
- exact AI decision functions

Those need finer frame-by-frame clips or multiple isolated samples per mechanic.

## High-Confidence Observations

### 1. Surplus energy is strongly expressed through active tentacles

The single strongest gameplay signature visible in the run is this:

- support triangles and short reinforcement loops produce very high outbound pressure
- once linked nodes are stable and full, tentacles visibly carry sustained, dense traffic
- offensive launches from those saturated structures are much more forceful than isolated single-node attacks

This matches the design problem already observed in NodeWARS:

- the original game clearly rewards network saturation
- current NodeWARS still reads as too budget-sliced and too flat in offensive escalation

### 2. Support loops are not cosmetic; they are central strategy

The run repeatedly shows:

- triangles
- short chains
- back-support lanes
- staggered reinforcement into the same front

These are not rare edge tactics.
They appear to be a foundational way to create offensive mass.

Implication:

- any future feed model should explicitly support "charged network" behavior
- isolated attack lanes should stay weaker than multi-node reinforced lanes

### 3. Tentacle flow reads as packetized and pressure-rich

The original game visually communicates flow as dense, repeated pulses moving through the lane.

What matters here is not only appearance:

- the density of packet movement correlates with the feeling of pressure
- multiple reinforced lanes create a strong perception of momentum

Implication:

- future work should treat flow density as both a gameplay and readability issue
- if NodeWARS evolves toward stronger overflow mechanics, render density should scale with that output

### 4. Human play relies heavily on timing and redirection, not only raw expansion

Across the observed stages, the player repeatedly wins through:

- fast redirection
- selective reinforcement
- choosing where to saturate first
- using structure, not just map-wide spam

Implication:

- if AI is improved, it should learn to:
  - build stronger local structures
  - exploit overextended player fronts
  - punish isolated nodes after support lanes are established

### 5. Stage power limit meaningfully shapes pacing

Visible limits in sampled frames:

- `60`
- `70`
- `100`
- `150`
- `200`

This suggests that stage-level caps strongly govern tempo and attack scale.

Implication:

- a cap touching level thresholds must remain visually stable
- cap-sensitive overflow should be treated as a first-class tuning surface

## Medium-Confidence Observations

### 6. Overflow appears to convert into lane pressure rather than being mostly trapped in the node

The video strongly suggests this pattern:

- once a node and its support network are near saturation
- additional production is effectively expressed as stronger outgoing lane flow

This does **not** look like the current NodeWARS behavior where:

- the node still participates in output
- but the resulting lane pressure often feels too diluted

Likely implication:

- the original game behaves closer to "surplus spills into connected lanes"
- not merely "remaining budget is divided across tentacles"

### 7. Attack effectiveness scales nonlinearly with structure

A single node attacking does not appear equivalent to:

- the same node backed by one support lane
- or by two saturated support lanes

The video gives the impression that support networks reach a qualitatively stronger state, not just a marginally better one.

Implication:

- NodeWARS should probably not stop at a linear feed tweak
- a future model may need:
  - overflow conversion
  - feed amplification when the source network is saturated
  - or another parametrized network-pressure mechanism

### 8. Enemy behavior looks structurally smarter than current NodeWARS, even if still simple

From the run:

- enemies do not look brilliant in a planner sense
- but they do create more readable front pressure than current NodeWARS AI
- they feel less passive and less numerically arbitrary

Implication:

- the current AI wave improved NodeWARS, but there is still room to increase:
  - local support building
  - front concentration
  - timing around saturated nodes

## Low-Confidence / Needs Dedicated Sampling

These are visible, but not measured strongly enough from this first pass:

### 9. Exact regen per node level

The video does not provide enough isolated, stable samples to derive clean numeric regen values.

### 10. Exact tentacle build cost

The video suggests strong structural advantage from saturated loops, but does not isolate the exact cost of opening a lane.

### 11. Exact level thresholds

Node values are visible, but not consistently enough during transitions to derive a reliable threshold table from this single coarse pass.

### 12. Exact enemy AI slice usage

The video is better for strategic feel than for precise confirmation of AI slice behavior.

## Comparison Against Current NodeWARS

### Strong mismatch today

Current NodeWARS still underdelivers on:

- charged support triangles
- surplus pressure spilling into lanes
- highly forceful attacks after network saturation

That is the clearest mechanic gap exposed by this video.

### Moderate mismatch today

Current NodeWARS AI is improving, but still likely underuses:

- structural reinforcement before attack
- concentrated front pressure from saturated networks
- behavior that makes the board feel "alive" rather than stat-driven

### Areas already moving in the right direction

NodeWARS already has useful foundations for a future convergence:

- draw/connect lane interaction
- canonical slice path
- relay infrastructure
- authored maps
- stronger AI differentiation than before

## Recommended Next Analysis Pass

To go from "good first-pass study" to "implementation-ready tuning model", the next pass should isolate four mechanics:

### A. Support triangle charging

Need:

- a short clip where three allied nodes stabilize and then one attacks

Goal:

- estimate how much stronger outbound pressure becomes once the network is saturated

### B. Level transition thresholds

Need:

- a close-up clip of one node rising across multiple levels with no clutter

Goal:

- estimate level thresholds and cap interactions

### C. Overflow behavior

Need:

- a clip where a full node with active support starts leaking large output into a new lane

Goal:

- infer whether overflow is:
  - direct lane spill
  - lane amplification
  - or source-side pressure scaling

### D. Enemy structural play

Need:

- a clip where enemy nodes set up support before attacking

Goal:

- distinguish between:
  - pure numeric regen pressure
  - versus actual structural decision-making

## Recommended Product Implications

### Priority 1

Create a future feed-model wave centered on:

- saturated-node surplus behavior
- support-network amplification
- stronger offensive pressure from reinforced triangles

### Priority 2

Do not treat this only as balance.
Treat it as a systemic gameplay identity question.

### Priority 3

Couple any future feed-model change with:

- stronger lane-flow visuals
- AI structure-building improvements

Otherwise the mechanic may exist numerically but still not feel like Tentacle Wars.

## Executive Conclusion

The video confirms the main suspicion:

The original Tentacle Wars feel is not just about regen numbers.
It is about **network saturation turning into meaningful offensive pressure**.

That is the clearest difference from current NodeWARS and the most valuable direction for a future mechanics wave.
