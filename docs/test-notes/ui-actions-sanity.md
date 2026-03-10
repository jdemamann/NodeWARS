# UI Actions Sanity

Purpose:
- protect critical menu, settings, tutorial, pause, result, and ending-screen wiring
- protect PT/EN coverage for newly-added settings and debug actions
- protect clipboard/debug-preview fallbacks that are easy to break during UI refactors

Run:

```bash
node scripts/ui-actions-sanity.mjs
```

What it checks:
- screen ids stay unique in `index.html`
- critical buttons exist and remain wired in `main.js` / `Game.js`
- tutorial and HUD controls still respond through the intended handlers
- settings copy stays routed through `i18n`
- world-visibility toggles in `Settings` can force `World 2/3` on and off even after natural campaign unlock
- delegated menu feedback stays attached to dynamic controls such as world tabs and level cards
- font selection stays routed through `data-font` and shared font variables instead of hardcoded UI font names
- named screen transitions still exist for menu, levels, story, result, ending, pause, settings, and credits
- clipboard copy keeps both the modern API path and a legacy fallback
- debug preview for the campaign ending stays reachable

Notes:
- this suite is intentionally narrower than `smoke-checks.mjs`
- it focuses on UI action integrity, not gameplay simulation
- some overlap with the smoke suite is deliberate so critical menu regressions are caught even if one suite is skipped
