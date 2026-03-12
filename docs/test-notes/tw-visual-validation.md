# TentacleWars Visual Validation

## Purpose

This workflow gives Codex a reproducible browser loop for inspecting the live TentacleWars sandbox directly on the web page instead of relying only on code-level guardrails.

## Local Commands

Start a local static server:

```bash
bash scripts/tw-visual-server.sh 4173
```

Open the browser session through the Playwright wrapper:

```bash
bash scripts/tw-visual-validation.sh open
```

Refresh, capture a screenshot, and dump the DOM snapshot:

```bash
bash scripts/tw-visual-validation.sh snapshot
```

Close the session:

```bash
bash scripts/tw-visual-validation.sh close
```

## Output

- screenshots land in `output/playwright/`
- the Playwright snapshot text can be used together with the in-game debug snapshot to compare visible gameplay and runtime state

## Notes

- the workflow assumes the local Playwright skill wrapper exists at `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh`
- if browser automation is flaky in a given session, keep the screenshot path and debug snapshot text as the minimum reproducible artifacts
