# Tentacle Wars Answer Readiness Report

## Purpose

This document evaluates whether the answered material is now sufficient to support a well-structured Tentacle Wars mode proposal.

It separates:

- what is now solid enough to treat as project direction
- what still needs explicit clarification
- whether we can safely move into an architecture proposal

## Executive Read

Yes, the answered material is now strong enough to support the next architectural step.

We do **not** need to keep gathering broad generic information before drafting the mode proposal.

However, a small number of rule-level clarifications still matter if we want the project structure to be:

- mechanically coherent
- safely parameterized
- low-risk for implementation drift

So the right conclusion is:

- we have enough to move forward
- but we should resolve a handful of high-impact ambiguities before finalizing the simulation design

## What Is Now Strong Enough

These parts are sufficiently defined to support project architecture.

### 1. Product strategy

Strongly resolved:

- Tentacle Wars should be a separate mode
- NodeWARS should remain intact
- mechanic fidelity matters more than exact campaign reproduction
- the first implementation should focus on core mechanics before campaign scope expands

This is enough to structure the project around:

- shared shell systems
- forked gameplay systems
- a prototype-first rollout

### 2. Energy model direction

Strongly resolved:

- packet-based transfer is the intended direction
- overflow is mandatory and central
- overflow begins only at full capacity
- overflow should not depend on target type
- retract and interrupted growth should refund fully

This is enough to define the mode around a true packet/overflow simulation instead of continuous budget slicing.

### 3. Tentacle economics

Strongly resolved:

- cost is progressive during growth
- cost is linear with distance
- no base construction cost
- construction cost does not vary by target type

This is enough to establish a clean, parameterized build-cost subsystem.

### 4. Capture direction

Strongly resolved:

- neutral capture should use a separate acquisition threshold
- multi-source neutral capture should stack directly
- no diminishing return is desired

This is enough to treat neutral capture as a distinct system from hostile takeover.

### 5. Mode visual and input intent

Strongly resolved:

- draw-connect should be valid
- click-connect may stay as convenience
- visual style in the new mode should move closer to Tentacle Wars
- audio can stay shared for now

This is enough to avoid blocking architecture on presentation details.

## What Is Still Ambiguous

These are the remaining issues that still affect architecture quality.

### A. Broadcast overflow versus split overflow

This is the biggest remaining ambiguity.

Your answer currently implies:

- when a full cell receives energy
- every outgoing tentacle receives the full incoming overflow amount

That means overflow behaves like lane multiplication, not conservation.

This may be exactly what you want, but it has major consequences:

- support loops become extremely explosive
- pressure scales very fast
- stage caps and lane counts become even more important to contain runaway feedback

This point is not a blocker, but it is the single most important rule to freeze consciously.

### B. Packet semantics are still only partially formalized

We now know:

- packet transfer is desired
- throughput should vary by level

But we do not yet have a fully explicit rule for:

- packet size
- emission interval
- how fractional output like `1.5/s` is represented

This is not a product-direction problem anymore.
It is a simulation-design problem.

### C. Dominator needs full numeric definition

We now have:

- descend threshold suggestion
- throughput doubled

But we still need a complete rule set:

- ascend threshold
- descend threshold
- packet behavior
- lane count

This should be specified before implementing the grade table.

### D. Hostile capture still needs stricter formalization

Your intent is clear:

- no energy should be wasted
- hostile takeover should preserve energy carried by lanes

But the exact mechanic still needs a formal rule:

- fixed reset first, then carryover?
- or carryover-only after zero?
- and how hostile lane energy interacts during takeover?

This is important because it affects:

- combat feel
- energy conservation
- chain captures

### E. Slice strictness is good enough to proceed, but not fully “designed”

Your answer effectively says:

- keep current responsiveness

That is enough to move forward.

So this is not a blocker.

It just means the first Tentacle Wars mode should probably:

- reuse the current slice generosity
- and postpone stricter fidelity experiments until after the first prototype is playable

## New Questions That Are Worth Asking

These are the follow-up questions I still consider valuable before locking the project structure.

### 1. Is overflow intentionally non-conservative?

This is the most important one.

More explicitly:

- if one full cell receives `1` packet from an ally
- and has `3` outgoing lanes
- should all `3` outgoing lanes receive that packet?

If the answer is yes, we should state clearly that:

- Tentacle Wars mode intentionally uses multiplicative overflow

because that will shape the entire balance model.

### 2. How should fractional throughput be represented?

Example:

- level 2 = `1.5 energy/s`

Should that become:

- alternating `1` and `2` packets by cadence?
- one packet every `0.666...s` plus cadence logic?
- or a simpler internal accumulator model?

This is mainly an implementation-quality question.

### 3. Should hostile takeover always reset to 10 before applying carryover?

Your current answers lean in that direction, but the rule should be frozen explicitly.

### 4. Should the first prototype intentionally use only one overflow rule, even if we later expose variants?

Recommendation:

- yes

Because otherwise the first prototype becomes a parameter playground before the core feel is validated.

## Is The Material Sufficient To Build A Strong Project Proposal?

Yes.

The information is now sufficient to build:

- a mode architecture proposal
- a rollout plan
- an implementation task tree

provided that we handle the unresolved items above as explicit design choices, not hidden assumptions.

## Recommended Next Step

The next artifact should be:

- `Tentacle Wars Mode Architecture Proposal`

That proposal should include:

- shared vs forked systems
- packet simulation model
- overflow rule
- capture subsystems
- grade table
- prototype scope
- rollout phases

## Recommendation Before Drafting It

If you want the architecture proposal to be as strong as possible, I recommend answering just these four final points first:

1. Is overflow multiplicative across every outgoing lane?
2. How should fractional packet throughput be represented?
3. Does hostile capture always reset to 10 before carryover is applied?
4. What is the full Dominator rule set?

If you prefer speed over certainty, we can still proceed now and mark those as:

- `initial implementation assumptions`
- with parameter hooks for later validation
