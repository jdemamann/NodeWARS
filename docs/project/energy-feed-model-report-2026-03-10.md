# Energy Feed Model Report

## Purpose

Capture the design discussion around changing the current feed model so:
- cells can keep their own regeneration
- tentacles can still receive stronger outgoing flow
- the behavior remains tunable through configuration instead of bespoke logic

This report is intentionally non-implementation. It records the design space, risks, and likely tuning surfaces.

---

## Current Situation

The current model is centered on shared source budget:

- cells regenerate by tier
- a configurable fraction stays with the source cell
- the remaining share is divided across outgoing tentacles
- relay output forwards buffered upstream flow instead of creating new energy

Canonical code anchors:
- `src/config/gameConfig.js`
- `src/systems/EnergyBudget.js`
- `src/entities/GameNode.js`

Key current variables:
- `GAME_BALANCE.TIER_REGEN`
- `GAME_BALANCE.GLOBAL_REGEN_MULT`
- `GAME_BALANCE.SELF_REGEN_FRACTION`
- `GAME_BALANCE.FRENZY_REGEN_MULT`
- `GAME_BALANCE.CLASH_DRAIN_MULTIPLIER`
- `GAME_BALANCE.UNDER_ATTACK_OUTPUT_DAMPING_MAX`

Key current functions:
- `computeNodeDisplayRegenRate(node, frenzyActive)`
- `computeNodeTentacleFeedRate(node)`
- `computeTentacleClashFeedRate(sourceNode, maxBandwidth, dt)`

---

## Current Design Problem

The current model is stable and conservative, but it reduces one of the most memorable pressure patterns from classic Tentacle Wars-like play:

- a saturated support network
- especially a triangle or small loop of allied cells
- reaching cap
- then dumping stored/generated pressure into a new offensive lane

The player expectation here is:
- capped support cells should feel like compressed pressure
- offensive redirection from a mature support cluster should hit hard
- late output should feel stronger than the current even split often allows

Right now, the system tends to produce:
- safe, predictable support flow
- slower “spillover” feeling
- weaker offensive punch from established support structures

That makes attacks feel less explosive than desired.

---

## Important Constraint

If a cell keeps full regeneration **and** each tentacle also receives a fixed fraction of the full regen, the model is no longer conservative.

Example:
- regen = `1.0`
- cell keeps `1.0`
- each tentacle gets `0.5`

Then:
- 1 tentacle => total effective output `1.5`
- 2 tentacles => total effective output `2.0`
- 3 tentacles => total effective output `2.5`

That is real energy multiplication.

This is not automatically wrong, but it must be a deliberate rule, not an accidental side effect.

---

## What The Original Feel Suggests

The desired effect is not necessarily “free energy everywhere.”

The desired effect is closer to:
- high-capacity mature cells feel pressurized
- overflow from capped networks is offensively meaningful
- support lattices reward structure
- attacks from prepared networks are more decisive

So the target behavior is:
- **stored pressure amplification**
- not necessarily unlimited passive energy multiplication

---

## Recommended Design Directions

### Option A — Conservative Overflow Model

Cells keep the current conservative regen model, but offensive tentacles gain extra feed from **stored surplus** when the source node is near or at cap.

Concept:
- base regen remains conservative
- if node energy is above a threshold, tentacles gain an overflow bonus
- overflow bonus is configurable and temporary

Pros:
- preserves energy discipline
- captures the “capped node spills pressure” feeling
- easier to balance

Cons:
- slightly less literal than the user request
- needs one more feed term in the budget model

Recommended parameters:
- `OVERFLOW_FEED_THRESHOLD_FRACTION`
- `OVERFLOW_FEED_GAIN`
- `OVERFLOW_FEED_MAX_MULT`

This is the most promising option if the goal is classic pressure without destabilizing the economy.

---

### Option B — Semi-Inflated Dual Budget Model

Cells always keep full regeneration, and each tentacle gets a smaller fixed share on top of that.

Concept:
- self-regen is never reduced by active support
- each tentacle receives a configured outgoing feed fraction
- total system output grows with number of active lanes

Pros:
- simple mental model
- support networks become stronger immediately
- closer to the “everything stays full while still pushing hard” fantasy

Cons:
- true energy multiplication
- risk of runaway growth
- clashes and neutral captures get much stronger
- relay chains may need major rebalance

Recommended parameters:
- `SELF_REGEN_FRACTION = 1.0`
- `PER_TENTACLE_FEED_FRACTION`
- optional `MAX_ACTIVE_FEED_TENTACLES`

This is viable but much riskier.

---

### Option C — Hybrid Pressure Reservoir Model

Cells use the current regen model, but capped or near-capped nodes accumulate a “pressure reservoir” that boosts the next outbound offensive action.

Concept:
- support remains conservative
- offensive launch from prepared cells gets a burstable feed reserve
- this feels like pressure release, not passive multiplication

Pros:
- strongest match to “prepared attack hits hard”
- best control over when pressure matters
- easier to separate support from offense

Cons:
- more system complexity
- introduces another internal state
- needs careful UI/feedback explanation

Recommended parameters:
- `PRESSURE_RESERVOIR_BUILD_RATE`
- `PRESSURE_RESERVOIR_MAX`
- `PRESSURE_RESERVOIR_RELEASE_MULT`
- `PRESSURE_RESERVOIR_TRIGGER_THRESHOLD`

This is the most expressive option, but not the smallest one.

---

## Best Recommendation

### Recommended path: Option A first

Why:
- highest balance safety
- preserves the current stable core
- still gives the missing “triangles dump power into offense” feeling
- can be fully parametrized
- can later evolve toward Option C if needed

Executive summary:
- keep regen conservative
- add **overflow pressure feed** for near-capped cells
- make the overflow feed configurable

That gives the feel you want without fully replacing the economy.

---

## Parameters That Would Likely Be Needed

If this becomes implementation work, the likely new tuning block should include variables like:

- `OVERFLOW_FEED_THRESHOLD_FRACTION`
- `OVERFLOW_FEED_GAIN`
- `OVERFLOW_FEED_MAX_MULT`
- `OVERFLOW_FEED_ATTACK_ONLY`
- `OVERFLOW_FEED_ALLY_SUPPORT_MULT`
- `OVERFLOW_FEED_CLASH_MULT`

Meaning:
- when overflow starts
- how much extra feed it adds
- hard cap on how strong it can become
- whether it only benefits offensive lanes
- whether ally support gets reduced overflow compared to attack
- whether clash should consume overflow differently

---

## Systems Likely Affected

If this becomes implementation work later, the main surfaces will be:

- `src/config/gameConfig.js`
- `src/systems/EnergyBudget.js`
- `src/entities/Tent.js`
- possibly `src/entities/TentCombat.js`
- UI display helpers if the model should be explained to the player

Likely doc surfaces:
- `docs/implementation/energy-model.md`
- `docs/implementation/current-gameplay-baseline.md`
- `README.md` only if the public rules change materially

---

## Balance Risks

Any stronger feed model must be checked against:

- neutral capture speed
- relay amplification
- clash volatility
- owner-3 aggression
- late-world pressure maps
- support triangles becoming mandatory

Most sensitive levels would likely be:
- `18`
- `21`
- `24`
- `30`
- `32`

---

## Suggested Future Evaluation Sequence

If this is revisited later, the safest order is:

1. implement overflow feed as a pure config-backed extension
2. run mechanical checks
3. run campaign sanity
4. playtest support triangles and capped attack pivots
5. only then consider more aggressive semi-inflated models

---

## Conclusion

The current dissatisfaction is valid.

The missing feeling is not just “more regen.”
It is:
- stronger offensive spillover from mature support structures
- especially when cells are capped or nearly capped

The best next design direction is not unconditional free tentacle feed.
It is a **parametrized overflow pressure model**.

That would preserve the stable foundation of the current game while restoring a more satisfying network-offense dynamic.
