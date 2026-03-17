# TASK: TW In-Game UI Polish — Result Screen & HUD

**Status:** planned
**Branch:** tw-pure (do not touch NW menus before this task closes)
**Priority:** High — do before NW UI code is removed

---

## Context

After TW layer extraction (Waves 1–4) and NW legacy removal in Tent.js, the TW in-game UI
was never upgraded to match the polish level of NW. The NW result screen and HUD are
visually richer. This task documents the gaps and the plan to close them.

---

## Side-by-side comparison

### NW Result Screen (current — richer)

| Element | What it shows |
|---------|--------------|
| Title | "VICTORY" / "ANNIHILATED" (pulse overlay with green/red fill) |
| Subtitle | Level name — Phase X/30 · Next: Level Name |
| Score block | Animated ★★★ pop-in (one star per 340ms + SFX.capture()) |
| | Big score number with fade-in |
| | Par delta: `−Xs ▲` green or `+Xs ▼` red |
| | Personal best: `▲ BEST` or `BEST: NNN` |
| Info block | Phase: X/30 |
| | Time: Xs ±Y vs par (color-coded) |
| | Wasted: N link(s) (−N×25p penalty) |
| | Frenzies: Nx (+Np bonus, capped 90p) |
| | Enemies: N hostile starts |
| | MECH: VORTEX · RELAY · PULSAR etc. |
| Buttons | PHASES · RETRY · NEXT ▶ |

### TW Result Screen (current — sparse)

| Element | What it shows |
|---------|--------------|
| Title | "PHASE CLEAR" / "ANNIHILATED" (same title, no overlay) |
| Subtitle | TW-1-01 — Next: TW-1-02 (or RETRY) |
| Score block | **Hidden** (`display: none`) |
| Info block | TW phase badge (level id) |
| | Static stars: ★★☆ (plain text, no animation) |
| | Time: Xs — par comparison (color-coded) |
| Buttons | TW WORLDS · RETRY · NEXT PHASE ▶ |

### HUD during gameplay

| Element | NW | TW |
|---------|----|----|
| Live score | ★★★ NNN points (live) | **Hidden** |
| Par timer | ✓ PAR ±Xs | ✓ PAR ±Xs |
| Mode label | NODE WARS | TentacleWars |

---

## Gaps to close

### Gap 1 — Animated star reveal (HIGH)

NW animates each star with a pop-in + `SFX.capture()` at 280, 620, 960ms.
TW shows static `★★☆` text in the info block with no animation.

**Fix:** Replace static star text in TW result with the same animated star reveal
mechanism. The score block is hidden — either unhide it and populate it with the
star animation, or add the animation inline to the TW info block.

**Where:** `src/ui/ScreenController.js` → `renderTwResultScreen()`
**Code ref:** Lines 530–558 (NW star animation loop) → replicate for TW

### Gap 2 — Personal best indicator (MEDIUM)

NW shows `▲ BEST` or `BEST: NNN` after the par comparison.
TW shows nothing about previous runs.

**Fix:** After computing the current star count, read `STATE.getTentacleWarsStars(levelId)`
and the previous best time from `STATE.getTentacleWarsBestTime(levelId)` (add if missing).
Show `▲ NEW BEST` or `BEST: Xs` below the time comparison.

**Where:** `src/ui/resultScreenView.js` → `buildResultInfoMarkup()` TW branch
**State:** Check `GameState.js` for existing TW time storage; may need to add `bestTime`

### Gap 3 — Live HUD during gameplay (MEDIUM)

TW completely hides the score element during gameplay (`scoreElement.style.display = 'none'`).
NW shows live ★ count + points.

TW equivalent of live score: current star rating based on elapsed time vs par.
Show `★★☆ PAR +12s` or `★★★ −5s` in the HUD bar.

**Fix:** In `HUD.update()`, when `isTentacleWarsMode`:
- Compute current star count from `elapsedSeconds` vs `cfg.par`
- Show `★★☆` + time status instead of hiding the score element

**Where:** `src/ui/HUD.js` → `update()` lines 71–86

### Gap 4 — Level mechanics summary in TW (LOW)

NW result screen shows `MECH: VORTEX · RELAY · PULSAR` for the level.
TW result screen shows nothing about what mechanics were in play.

TW has its own mechanics (relays, energy nodes, clash pressure). The authored
TW campaign levels have varying configurations. Showing which mechanics were
present would give useful context after clearing a hard level.

**Fix:** Add a mechanics summary row to the TW result. Use existing
`buildMechanicSummary()` if the TW level config has the same fields,
or add a TW-specific variant (e.g. "RELAY · 3 WORLDS" etc.).

**Where:** `src/ui/resultScreenView.js` → `buildResultInfoMarkup()` TW branch

### Gap 5 — Phase overlay color (LOW)

NW result title ("VICTORY"/"ANNIHILATED") has a pulsing color fill overlay via
`UIRenderer.drawPhaseOutcome()` — green for win, red for lose.

TW uses the same `drawPhaseOutcome()` from the renderer — this is shared.
Check if this is actually firing for TW, or if it's gated somewhere.

**Where:** `src/rendering/UIRenderer.js` → `drawPhaseOutcome()`
Check: `src/core/Game.js` → where `game.phaseOutcome` is set for TW vs NW

---

## What NOT to port from NW

- **Wasted tentacles counter** — TW has no wasted-tentacle mechanic (different kill semantics)
- **Frenzy counter** — TW has no frenzy system
- **Points-based score number** — TW uses time+stars, not a points score
- **Phase X/30 info** — TW has its own level ID system (TW-1-01 etc.)

---

## Implementation order

1. Gap 1 (animated star reveal) — highest impact, pure UI
2. Gap 3 (live HUD star widget) — players need feedback during play
3. Gap 2 (personal best) — requires STATE extension first
4. Gap 4 (mechanics) — lowest impact, nice-to-have
5. Gap 5 (overlay check) — quick verification, not a real change

---

## Files to touch

- `src/ui/resultScreenView.js` — TW branch of `buildResultInfoMarkup()`
- `src/ui/ScreenController.js` — `renderTwResultScreen()` (star animation)
- `src/ui/HUD.js` — `update()` TW live score widget
- `src/core/GameState.js` — possibly add `getTentacleWarsBestTime()` for Gap 2
- Verify: `src/core/Game.js` — `game.phaseOutcome` set path for TW

## Guardrails to update

- Update `smoke-checks.mjs` test `testCanvasFeedbackEventsStayPresent` if
  `game.phaseOutcome` path changes
- Add a new sanity check: TW result screen shows animated stars on win

---

## Do before removing NW UI

The NW `buildResultInfoMarkup` NW branch can be removed once TW is at parity.
TW `isTentacleWarsCampaign` branch already exists and is the right place.

Do not delete:
- `buildMechanicSummary()` — reusable for TW too
- NW star animation code in ScreenController — copy it to TW then delete

The NW result score block (lines 528–567 in ScreenController) should be studied
and replicated for TW before being removed.
