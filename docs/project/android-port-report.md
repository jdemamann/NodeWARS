# Android Port Report

## Purpose

This document evaluates what is required to ship **NODE WARS** as an **Android application**.

It does not change code. It is a feasibility and execution report based on the current repository state as of **March 9, 2026**.

## Executive Summary

An Android release is **feasible**, but it is materially more demanding than a Linux desktop binary.

The current project already helps in important ways:

- touch input already exists
- the game is fully client-side
- the rendering stack is standard browser `Canvas`
- audio is already browser-native
- local persistence already exists

But Android adds more product and platform pressure:

- touch precision and gesture robustness matter much more
- screen density and aspect ratio variance are much wider
- lifecycle interruptions are more frequent
- WebView/browser audio behavior is stricter
- packaging, signing, store readiness, and device QA are larger workstreams

### Recommended path

For Android, the strongest pragmatic option is:

- `Capacitor` wrapping the app in an Android WebView

Why:

- the project is already a web app
- the codebase can be reused with minimal architectural churn
- it supports fully bundled offline assets
- it gives a practical route to APK/AAB output

### Recommendation

If the goal is a real Android app, the recommended implementation sequence is:

1. `Capacitor` MVP
2. Android-only UX and performance hardening
3. store/build pipeline

## Current Repository Readiness

## What already helps

- touch interaction exists
- pause/settings/tutorial flows already exist
- canvas fills the screen well
- local save/settings model exists
- debug and validation scripts exist
- no backend service is required

## What is missing

- no Android shell
- no Android build/signing pipeline
- no bundled mobile app assets/icons/splash
- no back-button integration
- no Android-specific lifecycle handling
- no offline font bundling
- no Android device QA matrix

## Important Current Technical Constraints

### 1. Remote fonts

`index.html` currently injects Google Fonts from the network.

Implication:

- Android build should not depend on remote fonts
- the app should bundle fonts locally for consistent launch and offline behavior

### 2. Input model is good, but still needs mobile-first QA

The project already supports touch, but Android requires stronger validation for:

- tap reliability
- accidental slice vs tap promotion
- drag-and-release on smaller screens
- pause behavior under back button

The recent input hardening is a strong foundation, but it still needs real device testing.

### 3. Audio lifecycle is stricter on Android

Web audio on Android WebView/browser contexts can be more fragile around:

- first gesture requirement
- app backgrounding
- lock/unlock
- resume after interruption

This is one of the most important platform QA areas.

### 4. Persistence is browser storage-backed

Current save/settings rely on `localStorage`.

Implication:

- this works in a WebView-based app
- but app uninstall/clear-data semantics should be explicitly accepted and documented
- migration behavior between app versions must be tested

### 5. Screen and DPI variance are much broader

Android needs real validation for:

- small phones
- tall phones
- tablets
- notches / display cutouts
- high DPI text and canvas scaling

## Packaging Options

## Option A: Capacitor

### Fit

Best overall fit.

Why:

- minimal architectural disruption
- bundles web app into native Android shell
- straightforward APK/AAB path
- enough native integration if later needed

### Expected implementation difficulty

`Medium`

### MVP effort estimate

- `1 to 1.5 engineering weeks` for a working internal APK
- `2 to 3 engineering weeks` for a polished Android release candidate

### Main tasks

1. Create Capacitor scaffold
2. Bundle web assets
3. Replace remote fonts with local fonts
4. Configure Android manifest / app metadata
5. Integrate Android back-button behavior
6. Validate storage persistence
7. Test audio focus/resume
8. Produce signed APK/AAB

### Pros

- best speed-to-value path
- lowest code churn
- good long-term maintainability for a web-first game

### Cons

- still depends on WebView quality/performance
- device variability matters a lot

## Option B: Trusted Web Activity (TWA)

### Fit

Weak fit unless the game is intended to stay hosted as a web app first.

Why:

- TWA is strongest when the canonical product is a live hosted PWA
- current repo is not structured as a full installable PWA

### Difficulty

`Medium`

### Why not recommended

- weaker offline/self-contained story from the current state
- adds hosting and PWA concerns that do not help the core product right now

## Option C: Full engine/native rewrite

### Fit

Not justified.

### Difficulty

`Very High`

### Why not recommended

- the current codebase is already close enough to mobile through a WebView path
- rewrite cost is disproportionate

## Recommended Implementation Phases

## Phase 0: Mobile release decision

Goal:

- commit to `Capacitor`
- define target output:
  - internal APK
  - store-ready AAB

Difficulty:

`Low`

## Phase 1: Android shell bootstrap

Goal:

- run the existing game in an Android app shell

Tasks:

- add Capacitor
- configure web asset output
- create Android project
- launch internal build

Difficulty:

`Medium`

## Phase 2: Offline asset hardening

Goal:

- make the Android app self-contained

Tasks:

- bundle fonts locally
- verify no hidden network dependency remains
- ensure boot flow works offline

Difficulty:

`Low`

## Phase 3: Mobile UX hardening

Goal:

- ensure the game actually feels good on touch devices

Tasks:

- validate tap selection reliability
- validate drag-and-release
- validate slice gestures
- ensure tutorial overlays do not crowd small screens
- ensure HUD remains readable on phone-sized displays
- map Android back button appropriately

Difficulty:

`Medium to High`

This is likely the highest-value platform-specific workstream.

## Phase 4: Lifecycle and persistence hardening

Goal:

- make Android resume behavior safe and predictable

Tasks:

- test app pause/resume
- test screen off/on
- test incoming interruption scenarios
- test save persistence after kill/relaunch

Difficulty:

`Medium`

## Phase 5: Performance and device compatibility

Goal:

- ensure the app remains playable on mid-range and lower-end devices

Tasks:

- test `LOW` and `HIGH`
- confirm FPS display and graphics profile behavior
- profile late-game phases with many nodes/tentacles/hazards
- tune if needed for thermal/performance constraints

Difficulty:

`Medium to High`

## Phase 6: Release readiness

Goal:

- produce a store-ready build

Tasks:

- app icons
- splash screen
- signing config
- versioning
- package id
- store metadata

Difficulty:

`Medium`

## Android-Specific Risk Areas

## High-value areas to test first

### Touch precision and gesture arbitration

This is the most important runtime UX risk.

Why:

- the game depends on:
  - tap
  - drag-connect
  - slice
  - hover-less interaction

Even with the current touch improvements, this must be tested on real hardware.

### Audio after app resume

This is the most important platform lifecycle risk.

Why:

- Android WebView/browser audio can be suspended or behave inconsistently after backgrounding

### Performance on late phases

This is the most important product-quality risk.

Why:

- late campaign phases combine:
  - many tentacles
  - hazards
  - relays
  - pulses
  - visual effects

### Text and UI scale

This is the most important readability risk.

Why:

- the game already improved font size and theming
- but Android screens still need real QA across small devices

## Required Android QA Matrix

Minimum recommended QA:

- one small Android phone
- one mid-size Android phone
- one tablet if possible
- one lower-end or older device

Critical scenarios:

- first install launch
- no-network launch
- music/sfx after first input
- portrait/landscape policy validation
- resume after app background
- low-battery/performance mode
- tutorial completion
- pause/back behavior
- phase skip flow
- save persistence after kill/reopen

## Difficulty Assessment by Workstream

### Android shell bootstrap

`Medium`

### Touch UX hardening

`Medium to High`

### Audio/lifecycle behavior

`Medium`

### Packaging/signing/store prep

`Medium`

### Full production-quality Android release

Overall: `Medium to High`

## What does not need major rework

These parts are already in a good place for Android adaptation:

- core gameplay logic
- campaign structure
- settings system
- persistence model conceptually
- touch foundation
- graphics profile separation
- smoke/campaign/soak validation scripts

## What should be added before implementation starts

Recommended pre-implementation docs/tasks:

1. `android-shell-plan.md`
2. `android-touch-ux-checklist.md`
3. `android-release-checklist.md`
4. `offline-assets-plan.md`

## Recommendation

From a senior engineering perspective:

- Android is clearly achievable from the current repository
- it is not a rewrite problem
- it is primarily a **mobile UX, lifecycle, and packaging problem**

Recommended path:

- use `Capacitor`
- bundle all assets locally
- harden touch and lifecycle behavior on real devices
- then ship an internal APK before committing to store release
