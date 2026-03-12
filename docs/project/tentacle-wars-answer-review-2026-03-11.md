# Tentacle Wars Answer Review

## Purpose

This document reviews the filled answer sheet and separates:

- decisions that are now strong enough to treat as implementation targets
- ambiguities that still need clarification
- new questions that emerged from the answers themselves

It should be read before drafting the Tentacle Wars mode architecture proposal.

## Source

- Answer sheet:
  - `docs/project/tentacle-wars-open-questions-answer-sheet-pt-BR-2026-03-11.md`

## Executive Summary

The answer sheet resolved most of the big product-direction questions.

The project now has strong direction on:

- making Tentacle Wars a separate game mode
- prioritizing mechanic fidelity over exact campaign reproduction
- using a packetized lane model
- using overflow as a primary offensive multiplier
- preserving current shell systems where possible

The biggest remaining uncertainties are not about direction anymore.
They are mostly about exact rule semantics:

- how packet size and per-level throughput relate
- how hostile capture should retain or transform incoming energy
- how strict slice input should be in the new mode
- how much of the current input layer can truly be shared without friction

## Resolved Decisions

These answers are strong enough to treat as current design intent.

### 1. Tentacle Wars should be a separate mode

Resolved:

- Tentacle Wars should be a parallel game mode, not a silent replacement of NodeWARS
- mechanic fidelity matters more than exact campaign reproduction
- campaign content can come later, after the core model is correct

Implementation meaning:

- keep NodeWARS intact
- build Tentacle Wars mode as a forked gameplay layer with shared shell systems

### 2. Overflow is a central mechanic

Resolved:

- overflow only begins when a cell is truly full
- overflow should spill through all active outgoing tentacles equally
- there is no target-type priority
- if no outgoing tentacle exists, overflow is lost

Implementation meaning:

- overflow is no longer optional flavor
- it becomes a first-class mode rule

### 3. Tentacles should be packet-driven

Resolved:

- the new mode should use real packet transfer, not only visual packet feel

Implementation meaning:

- Tentacle Wars mode should not simply reuse the current continuous feed logic with cosmetic rendering

### 4. Build cost should be pure distance cost

Resolved:

- tentacle cost is paid during growth
- cost grows linearly with distance
- no fixed base cost
- target type does not change build commitment

Implementation meaning:

- current NodeWARS build-cost assumptions should not be imported unchanged into the fidelity mode

### 5. Retract and cancellation should refund fully

Resolved:

- partial growth cancellation refunds fully
- manual retract behaves the same
- no intentional energy destruction on retract

Implementation meaning:

- energy conservation remains a hard invariant in the new mode

### 6. Cut payload should be construction energy plus in-transit energy

Resolved:

- lane cut value is not just current transit packets
- cut geometry controls how much goes forward versus back

Implementation meaning:

- Tentacle Wars mode should treat a lane as carrying both:
  - current transfer
  - invested construction payload

### 7. Neutral cells should have a separate acquisition cost

Resolved:

- neutral cells should keep:
  - their own energy level
  - a separate acquisition threshold
- initial proposed rule:
  - acquisition cost is `40%` of neutral energy

Implementation meaning:

- neutral capture should not just mirror hostile drain-to-zero logic

### 8. Purple should remain tactically distinct

Resolved:

- purple uses slice
- purple should use slice for:
  - burst
  - denial
  - redirection
- purple may value support triangles more strongly, especially in higher difficulty contexts

Implementation meaning:

- purple should remain the primary disruptive enemy profile in Tentacle Wars mode

### 9. Mode split by system is now clear

Resolved:

- likely shared:
  - rendering shell
  - input shell
  - save system
  - notifications
  - music
- likely forked:
  - energy model
  - grade table
  - AI tuning
  - campaign layouts

Implementation meaning:

- the new mode can be built without rewriting the entire product shell

### 10. Visual target for the new mode

Resolved:

- the mode should get visually closer to Tentacle Wars
- lane packet density should reflect overflow pressure
- audio can remain shared with current NodeWARS

Implementation meaning:

- Tentacle Wars mode is not just mechanical
- it has a visual identity goal too

## Ambiguities That Still Need Clarification

These are the most important unresolved points.

### A. Packet size versus packet rate versus throughput

The answer sheet strongly defines per-level output values:

- level 1 = `1 energy/s`
- level 2 = `1.5 energy/s`
- level 3 = `2 energy/s`
- level 4 = `2.5 energy/s`
- level 5 = `3 energy/s`

But packet language is still ambiguous.

What is unclear:

- are packets always size `1` and emitted at different frequencies?
- or can packets themselves be fractional?
- or is “energy/s” only a tuning shorthand and packets stay visually discrete but mechanically aggregate?

Why this matters:

- this affects the exact simulation structure of the new mode
- it also affects rendering and cut payload logic

### B. Dominator semantics

The answer to `P11` appears to answer a level-down threshold question:

- “It should descend at 180 energy”

The answer to `P12` says:

- throughput doubled

So the likely intended meaning is:

- Dominator has a higher drop threshold and doubled output

But we still need the full model explicitly.

What is unclear:

- what is Dominator's exact ascend threshold?
- what is Dominator's exact descend threshold?
- is Dominator packet size still `1` and only emission frequency changes?

### C. Hostile capture energy semantics

The answer to `P33` suggests:

- after hostile capture, leftover tentacle energy should continue into the captured node after subtracting capture cost

This is very important, but still not fully formalized.

What is unclear:

- does hostile capture use the same separate acquisition threshold as neutrals?
- or is hostile capture still based on drain-to-zero plus carryover?
- does every hostile capture restore to a fixed base and then add remaining payload, or skip the fixed base entirely?

### D. Exact neutral capture formula

The answer proposes:

- neutral acquisition cost = `40%` of neutral energy

This is clear as a design direction, but still not fully specified as a formula.

What is unclear:

- should the `40%` be rounded up, rounded down, or exact?
- should the threshold vary by level rather than by raw energy?
- should some phases override the ratio?

### E. Slice strictness in the new mode

The answer sheet did not choose yet between:

- stricter, more skill-demanding slice
- current more forgiving slice

This remains a design decision.

### F. Shared input layer viability

The answer wants the current input shell to be shared if possible.

That is likely viable, but still needs one explicit implementation review.

What is unclear:

- how much current click-connect logic can coexist with draw-connect without making the fidelity mode feel wrong?

## New Questions Raised By The Answers

These questions were not fully explicit before, but the answer sheet makes them necessary.

### 1. What is the exact Tentacle Wars grade table in NodeWARS-facing names?

The answer says:

- keep NodeWARS-facing names
- use original thresholds

That means we still need a final mapping document:

- NodeWARS grade name → Tentacle Wars threshold/output meaning

### 2. Should all overflow lanes receive the full incoming support amount, or should each lane receive the incoming support amount independently?

One answer suggests:

- overflow transbords to all outgoing tentacles with the same value as the sum received by incoming lanes

This sounds like deliberate lane multiplication.

That is a huge design choice and needs explicit confirmation.

Interpretation possibilities:

- `broadcast overflow`
  - every outgoing lane receives the full incoming overflow amount
- `split overflow`
  - overflow is duplicated visually but conserved mechanically

This is probably the single most important follow-up question.

### 3. How should ally-support loops be prevented from becoming infinite explosive feedback systems?

The current answers support:

- strong overflow
- equal-priority output lanes
- no loss on retract
- meaningful network amplification

This is good for fidelity, but it means the Tentacle Wars mode needs one of these:

- hard stage caps doing more work
- packet bottlenecks
- lane travel delay
- limited outgoing lane count
- or all of the above

We should specify which systems provide stability.

### 4. How should purple coexist with red in the new mode?

The answer says:

- in Tentacle Wars, all enemy colors should be able to fight each other
- but this may remain parameterizable

This means we now need a mode rule:

- should Tentacle Wars mode always disable the current red-purple coalition?
- or should coalition remain available as a variant, not the default?

### 5. How many starter phases should be built before the full mode expands?

The answer says:

- first get the mechanic right
- then worry about maps
- build a few phases first

So we now need a concrete rollout question:

- how many prototype phases are enough before broader mode expansion?

## Recommended Follow-Up Questions

These are the most valuable questions to answer next.

### FQ1. Overflow duplication rule

When a full cell receives support and has multiple outgoing tentacles, should:

- each outgoing tentacle receive the full overflow amount
- or should the overflow be divided equally among outgoing tentacles
- or should there be a third rule?

### FQ2. Packet implementation rule

In the Tentacle Wars mode, should packet logic use:

- fixed packet size `1` with different emission timing
- level-dependent packet size
- or fixed packet size plus throughput multipliers?

### FQ3. Dominator thresholds

Please define:

- Dominator ascend threshold
- Dominator descend threshold
- Dominator packet/output rule

### FQ4. Hostile capture rule

When a hostile node is captured:

- does it restore to a fixed base first?
- does leftover lane payload then add on top?
- or is there no fixed restore value in the new mode?

### FQ5. Slice strictness rule

For Tentacle Wars mode:

- should slice detection be stricter than the current NodeWARS default?
- if yes, in what way:
  - smaller hit corridor
  - faster gesture requirement
  - less forgiveness near endpoints

### FQ6. Prototype scope

For the first playable Tentacle Wars mode prototype:

- how many phases should exist?
- should it include purple immediately?
- should it include only the base grades first?

## Recommended Next Artifact

After the follow-up questions above are answered, the next document should be:

- `Tentacle Wars Mode Architecture Proposal`

That proposal should define:

- mode boundaries
- shared versus forked systems
- packet/overflow simulation model
- hostile/neutral capture rules
- prototype rollout plan
