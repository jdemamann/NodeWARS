# UI / UX Agent

## Purpose

This agent owns the player-facing experience outside and inside the arena:

- menus
- HUD
- settings
- visual tutorial surfaces
- i18n
- visual/audio button feedback
- special screens such as result and ending

## Primary Surfaces

- `src/ui/ScreenController.js`
- `src/ui/HUD.js`
- `src/main.js`
- `styles/main.css`
- `src/rendering/UIRenderer.js`
- `src/localization/i18n.js`
- `index.html`

## Core Rules

- every new menu/settings surface must go through `i18n`
- menu visual and audio feedback must stay consistent
- the selected font must cover the whole UI
- tutorial, ending, and result screens must remain navigable

## Required Checks

At minimum:

```bash
node scripts/ui-actions-sanity.mjs
node scripts/ui-dom-sanity.mjs
```

If the UI reflects gameplay or persistence rules:

```bash
node scripts/smoke-checks.mjs
```

## Docs That Usually Need Updates

- `docs/implementation/ui-ux-visual-sweep.md`
- `docs/implementation/content-alignment-review.md`
- `docs/test-notes/ui-actions-sanity.md`
- `docs/test-notes/ui-dom-sanity.md`
- `README.md`

## Anti-Patterns

- hardcoded text outside `i18n`
- new buttons without visual/audio feedback
- hardcoded fonts in CSS or canvas when a canonical helper exists
- new screens bypassing `showScr(...)` or `ScreenController`

## Definition Of Done

- the UI stays coherent in PT and EN
- changed buttons and menus respond visually and sonically
- UI checks stay green
