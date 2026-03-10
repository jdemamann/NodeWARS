# Check Suite Review — 2026-03-10

## Current status

The repository now has four lightweight validation layers:

- `smoke-checks.mjs`
- `ui-actions-sanity.mjs`
- `ui-dom-sanity.mjs`
- `campaign-sanity.mjs`
- `simulation-soak.mjs`

Current results:

- `51/51 smoke checks passed`
- `6/6 UI action sanity checks passed`
- `4/4 UI DOM sanity checks passed`
- `7/7 campaign sanity checks passed`
- `1/1 simulation soak checks passed`

Aggregate local command:

```bash
npm run check
```

That command now runs:

```bash
npm run smoke && npm run ui-sanity && npm run campaign-sanity && npm run soak
```

It now runs:

```bash
npm run smoke && npm run ui-sanity && npm run ui-dom-sanity && npm run campaign-sanity && npm run soak
```

## What is covered well

### 1. Core gameplay invariants

`smoke-checks.mjs` is now strong on the most failure-prone mechanics:

- energy conservation in retract / refund / build / reverse paths
- relay pass-through and anti-free-energy behavior
- slice / burst canonicalization
- clash behavior and visual approach
- AI relay logic
- tutorial gating
- progression / skip / unlock guardrails
- render-profile and content-alignment guards

This is the most important suite and it is doing real work.

### 2. Campaign static integrity

`campaign-sanity.mjs` is appropriately narrow and useful:

- sequential ids
- world continuity
- mechanic placement by world
- high-pressure phase support expectations

This helps protect authored campaign drift without bloating gameplay tests.

### 3. Long-run stability

`simulation-soak.mjs` gives a useful confidence floor:

- it verifies the simulation does not explode numerically over time

This is small, but high-value.

### 4. UI/menu/button wiring

`ui-actions-sanity.mjs` fills an important gap:

- screen ids
- button presence
- click wiring
- tutorial / HUD controls
- settings copy routed through `i18n`
- clipboard fallback presence
- campaign-ending preview availability
- settings world-toggle override behavior
- delegated menu feedback for dynamic controls
- UI-wide font coverage through shared font variables and bundled local font assets

### 5. DOM-lite screen state integrity

`ui-dom-sanity.mjs` covers the next layer up:

- `showScr(...)` actually hiding/revealing screens
- `refreshSettingsUI()` mutating controls and debug rows
- campaign-ending screen content population
- world-tab visibility reacting to progression, manual overrides, and debug mode

This is the first suite in the project that executes real screen-manager behavior instead of only inspecting source.

This directly addresses a recurring class of regressions that gameplay smoke checks were only partially covering.

## Is the check system organized?

Overall: **yes, reasonably well**.

The current separation is sensible:

- `smoke`: gameplay + cross-system invariants
- `ui-sanity`: menu/screen/button wiring
- `campaign-sanity`: static campaign metadata rules
- `soak`: long-run numeric stability

This is a much better structure than forcing every concern into a single monolithic smoke file.

## Redundancy analysis

There is some overlap now, especially between:

- `smoke-checks.mjs`
- `ui-actions-sanity.mjs`

Examples:

- campaign ending preview presence
- debug/menu controls
- some PT/EN alignment checks

### Is that bad?

Not necessarily.

At the current size of the suite, the overlap is still acceptable because:

- the checks are fast
- the overlapped areas are high-risk UI surfaces
- the overlap is intentional defense against regressions in critical navigation paths

### What is mildly redundant

These topics are now checked in more than one place:

- debug controls
- ending-screen presence
- settings copy alignment

### Recommendation

Keep the current overlap for now.

If the suite grows further, then it will be worth trimming `smoke-checks.mjs` so it stops carrying so much UI concern and lets `ui-actions-sanity.mjs` own those surfaces.

## Inconsistencies or weaknesses

### 1. `smoke-checks.mjs` is still too broad

It covers:

- simulation
- UI wiring
- translation integrity
- render profile guards
- campaign progression
- menu/debug controls

This makes it powerful, but also means:

- it is harder to maintain
- a text drift in one subsystem can fail the main smoke suite
- the suite is less conceptually focused than it could be

### 2. Many checks are source-inspection checks

This is pragmatic and valid for this repo, but it has limits.

Source-inspection checks verify:

- expected APIs exist
- expected helper names remain wired
- expected fallbacks remain in source

They do **not** verify:

- actual browser DOM behavior
- actual clipboard success
- actual button click propagation
- actual screen transitions in a DOM runtime

For the repository size and current tooling, this is acceptable. But it is the main structural limitation of the suite.

### 3. DOM coverage is better, but still intentionally shallow

The new DOM-lite suite executes important UI behavior, but it is still not a browser:

- there is no layout engine
- there is no event propagation model
- there is no clipboard/network/browser-security behavior
- `innerHTML` is not parsed into a full tree in the fake harness

So it meaningfully improves confidence, but does not replace a real browser E2E layer.

### 4. Soak coverage is still narrow

The soak suite currently gives confidence for numeric stability, but not enough targeted scenario coverage for:

- long relay chains
- red/purple coalition pressure on neutral capture
- repeated world-system interactions on authored late-game layouts

## What can be improved next

### High-value next checks

#### A. Coalition capture mini-sim checks

Add a tiny runtime check that verifies:

- in `sum` mode, red + purple together can flip a neutral threshold
- in `lockout` mode, the second allied owner is ignored
- the winner remains deterministic when coalition scores are tied

Current state:
- partly covered through helper checks
- not yet covered through a more realistic tentacle-update mini-sim

#### B. GameState progression transition checks

Add focused checks for:

- `recordLevelWin(...)`
- `recordTutorialCompletion(...)`
- `getNextLevelId(...)`
- skip behavior around boss/final/tutorial

Current state:
- mostly covered indirectly
- not covered as a dedicated progression test layer

#### C. Richer menu-state checks

The menu suite is stronger now, but one more layer would still be valuable:

- verify debug-only rows appear/disappear in response to `debug`
- verify `showFps` updates the HUD visibility path, not just the settings toggle
- verify language/theme/font controls mutate the intended nodes in a DOM-lite harness

#### D. Input gesture lifecycle checks

There are already good text guards, but a targeted mini-state test could add confidence for:

- left drag connect
- left slice
- right slice
- sticky click candidate
- sticky drag target
- tap promotion to slice

Current state:
- well guarded textually
- not deeply exercised as gesture-state transitions

### Medium-value next checks

#### E. UI translation key audit script

Add a dedicated script that verifies:

- every `[data-t]` in `index.html` has keys in both PT and EN
- no dead keys remain for screen-level UI

Current state:
- some coverage exists
- not yet generalized

#### F. Final-screen content checks

Now that there is a campaign ending screen, protect:

- ending title
- ending story blocks
- ending buttons
- PT/EN labels

Current state:
- basic presence covered
- content-shape not deeply covered

#### G. Render stat shape checks

Protect the structure of debug render metrics more explicitly so future refactors do not silently remove fields used by the debug snapshot.

## What should probably not be done yet

### Full browser E2E

Possible, but not proportional right now.

The current repo benefits more from:

- better tiny scenario simulations
- small DOM-lite checks

than from introducing a heavy E2E harness.

### Massive unit-test framework migration

Also not necessary yet.

The current Node-script approach is still serving the project well.

## Suggested next task plan

### TASK-CHECK-01
Add coalition neutral-capture mini-sim checks.

### TASK-CHECK-02
Add dedicated progression-state sanity checks for `GameState`.

### TASK-CHECK-03
Add DOM-lite screen rendering checks for:
- `showScr`
- `refreshSettingsUI`
- `showCampaignEnding`

### TASK-CHECK-04
Add a translation-key audit for `index.html` and screen-level controls.

## Final assessment

The current validation system is in **good shape**.

It is:

- meaningful
- fast
- broad enough to catch the regressions this repository has actually been suffering

Main strengths:

- gameplay invariants are well protected
- campaign metadata is protected
- UI/menu regressions now have a dedicated suite
- aggregate local validation is easy to run

Main weaknesses:

- the main smoke suite is still a bit too broad
- many UI checks are still source-based rather than DOM-behavior-based
- coalition and progression could use a bit more runtime-state coverage

Bottom line:

- the suite is organized enough for serious ongoing development
- it is not overengineered
- the next improvements should be incremental, not architectural
