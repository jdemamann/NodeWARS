# UI DOM Sanity

Purpose:
- execute a lightweight DOM-like runtime for the screen manager
- validate key UI state mutations without adding a full browser/E2E stack
- catch regressions that source-inspection checks cannot see

Run:

```bash
node scripts/ui-dom-sanity.mjs
```

What it checks:
- `showScr(...)` hides all other screens and reveals only the requested one
- `refreshSettingsUI()` reflects effective state, not just raw persisted settings
- debug-only rows appear/disappear in response to `debug`
- campaign ending populates its target nodes and hides HUD/tutorial overlays
- structured notifications append cards, dedupe repeat events, and prioritize warnings over low-priority cards
- world tabs respond to natural unlocks, manual world toggles, and debug mode

Notes:
- this suite uses a tiny fake DOM harness
- it is intentionally narrower than a real browser test runner
- it complements `ui-actions-sanity.mjs`, which focuses on wiring and source integrity
