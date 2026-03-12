# Tentacle Wars Adaptation Open Questions

## Purpose

This document captures the biggest remaining uncertainties in the Tentacle Wars adaptation effort.

It is meant to be answered progressively so the project can move from:

- partial mechanic understanding
- strong video/wiki inference

to:

- explicit implementation targets
- parameterized fidelity rules
- low-drift adaptation planning

It focuses on what is still unknown, ambiguous, or design-sensitive.

## How To Use This Document

- answer questions with the highest implementation value first
- prefer concrete observations over general impressions
- if a behavior differs by phase, note the phase family
- if something is uncertain, record confidence rather than forcing precision

## Confidence Legend

- `High confidence`
  - a direct answer would unlock implementation safely
- `Medium confidence`
  - useful for tuning and product decisions
- `Low confidence`
  - good to know, but not a blocker for early adaptation waves

---

## 1. Core Energy And Overflow Model

These are the most important unanswered questions for a Tentacle Wars mode.

### 1.1 Overflow allocation rule

Confidence: `High`

What we already know:

- full cells overflow into tentacles
- support triangles and saturated networks produce much stronger pressure

What is still unclear:

- does overflow go into all active allied tentacles equally?
- does it prefer the most recent lane?
- does it prefer the lane currently pushing into an enemy?
- does it go only into outbound lanes and never into inbound support lanes?
- does it spill continuously or in discrete packets triggered by incoming support?

Why this matters:

- this is probably the single biggest gap between current NodeWARS and Tentacle Wars feel

Questions:

1. When a full cell receives allied energy, does that energy spill into every active outgoing tentacle, or only some of them?
2. If multiple outgoing tentacles exist, does one get priority?
3. Does overflow care whether the target is allied, neutral, or hostile?
4. Does overflow require the cell to be fully capped, or does it begin slightly before the cap?

### 1.2 Source output model before overflow

Confidence: `High`

What we already know:

- base cell regen is documented
- higher levels increase production strongly

What is still unclear:

- before a cell reaches full saturation, how much of its production is kept locally versus pushed into tentacles?
- are tentacles fed only by excess energy, or also by the cell's normal output stream?

Questions:

1. Does a non-full cell still push regular energy into connected allied tentacles?
2. Or is the major lane pressure only created once the cell is saturated?
3. If regular output exists before overflow, how strong is it compared to overflow pressure?

### 1.3 Packet behavior versus continuous flow

Confidence: `High`

What we already know:

- the original game reads as packetized
- the wiki language also suggests discrete energy units

What is still unclear:

- is the simulation truly packetized, or only visually packetized?
- are packets emitted at level-specific intervals and then transmitted one by one?

Questions:

1. Should the Tentacle Wars mode simulate actual discrete packet transfer?
2. Or should it preserve continuous simulation and only emulate packet feel in logic/rendering?
3. If packetized, should packet size always be `1`, except for `Dominator`?

### 1.4 Dominator overflow behavior

Confidence: `High`

What we already know:

- `Dominator` emits `2 energy every 0.25s`

What is still unclear:

- does this also mean overflow spill is doubled?
- do dominators simply emit more packets, or larger packets?

Questions:

1. How should `Dominator` output be modeled in a future mode?
2. Is it “two packets at once,” “double packet size,” or just “double throughput”?

---

## 2. Tentacle Cost, Growth, And Refund

### 2.1 Exact tentacle build cost rule

Confidence: `High`

What we already know:

- creating a tentacle costs energy
- longer tentacles cost more
- failed growth retracts when energy is insufficient

What is still unclear:

- exact cost formula
- whether cost is paid upfront, progressively, or hybrid

Questions:

1. Does the original game pay tentacle cost entirely upfront or during growth?
2. If progressive, is the cost linear with distance?
3. Is there a fixed base cost plus distance cost, or only distance cost?
4. Are neutral and hostile targets treated differently for build commitment?

### 2.2 Refund on retract / cancellation

Confidence: `High`

What we already know:

- current NodeWARS refunds retracts
- the original wiki states that if extension fails due to insufficient energy, the tentacle returns

What is still unclear:

- does the original game fully refund partially grown tentacles?
- is there a loss on cancellation, or is it lossless?

Questions:

1. If a growing tentacle is canceled before reaching the target, does the source get everything back?
2. Does a manual retract behave the same as an interrupted growth?
3. Is there any situation where retract destroys invested energy instead of refunding it?

### 2.3 Stored lane energy and cut yield

Confidence: `High`

What we already know:

- cutting injects energy from the tentacle
- cut position changes the distribution

What is still unclear:

- what exactly is stored in a lane?
- is it path length, current packets in transit, or accumulated lane charge?

Questions:

1. What determines the amount released by a cut?
2. Is it just current in-flight energy?
3. Or do tentacles hold a deeper “stored pressure” reserve?

---

## 3. Level Progression And Threshold Semantics

### 3.1 Grade naming strategy

Confidence: `Medium`

What we already know:

- the original game uses grade names like `Spore`, `Embryo`, `Pulsar`, `Gamma`, `Solar`, `Dominator`

What is still unclear:

- in a Tentacle Wars mode, should we preserve those exact names?
- or keep NodeWARS names in the UI and only adapt mechanics?

Questions:

1. Should the mode preserve original grade names for fidelity?
2. Or should names stay as NodeWARS-facing terminology while the mechanics become more faithful?

### 3.2 Maximum number of grades in the mode

Confidence: `High`

What we already know:

- the original grade table is documented

What is still unclear:

- should the Tentacle Wars mode use that exact six-grade structure?
- or should it compress into the existing NodeWARS progression system?

Questions:

1. Do we want exact original grade thresholds?
2. Or only their pacing/feel translated into current progression slots?

### 3.3 Stage cap interaction with grades

Confidence: `High`

What we already know:

- stages cap cell energy
- caps visibly shape pacing

What is still unclear:

- how often do stage caps intentionally stop you before certain grades?
- how much of campaign identity comes from cap-limited growth versus map structure?

Questions:

1. In the original game, are some phases explicitly designed to lock out higher grades?
2. Should a Tentacle Wars mode reproduce those cap bottlenecks phase-by-phase?

---

## 4. Neutral Capture And Ownership

### 4.1 Neutral capture threshold rule

Confidence: `High`

What we already know:

- neutral cells convert after receiving enough energy

What is still unclear:

- is the neutral threshold equal to current energy?
- equal to a hidden capture stat?
- equal to “enough net packets over time”?

Questions:

1. How should neutral conversion be modeled in Tentacle Wars mode?
2. Is it best represented as packet accumulation to a threshold?
3. Should neutral cells have visible or invisible capture requirements?

### 4.2 Capture starting energy after conversion

Confidence: `High`

What we already know:

- enemy capture to `0` restores the flipped cell to `10`

What is still unclear:

- do neutral captures also start from a fixed restored value?
- or do they retain a portion of the injected energy?

Questions:

1. When a neutral cell turns friendly, what energy should it start with?
2. Should this differ from hostile capture?

### 4.3 Multi-source neutral capture

Confidence: `Medium`

What we already know:

- the original game clearly rewards multiple cells feeding into one target

What is still unclear:

- how neutral accumulation behaves with multiple simultaneous sources in packet terms

Questions:

1. Should simultaneous allied feeds stack directly for neutral capture?
2. Is there any diminishing return when many cells feed the same neutral?

---

## 5. Enemy And Purple AI Behavior

### 5.1 Slice usage by non-player opponents

Confidence: `High`

What we already know:

- purple is associated with cutting lines quickly
- video and text both support that identity

What is still unclear:

- how often do enemies cut?
- do red/blue also cut, or mainly purple?
- are cuts reactive, proactive, or both?

Questions:

1. Which enemy colors use cut behavior in the original game?
2. Does purple cut mostly:
   - for burst damage
   - for lane denial
   - for rapid redirection
   - for all three?
3. How frequently should the enemy be allowed to cut without feeling unfair?

### 5.2 Enemy structural planning

Confidence: `High`

What we already know:

- enemies in the video feel more structure-aware than current NodeWARS AI

What is still unclear:

- do they deliberately form support loops?
- or is that simply an emergent side effect of faster, stronger lane logic?

Questions:

1. Should a Tentacle Wars mode AI explicitly value support triangles?
2. Or will faithful energy/overflow rules naturally produce that behavior even from a simpler heuristic?

### 5.3 Purple faction role in a Tentacle Wars mode

Confidence: `Medium`

What we already know:

- purple is smarter
- purple cuts aggressively

What is still unclear:

- should purple remain a later-campaign specialist faction in the Tentacle Wars mode?
- or should faction differentiation be reduced to stay closer to the original progression?

Questions:

1. Do we want to preserve NodeWARS coalition color logic in the fidelity mode?
2. Or should the mode move closer to the original enemy-role structure even if that diverges from current campaign logic?

---

## 6. Input Model And Player Control

### 6.1 Click-connect versus draw-connect

Confidence: `High`

What we already know:

- Tentacle Wars is fundamentally draw-to-connect in feel
- current NodeWARS supports click and drag workflows

What is still unclear:

- should a future Tentacle Wars mode force draw-connect as the primary input?
- or keep click-connect as a convenience option?

Questions:

1. Should the mode default to draw-connect only?
2. Or should click-connect remain available as accessibility / convenience?

### 6.2 Slice gesture strictness

Confidence: `Medium`

What we already know:

- cutting is central
- cut position matters

What is still unclear:

- how strict should the gesture be?
- should fast, loose cuts count as often as today?

Questions:

1. Should the fidelity mode make slice stricter and more skill-based?
2. Or preserve the current generous gesture handling for responsiveness?

---

## 7. Campaign And Mode Separation

These questions matter because we are now considering a separate Tentacle Wars mode instead of replacing NodeWARS mechanics directly.

### 7.1 Scope of the new mode

Confidence: `High`

Questions:

1. Should `TentacleWars` mode initially ship as:
   - only a sandbox / skirmish mode
   - a subset of phases
   - or a full campaign fork?
2. Should the first implementation focus only on the energy/overflow model before reproducing maps and enemy identities?

### 7.2 Shared systems versus forked systems

Confidence: `High`

Questions:

1. Which current systems should be shared between both modes?
   - rendering
   - input
   - save system
   - notifications
   - music
2. Which systems should likely fork?
   - energy model
   - grade table
   - AI tuning
   - campaign layouts

### 7.3 Campaign fidelity target

Confidence: `Medium`

Questions:

1. Is the Tentacle Wars mode intended to be:
   - mechanically inspired
   - mechanically close
   - or phase-by-phase reconstruction?
2. How important is exact campaign reproduction versus mechanic faithfulness?

---

## 8. Visual And Audio Fidelity Questions

### 8.1 Lane flow rendering

Confidence: `Medium`

Questions:

1. How close should packet visuals get to the original game?
2. Should lane density directly reflect overflow pressure in the fidelity mode?

### 8.2 Cell grade visuals

Confidence: `Medium`

What we already know:

- the wiki gives visual descriptors for each grade

Questions:

1. Do we want visual fidelity for grades in the Tentacle Wars mode?
2. Or should only the mechanics change, keeping current NodeWARS art language?

### 8.3 Music and sound direction

Confidence: `Low`

Questions:

1. Should the Tentacle Wars mode also shift music and SFX direction?
2. Or should it keep the current NodeWARS audiovisual identity while only mechanics change?

---

## 9. Highest-Value Questions To Answer First

If we only answer a small subset first, these are the most important:

1. How exactly should overflow be allocated into active tentacles?
2. Should the Tentacle Wars mode use a truly packetized model or a continuous approximation?
3. Should tentacle cost be progressive, upfront, or hybrid in the fidelity mode?
4. How should neutral capture thresholds and post-capture energy be modeled?
5. How aggressively should purple use cut behavior?
6. Should Tentacle Wars mode be a separate game mode with shared shell systems but forked gameplay systems?

---

## 10. Recommended Next Step

After these questions are answered, the next most useful artifact would be:

- a `Tentacle Wars Mode Architecture Proposal`

That document should define:

- mode boundaries
- shared versus forked systems
- parameter model for overflow and level progression
- rollout order for the new mode
