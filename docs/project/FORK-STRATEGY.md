# Project Fork Strategy — NW+TW vs TW-Pure

**Created:** 2026-03-16
**Status:** Active — both lines in parallel development

---

## What This Document Is

This is the authoritative reference for anyone (human, LLM, or agent) who needs to understand
the two-line development strategy in this repository. Read this before touching anything related
to TentacleWars layer architecture or NodeWARS legacy removal.

---

## The Two Lines

### Line 1 — `main` branch: NW+TW Complete

**Tag:** `v-nw-tw-complete`
**Commit:** `979548a`

This is the **frozen snapshot** of the project with both game modes present:

- **NodeWARS (NW)** — the original game mode. Full campaign. Legacy code in `Tent.js`
  and `TentCombat.js`. Continuous-flow model, level multipliers, force-based clash.
- **TentacleWars (TW)** — the new game mode. Full 80-level campaign. Clean 5-layer
  architecture (Waves 1–4 complete). Packet-native model, grade-based system,
  pressure-based clash.

Both modes coexist in the same runtime. A `simulationMode` flag at the `Game` level
dispatches to the correct path. All TW delivery and ownership routes through the
extracted layer modules. NW still routes through the legacy `Tent.js` path.

**This line is stable.** Do not add NW legacy removal work to `main`.
It is the reference point for understanding what existed before TW-pure.

---

### Line 2 — `tw-pure` branch: TW-Only

**Branched from:** `main` at `v-nw-tw-complete` (0 commits ahead at branch creation)

This is where all NodeWARS legacy code is removed. The goal is a codebase with:

- **Only TentacleWars** — no NW code, no `simulationMode` checks, no `TentCombat.js`
- `Tent.js` reduced from ~743 lines to ~115 lines (thin dispatcher)
- `TentCombat.js` deleted entirely (137 lines, 100% NW-only)
- `kill()` reduced from 80 lines to ~12 lines
- Zero `simulationMode` branches anywhere in the runtime

**Planned reduction:** ~435 lines of NW code deleted from `Tent.js` alone.

---

## Why Two Lines Instead of a Single Forward Path

NodeWARS and TentacleWars have fundamentally different mechanics at every layer:

| Aspect          | NodeWARS                         | TentacleWars                       |
|-----------------|----------------------------------|------------------------------------|
| Flow model      | Continuous flow + pipe delay     | Discrete packets in lane queue     |
| Combat          | Level multipliers (attack/defense)| Grade-based (no multipliers)      |
| Clash           | Force tug-of-war (front moves)   | Fixed midpoint + pressure damage   |
| Ownership       | Level-based starting energy      | Fixed reset energy per node        |

Migrating the NodeWARS campaign to run on TW mechanics would require rebuilding level
design from scratch — it is not a code architecture question. The two modes are separate
games sharing an engine.

The `main` line is preserved for:
1. Reference if anything in NW behavior needs to be studied
2. Insurance while `tw-pure` is being validated
3. Historical record of the full extraction process (Waves 1–4 visible in git log)

---

## Architecture Reference

The 5-layer OSI-inspired architecture used in TentacleWars is documented here:

- **Full architecture spec:** `docs/superpowers/specs/2026-03-15-game-architecture-layers.md`
- **TW tent layer design:** `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md`

### The Layer Stack (summary)

```
Layer 4 — AI / Rendering / Input       (policy consumers)
Layer 3 — Game / Physics / WorldSystems (orchestration)
Layer 2 — TwFlow / TwCombat            (sustained flow + clash policy)
Layer 1 — TwChannel / TwNodeOps /
          TwDelivery / TwOwnership      (primitives and invariants)
Layer 0 — GameNode                     (substrate: pure data, no logic)
```

**Adjacent-write rule:** each layer may only write node state through the layer
immediately below it. No layer skips. This is the core architectural invariant.

### Extraction history (Waves 1–4)

| Wave | What was extracted              | Status  |
|------|----------------------------------|---------|
| 1    | TwChannel + TwNodeOps (Layer 1) | Merged  |
| 2    | TwFlow + TwCombat (Layer 2)     | Merged  |
| 3    | TwDelivery Layer 1 delivery     | Merged  |
| 4    | TwOwnership + legacy clash shell removal | Merged |

All waves are on `main` and visible in git log.

---

## Verified Baseline at Branch Point (`v-nw-tw-complete`)

All sanity checks passed at the moment the tag was created:

```
smoke-checks.mjs:          102/102
tw-campaign-sanity.mjs:     15/15
tw-channel-sanity.mjs:      16/16
tw-flow-sanity.mjs:          7/7
tw-combat-sanity.mjs:        6/6
tw-energy-sanity.mjs:        6/6
tw-ownership-sanity.mjs:     5/5
tw-delivery-sanity.mjs:      6/6
```

Any agent starting work on `tw-pure` must reproduce this baseline before
proceeding with legacy removal.

---

## Recovery Procedures

### Scenario A — Recover NW+TW to a fresh local repo

The `main` branch + `v-nw-tw-complete` tag are on GitHub. To recover:

```bash
git clone https://github.com/jdemamann/NodeWARS.git nodewars-nw-tw
cd nodewars-nw-tw
git checkout main
# Verify you are at the correct snapshot:
git log --oneline -1
# Expected: 979548a fix(test): update tw-delivery-sanity for Wave 4 TwOwnership interface

# Or pin to the tag explicitly:
git checkout v-nw-tw-complete
```

Run the full suite to verify:

```bash
node scripts/smoke-checks.mjs
node scripts/tw-ownership-sanity.mjs
node scripts/tw-delivery-sanity.mjs
```

### Scenario B — Recover TW-pure branch to a fresh local repo

The `tw-pure` branch is on GitHub:

```bash
git clone https://github.com/jdemamann/NodeWARS.git nodewars-tw-pure
cd nodewars-tw-pure
git checkout tw-pure
```

This branch starts at the same commit as `v-nw-tw-complete` and diverges from there
as NW legacy removal progresses.

### Scenario C — Recover both lines to the same local repo

```bash
git clone https://github.com/jdemamann/NodeWARS.git nodewars
cd nodewars
# main is already checked out — NW+TW line
git fetch origin tw-pure
git branch tw-pure origin/tw-pure

# Switch between lines:
git checkout main      # NW+TW complete
git checkout tw-pure   # TW-only removal in progress
```

### Scenario D — Full catastrophic loss (both local and GitHub gone)

This is the worst case. If the repository is completely lost:

1. The entire extraction history (Waves 1–4) is documented in:
   - `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md` (method migration map)
   - `docs/superpowers/specs/2026-03-15-game-architecture-layers.md` (architecture spec)
   - `docs/project/tw-collab-status.md` (wave-by-wave status)
   - `docs/project/RESUME.md` (current state and completed waves)

2. The extraction can be reproduced from these specs. The specs include:
   - Which methods move to which modules
   - The adjacent-write rule and why it exists
   - The exact sanity checks that must pass for each wave

3. Start from any working copy of the original NodeWARS codebase + the spec files
   and re-execute the extraction following the documented wave structure.

---

## For Future Agents

If you are an LLM or agent reading this:

1. **Before touching Tent.js or TentCombat.js** — understand which line you are on.
   - `main` = NW+TW coexist, both modes active
   - `tw-pure` = NW removal in progress, only TW survives

2. **Do not merge `tw-pure` back to `main`** without explicit human confirmation.
   `main` is intentionally preserved as the NW+TW snapshot.

3. **The specs are authoritative.** If code disagrees with a spec, the spec wins
   unless the spec is explicitly revised.

4. **Always run the full sanity suite** before claiming a wave is complete.
   See `AGENTS.md` for the command list.

5. **The tag `v-nw-tw-complete` is permanent.** Do not delete it.
   It is the insurance policy for the entire extraction effort.
