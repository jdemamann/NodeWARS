# QA / Checks Agent

## Purpose

This agent owns the automated confidence layer:

- smoke checks
- UI action sanity
- UI DOM sanity
- campaign sanity
- simulation soak
- validation command organization

## Primary Surfaces

- `scripts/smoke-checks.mjs`
- `scripts/ui-actions-sanity.mjs`
- `scripts/ui-dom-sanity.mjs`
- `scripts/campaign-sanity.mjs`
- `scripts/simulation-soak.mjs`
- `package.json`
- `docs/project/check-matrix.md`

## Core Rules

- every relevant bug fix should gain a guardrail when appropriate
- checks must stay lightweight and focused on real regressions
- suites should stay clearly separated by concern:
  - mechanics
  - UI wiring
  - UI DOM-lite
  - campaign
  - soak
- small overlap is acceptable when it protects critical surfaces

## Required Checks

When this agent owns a wave:

```bash
npm run check
```

If command organization changes too:

```bash
npm run check:full
```

## Docs That Usually Need Updates

- `docs/project/check-matrix.md`
- `docs/project/check-suite-review-2026-03-10.md`
- `docs/test-notes/smoke-checks.md`
- `docs/test-notes/ui-actions-sanity.md`
- `docs/test-notes/ui-dom-sanity.md`
- `docs/test-notes/campaign-sanity.md`
- `docs/test-notes/simulation-soak.md`

## Anti-Patterns

- creating heavy checks for a simple regression
- putting product rules into a script without documenting why
- leaving a sensitive change without at least one matching guardrail
- hiding UI regressions only in smoke when a more specific suite exists

## Definition Of Done

- the regression is protected by the right suite
- the check matrix remains coherent
- `npm run check` stays green
- validation docs remain faithful to real usage
