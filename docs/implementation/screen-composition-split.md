# Screen Composition Split

## Goal

Reduce the size and responsibility load of [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js) without changing menu, level-select, banner, or result behavior.

## What Changed

Screen composition helpers now live in focused modules:

- [screenWorldMeta.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/screenWorldMeta.js)
  - world-tab metadata
  - level-grid accent metadata
  - world-banner metadata
- [levelSelectView.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/levelSelectView.js)
  - level mechanic badges
  - purple-enemy badges
- [resultScreenView.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/resultScreenView.js)
  - result summary markup
  - mechanic summary formatting

## Current Boundary

[ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js) now focuses on:

- DOM lookup and screen visibility
- event-triggered screen transitions
- wiring current game/runtime state into screen builders

The helper modules focus on:

- world-facing metadata
- pure HTML composition
- product-state formatting

## Why This Matters

- easier to change one screen area without touching unrelated flows
- easier to localize or restyle level-select and result summaries
- easier to review UI changes in smaller files

## Remaining Opportunity

If the UI layer needs another pass later, the next split target is the settings/debug panel block inside [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js).
