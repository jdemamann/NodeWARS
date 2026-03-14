# TentacleWars Visual Validation

## Purpose

This workflow gives Codex a reproducible browser loop for inspecting the live TentacleWars sandbox directly on the web page instead of relying only on code-level guardrails.

## Local Commands

Start a local static server:

```bash
bash scripts/tw-visual-server.sh 4173
```

Ensure the bundled Playwright browser is installed:

```bash
bash scripts/tw-visual-validation.sh install
```

Open the browser session through the Playwright wrapper:

```bash
bash scripts/tw-visual-validation.sh open
```

By default this now uses the native Playwright `chromium` CLI/runtime, not the older `playwright-cli` wrapper and not Firefox.
Override only when needed:

```bash
TW_VISUAL_BROWSER=chromium bash scripts/tw-visual-validation.sh open
```

Capture a direct screenshot:

```bash
bash scripts/tw-visual-validation.sh snapshot
```

Run a small end-to-end visual smoke:

```bash
bash scripts/tw-visual-validation.sh smoke
```

Capture a deterministic TentacleWars scenario preset:

```bash
bash scripts/tw-visual-validation.sh scenario grade-showcase none
bash scripts/tw-visual-validation.sh scenario slice-lab slice-primary
```

Run the full named capture matrix:

```bash
bash scripts/tw-visual-matrix.sh
```

Close the session:

```bash
bash scripts/tw-visual-validation.sh close
```

If a prior run crashed and left a bundled-browser process behind:

```bash
bash scripts/tw-visual-validation.sh cleanup
```

## Output

- screenshots land in `output/playwright/`
- the smoke flow writes menu/settings captures into `output/playwright/`
- deterministic scenario captures land in `output/playwright/`
- the full matrix writes named artifacts into `output/playwright/matrix/`

## Notes

- the workflow now prefers the native Playwright CLI binary found in `~/.npm/_npx/.../node_modules/.bin/playwright`
- the snapshot and smoke flows use a local Node helper backed by the installed Playwright package instead of the older session-based `playwright-cli`
- the workflow now defaults to Chromium because Firefox sandbox subprocesses were crashing on this Linux environment (`libxul.so` segfaults in `dmesg`)
- the `scenario` flow autostarts the TentacleWars sandbox with `tw-debug=1`, `tw-mode=tentaclewars`, `tw-autostart=1`, and a named `tw-preset`
- the current matrix covers grade cards, pinned card state, capture labeling, slice retraction, clash midpoint, and dense-overlap readability
- if browser automation is flaky in a given session, keep the screenshot path and debug snapshot text as the minimum reproducible artifacts
