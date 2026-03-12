# Tentacle Feed Variance Report

## Purpose

Record the design concern that current tentacle feed can feel too weak and too uniform, especially compared to the high-pressure support triangles associated with classic Tentacle Wars play.

This report focuses on the broader gameplay problem:
- weak offensive feel from mature support structures
- lack of satisfying “energy spill” from capped support networks
- too little separation between immature and prepared attacks

This is not an implementation plan yet.

---

## Observed Gameplay Complaint

Current feedback:
- attacks often feel underpowered
- mature support triangles do not create the expected offensive surge
- energy that should feel “ready to spill” instead feels evenly flattened
- support is useful, but less dramatic than expected

This creates a flatter combat rhythm:
- fewer power spikes
- fewer decisive attacks from prepared positions
- less reward for building internal support topology

---

## Why This Matters

In this genre, part of the satisfaction comes from:
- setting up a support pattern
- watching cells saturate
- redirecting that built-up pressure into a single lane
- seeing a dramatic offensive payoff

If that payoff is weak:
- support topology feels less meaningful
- neutral and enemy attacks feel too similar
- the player loses a core tactical fantasy

This is not just balance.
It is feel, identity, and strategic reward.

---

## Current Model Behavior

The current outgoing feed behavior is structurally even:
- per-node source budget is computed from tier regen
- a self-regen fraction remains at the source
- the remainder is divided across outgoing tentacles

This means:
- adding more active lanes flattens the per-lane punch
- a mature triangle still distributes pressure, but often not explosively
- the system behaves rationally, but not dramatically

The model is stable.
The issue is expressiveness.

---

## Desired Gameplay Behavior

The intended feel seems to be:

- immature network:
  - weak
  - exploratory
  - fragile

- mature network:
  - compressed
  - dangerous
  - capable of real power projection

This implies the system should reward:
- cap proximity
- support topology
- committed offensive redirection

Without necessarily making every support lane overpowered at all times.

---

## Design Targets

The future system should ideally allow these effects to be tuned by variables:

### 1. Baseline Support Strength
How useful basic allied support is before any overflow or pressure bonus.

### 2. Saturation Payoff
How much stronger output becomes when a node is near cap.

### 3. Attack Bias
Whether overflow/feed bonuses apply equally to:
- ally support
- enemy attack
- neutral capture
- clash

### 4. Multi-Lane Penalty
How much offensive focus should weaken when the same node spreads into many lanes.

### 5. Reservoir Feel
Whether the system should feel:
- constant
- threshold-based
- burst-release based

---

## Most Likely Good Direction

The strongest candidate is:

### Saturation-based offensive spillover

Meaning:
- a node near max energy becomes a stronger source for outbound tentacles
- this effect can be stronger for attack than for support
- the bonus scales with how “full” the node is

This would restore the feeling that:
- capped support structures matter
- attack redirection is exciting
- prepared cells hit harder than average cells

---

## Why Pure Flat Multipliers Are Not Enough

Simply raising:
- `TIER_REGEN`
- `GLOBAL_REGEN_MULT`
- or reducing lane splitting

will improve attack strength, but usually in the wrong way:
- everything gets stronger
- early game changes too much
- support, neutral capture, and clashes all inflate together

That does not specifically solve the “prepared triangle attack” fantasy.

So the future model should be:
- context-sensitive
- preferably saturation-sensitive
- preferably attack-weighted

---

## Candidate Parameter Families

If this becomes implementation work later, useful parameters would likely include:

- `OVERFLOW_FEED_THRESHOLD_FRACTION`
- `OVERFLOW_FEED_ATTACK_MULT`
- `OVERFLOW_FEED_SUPPORT_MULT`
- `OVERFLOW_FEED_CAPTURE_MULT`
- `OVERFLOW_FEED_CLASH_MULT`
- `OVERFLOW_FEED_MAX_MULT`
- `OUTGOING_FOCUS_BONUS_PER_FULL_NEIGHBOR`
- `MULTI_LANE_FEED_FALLOFF`

These would allow tuning:
- when the extra pressure starts
- which lane types benefit most
- how strong the effect can get
- whether concentrated offense is rewarded more than broad distribution

---

## Expected Product Gains

If this problem is solved well, expected gains are:

- attacks feel more dangerous
- support triangles become tactically meaningful
- mature networks feel distinct from weak networks
- late game becomes more expressive without only relying on AI or raw numbers
- player agency increases because setup quality matters more

---

## Main Risks

The same system can go wrong if:

- capped nodes become too explosive
- neutral capture becomes too fast
- relay amplification stacks too hard
- clash becomes unreadably volatile
- late authored maps become snowbally

So any future implementation should be:
- parameterized
- conservative first
- validated through playtest on late/high-pressure phases

---

## Recommendation

Do not jump straight to “each tentacle gets fixed free feed.”

Instead, design a tunable system around:
- saturation-based output bonus
- stronger offensive spill from prepared nodes
- controlled variance between support and attack lanes

That is the most likely route to recover the missing classic feel without destabilizing the whole economy.

---

## Follow-Up Use

This report should be read together with:
- `docs/project/energy-feed-model-report-2026-03-10.md`

Use both when deciding whether to:
- keep the current conservative model
- add overflow pressure
- or experiment with a non-conservative feed economy later
