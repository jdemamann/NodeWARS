# Smoke Checks

## Purpose

These are lightweight regression checks for a few gameplay-critical rules. They are intentionally small and run as a plain Node script rather than through a full test framework.

Current coverage:

- relay nodes do not create free energy
- programmatic retract refunds build/payload energy
- instant activation only tracks actually paid build cost
- growing tentacles cannot advance without source budget
- support cells keep partial self-regeneration while feeding allies
- nodes under attack keep reduced outgoing flow
- vortex drain uses the effective source on reversed tentacles
- pulsar injects energy into owned nodes only
- auto-retract retracts outgoing enemy tentacles
- owner-3 render palette selection resolves to purple
- AI can evaluate relay nodes as valid targets
- player and purple AI both use the shared burst/slice entry point
- ownership and contest logic use canonical shared paths
- player relay interaction paths remain enabled
- neutral capture visuals use the node's real capture threshold and expose a leader
- tutorial copy matches the current controls and gameplay rules
- World 3 structures, tutorial ghost guides, and critical combat warnings keep their visual cues
- graphics profiles remain explicit, compatible, and wired into the render paths
- HUD and phase feedback remain aligned with current mechanics and enemy factions
- canvas feedback for capture, structures, and pre-result outcome overlays remains active
- background, hazards, and particles continue respecting explicit graphics profiles
- menu logo, FPS toggle, themes, and debug snapshot controls remain wired
- campaign-ending preview/debug controls and screen routing remain wired
- cooldown guards remain wired for high-density combat and world SFX
- settings labels, tutorial copy, and story content stay aligned with current mechanics and localization
- local progress and settings persistence guardrails stay intact
- World 1 tutorial remains integrated into the World 1 phase tab
- tutorial exit and mouse-gesture cleanup guards stay present
- primary-button slice keeps its distinct visual and drag targeting behavior
- frenzy only triggers from the same continuous slice gesture
- capped nodes use hysteresis so they do not thrash level-up feedback at a max-energy threshold
- touch-promoted slice stays on the canonical slice init path
- input timing stays monotonic instead of relying on `Date.now()`
- slice-path append stays in-place instead of reallocating each move
- tutorial defeat delayed reload stays guarded against stale callbacks
- package.json exposes the validation scripts directly
- gameplay input bindings remain disposable/unbindable
- grouped notifications keep their dedupe and priority behavior
- music boot now guards the track-notification contract before using it

## Run

From the repository root:

```bash
npm run smoke
```

or:

```bash
node scripts/smoke-checks.mjs
```

For campaign-data integrity, also run:

```bash
npm run campaign-sanity
```

or:

```bash
node scripts/campaign-sanity.mjs
```

For focused progression-state validation, also run:

```bash
npm run progression-sanity
```

or:

```bash
node scripts/game-state-progression-sanity.mjs
```

For deterministic input-side validation, also run:

```bash
npm run input-harness
```

or:

```bash
node scripts/input-harness.mjs
```

For critical button, menu, and screen wiring integrity, also run:

```bash
npm run ui-sanity
```

or:

```bash
node scripts/ui-actions-sanity.mjs
```

For DOM-lite screen/state integrity, also run:

```bash
npm run ui-dom-sanity
```

or:

```bash
node scripts/ui-dom-sanity.mjs
```

For a lightweight long-run confidence pass, also run:

```bash
npm run soak
```

or:

```bash
node scripts/simulation-soak.mjs
```

For lightweight release precondition validation, also run:

```bash
npm run release-readiness
```

or:

```bash
node scripts/release-readiness.mjs
```

For the standard full local validation pass:

```bash
npm run check
```

## Notes

- The script mixes tiny state simulations with a small amount of source inspection.
- Source inspection is used only where a full interactive gameplay harness would be too heavy for the repository.
- The checks are designed as fast sanity guards, not exhaustive gameplay tests.
- Use `campaign-sanity.mjs` alongside this script when changing level definitions or campaign pacing.
- Use `ui-actions-sanity.mjs` alongside this script when changing menus, screen routing, debug tooling, or PT/EN settings copy.
- Use `ui-dom-sanity.mjs` alongside this script when changing `ScreenController`, `showScr(...)`, `refreshSettingsUI()`, campaign ending UI, or world-tab visibility rules.
