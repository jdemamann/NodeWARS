---
FROM: Codex
PROTOCOL: v2
TASK: TASK-TWL-020 TW Result Screen + Campaign Ending + Browser Validation
TYPE: IMPL_REPORT

---

What I changed:
- updated `src/ui/resultScreenView.js`
  - added a TW-specific result path gated by `cfg.isTentacleWarsCampaign`
  - TW results now show only:
    - phase id
    - stars via `STATE.getTentacleWarsStars(levelId)`
    - time vs par with green / yellow / red severity
  - TW result markup no longer shows NodeWARS-only stats like wasted tentacles, frenzy, or hostile-start summary
- updated `src/ui/ScreenController.js`
  - registered a new `twEnding` screen key
  - kept NodeWARS ending unchanged
  - replaced the old `showTwCampaignEnding()` stub with a real dedicated ending-screen path
  - kept the TW campaign result flow on the shared result shell, but now with TW-specific content and labels
- created `src/ui/twCampaignEndingView.js`
  - minimal dedicated TW campaign ending copy
- updated `index.html`
  - added the new `stwe` TentacleWars campaign ending screen
  - added `btnTwEndingMenu`
- updated `src/ui/DomIds.js`
  - added the `stwe` screen id and TW ending element ids
- updated `src/main.js`
  - wired the TW ending menu button back to main menu
  - when leaving the TW ending screen, resets mode to `nodewars`
- extended guardrails:
  - `scripts/ui-actions-sanity.mjs`
  - `scripts/ui-dom-sanity.mjs`

TW result behavior:
- phase win now shows:
  - phase id
  - `★` / `☆` stars from canonical TW progression state
  - `TIME | PAR`
- button labels on the TW result path now read:
  - `MUNDOS`
  - `RETRY`
  - `PRÓXIMA FASE`
- NodeWARS result behavior remains on its original path

TW campaign ending behavior:
- `W4-20` now opens a dedicated `stwe` screen instead of the previous stub toast/redirect behavior
- ending copy is intentionally minimal:
  - `TENTACLE WARS`
  - `Campanha concluida · 80 fases`
  - `Mundo 1 -> Mundo 4`
- `MENU PRINCIPAL` returns to `sm` and resets `STATE.setGameMode('nodewars')`

Browser validation:
- captured stills in:
  - `output/playwright/twl-020/01-main-menu.png`
  - `output/playwright/twl-020/02-world-select.png`
  - `output/playwright/twl-020/03-level-select-w1.png`
  - `output/playwright/twl-020/04-w1-01-ingame.png`
  - `output/playwright/twl-020/05-result-screen.png`
  - `output/playwright/twl-020/06-campaign-ending.png`
- method used:
  - switched away from `playwright-cli` + Firefox after re-checking the repo docs and local scripts
  - used the repo-local Chromium-backed visual-validation path documented in `docs/test-notes/tw-visual-validation.md`
  - leveraged the Playwright package installed in `~/.npm/_npx/.../node_modules/playwright`
  - captured the result screen and campaign ending by direct JS call from the live page, which is explicitly allowed by the `TWL-020` spec if a full automated win path is inconvenient
- browser outcome:
  - `0` console errors during the capture run
  - warning count was non-zero, but limited to the existing non-blocking runtime noise already seen in prior visual passes

Checks:
- `node scripts/smoke-checks.mjs` → `90/90`
- `node scripts/ui-actions-sanity.mjs` → `11/11`
- `node scripts/ui-dom-sanity.mjs` → `10/10`
- `node scripts/commentary-policy.mjs` → `1/1`

Protocol lock-in:
- updated `AGENTS.md` to make the Chromium-backed browser-validation workflow explicit
- updated `docs/project/skill-usage-map.md` so future `playwright` usage in this repo points to:
  - `bash scripts/tw-visual-validation.sh ...`
  - `scripts/tw-visual-playwright.mjs`
- intent: avoid falling back again to the older `playwright-cli` + Firefox path on this Linux environment

EXPECTS:
- review / confirm `TASK-TWL-020`
- decide whether the next TW wave should target:
  - visual polish of the TW result/ending screens
  - or a new post-navigation / progression wave
