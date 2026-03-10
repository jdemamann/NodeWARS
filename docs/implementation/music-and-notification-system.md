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
- track-change listener registration

Gameplay themes are selected through:

- `Music.playLevelTheme(levelConfig)`

Current grouping:

- World 1 opening/tutorial phases
- World 1 mid-pressure phases
- World 1 boss
- World 2 opening/tutorial phases
- World 2 mid-pressure phases
- World 2 boss
- World 3 opening/tutorial phases
- World 3 mid-pressure phases
- World 3 late/final pressure phases
- campaign ending

The menu theme remains a separate sacred track.

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
