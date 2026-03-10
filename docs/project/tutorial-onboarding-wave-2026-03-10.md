# Tutorial and Onboarding Wave

## Scope

This wave closed `TASK-026 Tutorial and Onboarding Playtest Sweep` and `TASK-027 Gameplay Micro-Bug Intake Wave`.

The goal was to make the tutorials stricter, safer, and easier to follow without reopening broad gameplay refactors.

## Problems Addressed

- tutorial steps could still drift from localized copy and button labels
- the `cut` step relied too much on indirect tentacle state instead of explicit slice completion
- capture steps could advance from the wrong node or from the wrong ownership outcome
- small onboarding regressions were easy to miss because the smoke layer did not yet assert the localized tutorial UI surface

## Changes Applied

### Tutorial flow

- tutorial `capture` steps now complete only when the expected neutral node is actually captured by the player
- tutorial `capture_relay` steps now complete only when the expected relay node is actually captured by the player
- tutorial `cut` steps now complete through an explicit `onSliceCut(...)` hook instead of inferring completion from retract side effects

### Tutorial UI copy

- the tutorial `NEXT` button is now localized through `i18n`
- tutorial world badges now use localized world labels instead of hardcoded English text

### Guardrails

- smoke checks now assert:
  - localized tutorial labels remain present in `i18n`
  - tutorial UI uses those localized labels
  - tutorial exposes explicit cut-step completion handling
  - `Game` notifies the tutorial when a valid slice cut is applied

## Result

- tutorials remain optional for campaign progression
- tutorials remain rigid enough to prevent lockout
- tutorial copy and gating are better aligned with the actual input model
- the onboarding surface is now better protected against future regressions
