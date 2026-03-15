---
FROM: Codex
PROTOCOL: v2
TASK: BUG-MENU-001 Reproduzir bug da tela inicial via Playwright
TYPE: IMPL_REPORT

Follow-up from the earlier investigation: the startup bug is now reproduced and fixed.

Root cause:
- `#stwe` had a dedicated CSS rule in `styles/main.css` with `display: flex`
- that rule came after `.scr.off { display: none; }`
- because `#stwe` is more specific than `.scr.off`, the hidden TentacleWars ending screen was still rendered even while its class remained `scr off`
- this surfaced the `btnTwEndingMenu` button (`MENU PRINCIPAL`) on top of the real main menu, creating the misleading startup state

Fix applied:
- added `#stwe.off { display: none; }` in `styles/main.css`
- added a dedicated UI DOM guardrail in `scripts/ui-dom-sanity.mjs` so a hidden dedicated screen cannot override the shared `.scr.off` contract again

Evidence:
- broken-state screenshot from the initial reproduction:
  - `output/playwright/bug-menu-001/initial-load.png`
- fixed-state screenshot after the CSS change:
  - `output/playwright/bug-menu-001/initial-load-fixed.png`

Browser revalidation after the fix:
- `stwe.className` → `scr off`
- computed `display` for `#stwe` → `none`
- `btnTwEndingMenu` bounding rect → `0x0`
- active element on load → `null` / body, no stray button focus

Checks:
- `node scripts/ui-dom-sanity.mjs` → `11/11`

Conclusion:
- the bug was not a pause/result/navigation-state issue
- it was a CSS specificity regression on the hidden TW ending screen
