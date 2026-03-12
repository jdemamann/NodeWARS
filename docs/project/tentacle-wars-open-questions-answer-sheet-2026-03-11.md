# Tentacle Wars Adaptation Answer Sheet

## Purpose

Use this document to answer the open questions from:

- `docs/project/tentacle-wars-open-questions-2026-03-11.md`

This sheet is intentionally separate so the original question set remains a clean reference.

## How To Fill This Out

For each question:

- write your answer in `Answer`
- add any nuance, examples, or uncertainty in `Notes`
- set a confidence value:
  - `high`
  - `medium`
  - `low`

If a question has no answer yet, leave it blank.

---

## 1. Core Energy And Overflow Model

### 1.1 Overflow allocation rule

#### Q1

Question:

When a full cell receives allied energy, does that energy spill into every active outgoing tentacle, or only some of them?

Answer:

Notes:

Confidence:

#### Q2

Question:

If multiple outgoing tentacles exist, does one get priority?

Answer:

Notes:

Confidence:

#### Q3

Question:

Does overflow care whether the target is allied, neutral, or hostile?

Answer:

Notes:

Confidence:

#### Q4

Question:

Does overflow require the cell to be fully capped, or does it begin slightly before the cap?

Answer:

Notes:

Confidence:

### 1.2 Source output model before overflow

#### Q5

Question:

Does a non-full cell still push regular energy into connected allied tentacles?

Answer:

Notes:

Confidence:

#### Q6

Question:

Or is the major lane pressure only created once the cell is saturated?

Answer:

Notes:

Confidence:

#### Q7

Question:

If regular output exists before overflow, how strong is it compared to overflow pressure?

Answer:

Notes:

Confidence:

### 1.3 Packet behavior versus continuous flow

#### Q8

Question:

Should the Tentacle Wars mode simulate actual discrete packet transfer?

Answer:

Notes:

Confidence:

#### Q9

Question:

Or should it preserve continuous simulation and only emulate packet feel in logic/rendering?

Answer:

Notes:

Confidence:

#### Q10

Question:

If packetized, should packet size always be `1`, except for `Dominator`?

Answer:

Notes:

Confidence:

### 1.4 Dominator overflow behavior

#### Q11

Question:

How should `Dominator` output be modeled in a future mode?

Answer:

Notes:

Confidence:

#### Q12

Question:

Is it “two packets at once,” “double packet size,” or just “double throughput”?

Answer:

Notes:

Confidence:

---

## 2. Tentacle Cost, Growth, And Refund

### 2.1 Exact tentacle build cost rule

#### Q13

Question:

Does the original game pay tentacle cost entirely upfront or during growth?

Answer:

Notes:

Confidence:

#### Q14

Question:

If progressive, is the cost linear with distance?

Answer:

Notes:

Confidence:

#### Q15

Question:

Is there a fixed base cost plus distance cost, or only distance cost?

Answer:

Notes:

Confidence:

#### Q16

Question:

Are neutral and hostile targets treated differently for build commitment?

Answer:

Notes:

Confidence:

### 2.2 Refund on retract / cancellation

#### Q17

Question:

If a growing tentacle is canceled before reaching the target, does the source get everything back?

Answer:

Notes:

Confidence:

#### Q18

Question:

Does a manual retract behave the same as an interrupted growth?

Answer:

Notes:

Confidence:

#### Q19

Question:

Is there any situation where retract destroys invested energy instead of refunding it?

Answer:

Notes:

Confidence:

### 2.3 Stored lane energy and cut yield

#### Q20

Question:

What determines the amount released by a cut?

Answer:

Notes:

Confidence:

#### Q21

Question:

Is it just current in-flight energy?

Answer:

Notes:

Confidence:

#### Q22

Question:

Or do tentacles hold a deeper “stored pressure” reserve?

Answer:

Notes:

Confidence:

---

## 3. Level Progression And Threshold Semantics

### 3.1 Grade naming strategy

#### Q23

Question:

Should the mode preserve original grade names for fidelity?

Answer:

Notes:

Confidence:

#### Q24

Question:

Or should names stay as NodeWARS-facing terminology while the mechanics become more faithful?

Answer:

Notes:

Confidence:

### 3.2 Maximum number of grades in the mode

#### Q25

Question:

Do we want exact original grade thresholds?

Answer:

Notes:

Confidence:

#### Q26

Question:

Or only their pacing/feel translated into current progression slots?

Answer:

Notes:

Confidence:

### 3.3 Stage cap interaction with grades

#### Q27

Question:

In the original game, are some phases explicitly designed to lock out higher grades?

Answer:

Notes:

Confidence:

#### Q28

Question:

Should a Tentacle Wars mode reproduce those cap bottlenecks phase-by-phase?

Answer:

Notes:

Confidence:

---

## 4. Neutral Capture And Ownership

### 4.1 Neutral capture threshold rule

#### Q29

Question:

How should neutral conversion be modeled in Tentacle Wars mode?

Answer:

Notes:

Confidence:

#### Q30

Question:

Is it best represented as packet accumulation to a threshold?

Answer:

Notes:

Confidence:

#### Q31

Question:

Should neutral cells have visible or invisible capture requirements?

Answer:

Notes:

Confidence:

### 4.2 Capture starting energy after conversion

#### Q32

Question:

When a neutral cell turns friendly, what energy should it start with?

Answer:

Notes:

Confidence:

#### Q33

Question:

Should this differ from hostile capture?

Answer:

Notes:

Confidence:

### 4.3 Multi-source neutral capture

#### Q34

Question:

Should simultaneous allied feeds stack directly for neutral capture?

Answer:

Notes:

Confidence:

#### Q35

Question:

Is there any diminishing return when many cells feed the same neutral?

Answer:

Notes:

Confidence:

---

## 5. Enemy And Purple AI Behavior

### 5.1 Slice usage by non-player opponents

#### Q36

Question:

Which enemy colors use cut behavior in the original game?

Answer:

Notes:

Confidence:

#### Q37

Question:

Does purple cut mostly:

- for burst damage
- for lane denial
- for rapid redirection
- for all three?

Answer:

Notes:

Confidence:

#### Q38

Question:

How frequently should the enemy be allowed to cut without feeling unfair?

Answer:

Notes:

Confidence:

### 5.2 Enemy structural planning

#### Q39

Question:

Should a Tentacle Wars mode AI explicitly value support triangles?

Answer:

Notes:

Confidence:

#### Q40

Question:

Or will faithful energy/overflow rules naturally produce that behavior even from a simpler heuristic?

Answer:

Notes:

Confidence:

### 5.3 Purple faction role in a Tentacle Wars mode

#### Q41

Question:

Do we want to preserve NodeWARS coalition color logic in the fidelity mode?

Answer:

Notes:

Confidence:

#### Q42

Question:

Or should the mode move closer to the original enemy-role structure even if that diverges from current campaign logic?

Answer:

Notes:

Confidence:

---

## 6. Input Model And Player Control

### 6.1 Click-connect versus draw-connect

#### Q43

Question:

Should the mode default to draw-connect only?

Answer:

Notes:

Confidence:

#### Q44

Question:

Or should click-connect remain available as accessibility / convenience?

Answer:

Notes:

Confidence:

### 6.2 Slice gesture strictness

#### Q45

Question:

Should the fidelity mode make slice stricter and more skill-based?

Answer:

Notes:

Confidence:

#### Q46

Question:

Or preserve the current generous gesture handling for responsiveness?

Answer:

Notes:

Confidence:

---

## 7. Campaign And Mode Separation

### 7.1 Scope of the new mode

#### Q47

Question:

Should `TentacleWars` mode initially ship as:

- only a sandbox / skirmish mode
- a subset of phases
- or a full campaign fork?

Answer:

Notes:

Confidence:

#### Q48

Question:

Should the first implementation focus only on the energy/overflow model before reproducing maps and enemy identities?

Answer:

Notes:

Confidence:

### 7.2 Shared systems versus forked systems

#### Q49

Question:

Which current systems should be shared between both modes?

Possible candidates:

- rendering
- input
- save system
- notifications
- music

Answer:

Notes:

Confidence:

#### Q50

Question:

Which systems should likely fork?

Possible candidates:

- energy model
- grade table
- AI tuning
- campaign layouts

Answer:

Notes:

Confidence:

### 7.3 Campaign fidelity target

#### Q51

Question:

Is the Tentacle Wars mode intended to be:

- mechanically inspired
- mechanically close
- or phase-by-phase reconstruction?

Answer:

Notes:

Confidence:

#### Q52

Question:

How important is exact campaign reproduction versus mechanic faithfulness?

Answer:

Notes:

Confidence:

---

## 8. Visual And Audio Fidelity Questions

### 8.1 Lane flow rendering

#### Q53

Question:

How close should packet visuals get to the original game?

Answer:

Notes:

Confidence:

#### Q54

Question:

Should lane density directly reflect overflow pressure in the fidelity mode?

Answer:

Notes:

Confidence:

### 8.2 Cell grade visuals

#### Q55

Question:

Do we want visual fidelity for grades in the Tentacle Wars mode?

Answer:

Notes:

Confidence:

#### Q56

Question:

Or should only the mechanics change, keeping current NodeWARS art language?

Answer:

Notes:

Confidence:

### 8.3 Music and sound direction

#### Q57

Question:

Should the Tentacle Wars mode also shift music and SFX direction?

Answer:

Notes:

Confidence:

#### Q58

Question:

Or should it keep the current NodeWARS audiovisual identity while only mechanics change?

Answer:

Notes:

Confidence:
