# Music and Notification System

## Summary

The game now uses two connected runtime systems:

- grouped procedural soundtrack themes, selected by campaign context
- structured bottom-right notifications for music changes and key gameplay events

This replaces the older model where gameplay music only changed by world and
all player-facing feedback reused a single plain-text toast.

## Music grouping

`src/audio/Music.js` is now the canonical source for:

- track metadata
- grouped theme playback
- ending-theme playback
- soundtrack preview playback from Settings
- track-change listener registration

Gameplay themes are selected through:

- `Music.playLevelTheme(levelConfig)`

Current grouped soundtrack map:

- `DRIFT SIGNAL`
  - menu only
  - sacred theme, intentionally unchanged
- `GENESIS PULSE`
  - World 1 tutorial and phases `1-4`
- `SIEGE BLOOM`
  - World 1 phases `5-9`
- `ECHO CORE`
  - World 1 phase `10`
- `HOLLOW SIGNAL`
  - World 2 tutorial and phases `12-14`
- `ENTROPY CURRENT`
  - World 2 phases `15-20`
- `OBLIVION GATE`
  - World 2 phase `21`
- `CURRENT`
  - World 3 tutorial and phases `23-24`
- `SIGNAL WAR`
  - World 3 phases `25-28`
- `TRANSCENDENCE PROTOCOL`
  - World 3 phases `29-32`
- `THE NETWORK AWAKENS`
  - campaign ending
- `STELLA`
  - soundtrack player bonus track
- `AQUEOUS`
  - soundtrack player bonus track

## Notifications

`src/ui/ScreenController.js` now exposes:

- `showNotification(...)`
- `showToast(...)`

`showToast(...)` is kept as a compatibility wrapper for legacy call sites, but
the primary surface is now the structured notification card rendered into
`#notifications`.

Notification cards support:

- kind
- icon
- kicker
- title
- body
- meta
- duration
- dedupe key
- priority-aware suppression / eviction

For music changes specifically:

- the title is the track name
- the body is a short emotional description of the track's intent
- technical metadata such as BPM or loop duration is intentionally omitted from the player-facing card

Priority behavior:

- `warning` outranks all other runtime cards
- `objective` outranks music/status/debug cards
- duplicate events can be suppressed by a short dedupe window keyed by event identity

## Current uses

The new notification stack is already used for:

- soundtrack changes
- signal tower full-reveal activation
- AI defensive retreat signal
- debug snapshot copied
- progress reset

## Settings soundtrack player

The settings screen now includes a lightweight soundtrack player:

- previous track
- play / pause preview
- next track

The soundtrack player can also expose bonus tracks that are not assigned to the
campaign timeline. `STELLA` currently lives in that bonus slot.

This preview surface uses the same canonical `Music` module as the rest of the
game, instead of a separate settings-only audio path.

The Credits screen always switches to `STELLA` while it is open and restores
the menu theme when returning to the main menu.

## Final campaign flow

The final campaign screen now plays the dedicated ending theme through:

- `Music.playEnding()`

This is triggered both by:

- beating phase `32`
- the debug ending preview

## Validation

The new layer is protected by:

- `smoke-checks.mjs`
- `ui-actions-sanity.mjs`
- `ui-dom-sanity.mjs`

These guard:

- grouped music selection
- ending music
- track-change listener wiring
- localization of notification copy
- notification DOM rendering
