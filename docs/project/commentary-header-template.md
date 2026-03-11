# Commentary Header Template

## Purpose

This document defines the lightweight header style expected in `src/` modules.

Use these templates when:
- creating a new source file
- revisiting a source file that still lacks a module header
- adding or materially changing a function that has no short explanatory header yet

The goal is readability, not documentation overhead.

All code comments must stay in English.

---

## Module Header Template

Use this at the top of a source file.

```js
/*
 * Purpose:
 * Briefly describe what this module owns.
 *
 * Responsibilities:
 * - Main responsibility one.
 * - Main responsibility two.
 *
 * Runtime role:
 * Mention where it is used or why it matters in the flow.
 */
```

Keep it short. Most modules only need:
- `Purpose`
- `Responsibilities`
- `Runtime role`

Do not add sections that do not help the next reader.

---

## Function Header Template

Use this above a new or materially changed function when the intent is not obvious from the name alone.

```js
/*
 * Resolves the player-facing preview model for the current interaction target.
 * Input: current source node, hovered target node, and gameplay context.
 * Output: a small view-model consumed by the HUD preview.
 */
function buildPreviewModel(...) {
  ...
}
```

Guidelines:
- explain purpose first
- keep input/output to one short line each when helpful
- use this for:
  - orchestration functions
  - rule-heavy helpers
  - non-trivial UI builders
  - tuning-sensitive resolvers

Do not add this to trivial one-liners unless they are unusually important.

---

## Class Method Header Template

```js
/*
 * Applies the current tactical profile to target selection.
 * Input: source node and candidate targets for this AI tick.
 * Output: a ranked score used by the move picker.
 */
_scoreTargets(...) {
  ...
}
```

Use it the same way as the function template.

---

## Constant Block Header Template

```js
/*
 * Neutral capture tuning.
 * Higher values make early expansion faster and reduce the time a node stays contested.
 */
export const NEUTRAL_CAPTURE_RULES = {
  ...
};
```

Focus on:
- what this block tunes
- what increasing or decreasing it tends to do

Do not just restate the constant names.

---

## What To Avoid

- line-by-line narration
- stale comments that no longer match the code
- Portuguese comments in source files
- heavy JSDoc for trivial helpers
- comments that repeat the function name without adding intent

---

## Enforcement

The repository includes `scripts/commentary-policy.mjs`.

It enforces that:
- every changed `src/*.js` file keeps a top module header
- every newly added or modified function signature in changed `src/*.js` files has a nearby block header comment

Run it directly with:

```bash
node scripts/commentary-policy.mjs
```

It is also part of the full local check gate.
