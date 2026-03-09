# Linux Desktop Binary Report

## Purpose

This document evaluates what is required to ship **NODE WARS** as a native-feeling **Linux desktop binary**.

It does not change code. It is a feasibility and execution report based on the current repository state as of **March 9, 2026**.

## Executive Summary

Shipping a Linux desktop binary is **very feasible** from the current codebase.

The game already has several properties that make desktop packaging practical:

- no backend dependency
- no build pipeline dependency
- browser-native rendering through `Canvas`
- browser-native audio through `Web Audio`
- local persistence through `localStorage`
- mouse / keyboard input already implemented

The main missing pieces are not gameplay. They are **packaging, runtime shell integration, offline asset control, and distribution tooling**.

### Recommended path

Two realistic paths stand out:

1. `Electron`
   - Best for fastest delivery
   - Lowest engineering risk
   - Largest binary size
2. `Tauri`
   - Better long-term product quality on Linux
   - Smaller binaries and lower memory overhead
   - Higher integration/setup complexity

### Recommendation

If the goal is **ship fast and safely**, use `Electron`.

If the goal is **ship a polished long-term desktop product**, use `Tauri`.

Given the current repository and team context, the most pragmatic recommendation is:

- `Phase 1`: ship a working Linux desktop build with `Electron`
- `Phase 2`: only reconsider `Tauri` if binary size, RAM, startup time, or maintainability become important enough to justify migration

## Current Repository Readiness

## What already helps

- `index.html` is the clear app entry point
- `src/main.js` bootstraps the full app cleanly
- the game runs entirely client-side
- `GameState` centralizes persistent settings/progress
- the app already supports pause, fullscreen-style canvas layout, and runtime settings
- validation tooling already exists:
  - `node scripts/smoke-checks.mjs`
  - `node scripts/campaign-sanity.mjs`
  - `node scripts/simulation-soak.mjs`

## What is missing

- no desktop shell
- no packaging config
- no application icons/package metadata for Linux
- no installer/distribution pipeline
- no offline-controlled font pipeline
- no platform-specific persistence/export/reset UX
- no desktop-focused QA matrix

## Important Current Technical Constraints

### 1. Remote fonts

`index.html` currently loads Google Fonts dynamically from the network.

Implication:

- this is fragile for offline desktop distribution
- first launch without network may degrade typography
- Linux binary should bundle fonts locally instead

This is one of the first things that would need to change in an implementation wave.

### 2. Persistence is browser storage-backed

The current save system relies on `localStorage`.

Implication:

- this works inside Electron and Tauri webviews
- but the storage location becomes shell-dependent
- reset/migration behavior should be explicitly documented and tested

### 3. Input depends on browser conventions

Current desktop input includes:

- left click
- right-click slice
- drag-and-release
- keyboard `Esc`

Implication:

- desktop shell must preserve browser mouse semantics cleanly
- right-click behavior and `contextmenu` suppression need explicit QA inside the desktop shell

### 4. Audio depends on browser gesture startup

The game intentionally initializes audio after a user gesture.

Implication:

- this is fine in Electron/Tauri
- but desktop lifecycle testing is still required for:
  - alt-tab
  - minimize / restore
  - focus loss
  - resume after suspend

### 5. Packaging metadata does not exist yet

There is no current setup for:

- app id
- desktop icon set
- window title/product identity metadata
- `.desktop` entry
- `AppImage` / `.deb` / tarball output

## Packaging Options

## Option A: Electron

### Fit

Very strong fit for current architecture.

Why:

- the project is already a plain browser app
- Electron can host it with minimal architectural change
- packaging ecosystem is mature
- JS-only team can move quickly

### Expected implementation difficulty

`Low to Medium`

### MVP effort estimate

- `2 to 4 engineering days` for a working local binary prototype
- `4 to 7 engineering days` for a clean Linux distributable with icons, persistence validation, and startup polish

### Main tasks

1. Add Electron runtime shell
2. Add app window config
3. Load local app entry cleanly
4. Package static assets
5. Replace remote fonts with bundled fonts
6. Validate persistence path behavior
7. Add icons and Linux packaging metadata
8. Produce `AppImage` and optionally `.deb`

### Pros

- fastest path
- least disruption
- easiest debugging
- no Rust/toolchain dependency

### Cons

- larger binaries
- higher RAM use
- weaker “native app” feel than Tauri

## Option B: Tauri

### Fit

Good fit, but more integration work than Electron.

Why:

- app is still web-based, so the rendering layer ports well
- Linux distribution quality is usually better
- runtime footprint is smaller

### Expected implementation difficulty

`Medium`

### MVP effort estimate

- `4 to 7 engineering days` for a working prototype
- `1.5 to 2.5 engineering weeks` for a polished distributable with asset bundling, icons, packaging, and QA

### Main tasks

1. Add Tauri scaffold
2. Configure asset serving for the static web app
3. Bundle local fonts
4. Validate `localStorage` behavior under Tauri webview
5. Configure Linux build targets and metadata
6. Test audio focus/lifecycle behavior thoroughly

### Pros

- smaller binary
- lower memory footprint
- stronger production story on desktop

### Cons

- higher setup complexity
- Rust toolchain dependency
- slightly more friction for quick iteration

## Option C: NW.js or similar wrapper

### Fit

Possible, but not recommended.

### Difficulty

`Medium`

### Reason not recommended

- no strong advantage over Electron here
- weaker ecosystem fit for this project

## Recommended Implementation Phases

## Phase 0: Decision and packaging strategy

Goal:

- choose `Electron` or `Tauri`
- define output format target:
  - `AppImage`
  - `.deb`
  - both

Difficulty:

`Low`

## Phase 1: Shell bootstrap

Goal:

- run the current game inside a Linux desktop shell

Tasks:

- create desktop runtime scaffold
- point shell to `index.html`
- preserve fullscreen/canvas sizing behavior
- ensure right-click slice still works

Difficulty:

`Low` for Electron, `Medium` for Tauri

## Phase 2: Offline asset hardening

Goal:

- make the app fully self-contained

Tasks:

- bundle fonts locally
- confirm CSS/font fallback hierarchy
- verify no hidden network dependency remains

Difficulty:

`Low`

## Phase 3: Persistence and lifecycle validation

Goal:

- ensure the save/settings model behaves correctly in desktop runtime

Tasks:

- verify `localStorage` path persistence across relaunch
- verify save survives normal upgrades
- validate:
  - minimize / restore
  - alt-tab
  - window close / relaunch
  - audio resume

Difficulty:

`Medium`

## Phase 4: Packaging and distribution

Goal:

- produce real Linux deliverables

Tasks:

- app id / product metadata
- icons
- package output config
- CI or release script

Difficulty:

`Medium`

## Phase 5: Desktop polish

Goal:

- make the binary feel like a product, not just a wrapped website

Tasks:

- window defaults
- fullscreen option
- proper quit/restart semantics
- about/version info
- optional native menu simplification

Difficulty:

`Low to Medium`

## Technical Risks

## Low-risk areas

- rendering portability
- basic runtime boot
- campaign and gameplay logic
- settings persistence conceptually

## Medium-risk areas

- right-click and context menu behavior inside shell
- audio resume/focus behavior
- font rendering consistency across Linux distros
- packaging reproducibility

## Higher-risk areas

- GPU/Canvas performance on low-end Linux integrated graphics
- distro-specific desktop environment quirks
- mixed DPI / fractional scaling behavior

## Required QA Matrix

Minimum Linux QA should cover:

- Ubuntu or Debian-based distro
- Arch-based distro or equivalent rolling release
- GNOME
- KDE
- X11 and Wayland if possible

Minimum behavior checklist:

- first launch
- save persistence
- restart after save
- audio after first click
- right-click slice
- drag-and-release tentacle creation
- pause / resume
- graphics `HIGH` / `LOW`
- theme switching
- tutorial exit and campaign progression

## Difficulty Assessment by Workstream

### Runtime shell setup

`Low` with Electron  
`Medium` with Tauri

### Offline packaging

`Medium`

### UX/polish for desktop

`Low to Medium`

### Release engineering

`Medium`

### Full production-quality Linux release

Overall: `Medium`

## What does not need major rework

These parts are already in good shape for a Linux binary:

- core gameplay loop
- settings menu
- save architecture
- canvas rendering
- debug instrumentation
- smoke/campaign/soak validation scripts

## What should be added before implementation starts

Recommended pre-implementation docs/tasks:

1. `desktop-packaging-decision.md`
2. `electron-shell-plan.md` or `tauri-shell-plan.md`
3. `linux-release-checklist.md`

## Recommendation

If the project wants the **lowest-risk path to a Linux binary**, use:

- `Electron`

If the project wants the **best long-term desktop distribution quality**, use:

- `Tauri`

From a senior engineering perspective, the repository is already close enough to ship as desktop software with moderate effort.

This is not a rewrite problem.
It is a packaging, runtime-integration, and QA problem.
