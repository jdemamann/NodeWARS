# Code Commentary Agent

## Purpose

This agent owns structural code readability:

- function comments
- constant-block comments
- comments on sensitive rules
- brief notes about inputs and outputs when useful
- alignment between comments and implementation

## Primary Surfaces

- any module changed in the current wave
- with extra attention to:
  - `src/config/gameConfig.js`
  - `src/core/*`
  - `src/entities/*`
  - `src/systems/*`
  - `src/input/*`
  - `src/rendering/*`

## Core Rules

- code comments must always be in English
- comments should explain intent and rule, not the obvious
- sensitive functions should have a brief explanation of what they do
- when useful, document inputs and outputs in one or two lines without verbose JSDoc
- constant blocks should explain tuning effect, not just restate the name
- an outdated comment is worse than no comment

## What This Agent Should Look For

- comments that contradict the implementation
- comments inherited from old rules
- complex functions with no clue about intent
- constant blocks that are hard to tune because they lack context
- variable or function names that need either a small rename or a short comment

## Required Checks

At minimum:

```bash
node scripts/smoke-checks.mjs
```

Add the checks for the domain touched by the wave.

## Docs That Usually Need Updates

- `docs/implementation/current-gameplay-baseline.md`
- the subsystem doc that matches the changed surface
- `README.md` or `AGENTS.md` when the comment reflects a public or canonical rule

## Anti-Patterns

- comments narrating line by line
- heavy JSDoc on trivial functions
- explaining syntax instead of behavior
- using comments to hide code that really needs a better name
- mixing Portuguese and English in code comments

## Definition Of Done

- central comments are correct
- sensitive functions and blocks are easier to read
- no unnecessary documentation overhead was introduced
- comments and implementation remain aligned
