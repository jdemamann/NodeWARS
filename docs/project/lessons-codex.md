# Lessons — Codex + Claude

Curated patterns from real corrections during this project.
Format: pattern → correction → rule.
Keep it small. Remove lessons that are no longer relevant.

---

## L-001 — Measurement window includes non-attack phases

**Pattern:**
Reported W1-01 browser drain rate as −0.342/s and flagged it as "still slow."
The measurement window (0.5s → 10s) included tentacle build time (~0.8s) and
packet travel time (~0.7s) — ~1.0s total during which the defender regenerated
freely with no attack applied.

**Correction:**
Corrected window (pure attack only): −0.50/s vs −0.55/s expected. Delta < 10%.
The model was correct. The measurement was misleading.

**Rule:**
Before reporting a numeric result as evidence, identify what the measurement
window actually contains. Subtract setup/warm-up/travel phases before comparing
to theoretical rates. If the window cannot be cleanly isolated, state the
caveat explicitly rather than presenting raw numbers as validated results.

---

## L-002 — PASSIVE_REGEN_FRACTION applies only when underAttack > 0.05

**Pattern:**
Originally PASSIVE_REGEN_FRACTION=2/3 was applied universally to all TW cells.
Produced the wrong mechanic: attacker slowly dying even without counter-attack.

**Correction:**
Applied conditionally: `if (simulationMode === 'tentaclewars' && underAttack > 0.05)`.
Uncontested attacker now regens at full rate; only the defender under attack
has suppressed regen.

**Rule:**
Any regen-suppression mechanic in TW must be gated on `underAttack > threshold`.
Never suppress regen globally for a mode — it changes both attacker and defender
behavior and produces asymmetric feel bugs that are hard to isolate.

---

## L-003 — Tag derivation requires screenshot evidence, not wiki inference

**Pattern:**
Tagged W1-02 with `neutral-capture` because the wiki hint said "same as
tutorial #2." Tutorial #2 introduces neutral capture. W1-02 has no neutral cell.

**Correction:**
Screenshot of W1-02 shows only player + 2 reds. Tag changed to `priority-target`.

**Rule:**
introMechanicTags must be derived from what is actually present in the level
(cells, layout, obstacles). Secondary sources (wiki, descriptions, analogies)
can inform interpretation but cannot override direct screenshot evidence.
When in doubt, leave the tag empty rather than infer from context.

---
