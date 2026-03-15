---
FROM: Claude
PROTOCOL: v2
TASK: TWL-020 CONFIRM + TWL-021 SPEC
TYPE: SPEC

---

## Part 1 — CONFIRM TASK-TWL-020

- [x] TW result path gated by `cfg.isTentacleWarsCampaign` — correct
- [x] TW result shows phase ID, stars, time vs par only — no NodeWARS stats
- [x] `stwe` screen registered, `showTwCampaignEnding()` stub replaced
- [x] `MENU PRINCIPAL` resets mode to `nodewars` and returns to `sm`
- [x] 6 browser stills captured — `output/playwright/twl-020/`
- [x] `90/90 + 11/11 + 10/10 + 1/1` PASS
- [x] Playwright path locked to Chromium-backed workflow — acknowledged, good call

**TASK-TWL-020 is DONE.**

---

## Part 2 — SPEC: TASK-TWL-021 TentacleWars Result + Ending Visual Polish

### Goal

The TW result and ending screens are functional but visually flat. This wave
makes them feel like proper game screens: readable, distinct from NodeWARS,
and appropriately celebratory at the right moments.

No new game logic. No new GameState fields. CSS + markup only.

---

### A — TW Result Screen Polish

**Current state in `src/ui/resultScreenView.js` (TW path):**
- Phase ID shown as plain text in a `lr/ll/lv` row
- Stars shown as `★☆☆` inline in a row — same font size as other rows
- Time vs par shown inline — color class applied to the number but no visual hierarchy

**Target state:**

**Phase ID** — display as a distinct badge/chip:
```html
<div class="tw-phase-badge">W2-04</div>
```
Style `.tw-phase-badge`:
- `font-family: var(--font-ui)`, `font-weight: 700`, `letter-spacing: 4px`
- `font-size: 11px`, `color: var(--p)`, `text-shadow: 0 0 14px var(--pg)`
- `border: 1px solid var(--line-strong)`, `border-radius: 999px`
- `padding: 4px 14px`, `display: inline-block`

**Stars block** — visually prominent, centered, larger font:
```html
<div class="tw-stars">★★☆</div>
```
Style `.tw-stars`:
- `font-size: 28px`, `letter-spacing: 6px`
- `color: var(--ac)`, `text-shadow: 0 0 20px var(--ag)`
- `text-align: center`, `margin: 4px 0 8px`
- `display: block`

**Time vs par** — keep the `result-good/alert/bad` color classes but wrap
the block more clearly:
```html
<div class="tw-time-row">
  <span class="ll">TEMPO</span>
  <span class="lv"><span class="result-good">34s</span></span>
  <span class="tw-par-note">par 45s</span>
</div>
```
Style `.tw-par-note`:
- `font-size: 10px`, `color: var(--dim)`, `letter-spacing: 1px`
- `margin-left: 6px`

**Overall TW result block** — wrap the three elements in a container:
```html
<div class="tw-result-block">
  <div class="tw-phase-badge">...</div>
  <div class="tw-stars">...</div>
  <div class="tw-time-row">...</div>
</div>
```
Style `.tw-result-block`:
- `display: flex; flex-direction: column; align-items: center; gap: 6px`
- `padding: 16px 0 8px`

Update `buildResultInfoMarkup` in `src/ui/resultScreenView.js` to emit
this structure when `cfg.isTentacleWarsCampaign` is true. Keep the NodeWARS
path untouched.

---

### B — TW Campaign Ending Screen Polish

**Fix copy errors in `src/ui/twCampaignEndingView.js`:**
- `'Campanha concluida'` → `'Campanha concluída'` (missing accent)
- `'Mundo 1 -> Mundo 4'` → `'Mundo 1 → Mundo 4'` (use Unicode arrow)

**Make the ending feel more distinct** by emitting richer markup from
`buildTwCampaignEndingMarkup()`. Return HTML string instead of a plain object:

```html
<div class="tw-ending-wrap">
  <div class="tw-ending-title">TENTACLE WARS</div>
  <div class="tw-ending-divider"></div>
  <div class="tw-ending-sub">Campanha concluída</div>
  <div class="tw-ending-meta">80 fases · Mundo 1 → Mundo 4</div>
</div>
```

Style `.tw-ending-wrap`:
- `display: flex; flex-direction: column; align-items: center; gap: 10px`
- `padding: 24px 0 12px`

Style `.tw-ending-title`:
- `font-family: var(--font-ui); font-weight: 900`
- `font-size: clamp(22px, 5vw, 36px); letter-spacing: 8px`
- `color: var(--p); text-shadow: 0 0 30px var(--pg)`

Style `.tw-ending-divider`:
- `width: 80px; height: 1px`
- `background: linear-gradient(90deg, transparent, var(--p), transparent)`
- `margin: 4px 0`

Style `.tw-ending-sub`:
- `font: 700 13px/1 var(--font-ui); letter-spacing: 3px`
- `color: var(--tx-soft)`

Style `.tw-ending-meta`:
- `font: 10px/1.6 var(--font-copy); color: var(--mid); letter-spacing: 1px`

**Fix `#stwe` CSS** — currently groups with `#stw, #stwl` (level-select layout).
Give `#stwe` its own rule as a centered, compact ending screen:

```css
#stwe {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  min-height: 60vh;
  padding: 40px 24px;
}
```

Remove `#stwe` from the `#sl, #stw, #stwl, #stwe` group in `styles/main.css`.

Update `ScreenController.js` `showTwCampaignEnding()` to inject the returned
HTML string from `buildTwCampaignEndingMarkup()` into the `stwe` container.
(Adjust the call site if it currently reads `.title / .subtitle / .meta` fields.)

---

### C — Browser Validation

Use the Chromium-backed playwright path (`scripts/tw-visual-playwright.mjs` or
`bash scripts/tw-visual-validation.sh`) to re-capture:

1. **TW result screen** — W1-01 cleared, confirm stars + phase badge + time row
2. **TW campaign ending screen** — confirm new layout and correct copy

Save stills under `output/playwright/twl-021/`.

---

### Files to create / update

1. **UPDATE** `src/ui/resultScreenView.js` — new TW result block HTML
2. **UPDATE** `src/ui/twCampaignEndingView.js` — richer HTML, fix copy
3. **UPDATE** `src/ui/ScreenController.js` — inject HTML string from ending view
4. **UPDATE** `styles/main.css` — new `.tw-result-block`, `.tw-phase-badge`,
   `.tw-stars`, `.tw-time-row`, `.tw-par-note`, `.tw-ending-*`, fix `#stwe` rule
5. **UPDATE** `docs/project/operational-kanban.md` — move TWL-020 to Done Recently, TWL-021 to Done Recently after validation

### Checks to run

```
node scripts/smoke-checks.mjs
node scripts/ui-actions-sanity.mjs
node scripts/ui-dom-sanity.mjs
node scripts/commentary-policy.mjs
```

### DECISIONS

- DECISION A: No new GameState fields. Stars and par come from existing state.
- DECISION B: Ending returns HTML string, not a plain object. ScreenController injects it via innerHTML on the `stwe` container.
- DECISION C: NodeWARS result path is NOT touched. Gate stays on `cfg.isTentacleWarsCampaign`.
- DECISION D: If `ScreenController.showTwCampaignEnding()` currently does `.title`/`.subtitle`/`.meta` field access, update to use the new HTML string. Document the change in the IMPL_REPORT.

### Expected report back

IMPL_REPORT with:
- TW result screen: phase badge, large stars, time/par row visible in still
- TW ending screen: correct copy, divider, no level-select layout bleed
- 2 browser stills: `twl-021/01-result.png`, `twl-021/02-ending.png`
- All checks passing

---
