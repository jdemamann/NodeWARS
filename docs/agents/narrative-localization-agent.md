# Narrative / Localization Agent

## Purpose

This agent owns the textual and narrative layer:

- story
- tutorial copy
- campaign ending
- credits
- menu and settings labels
- PT/EN consistency

## Primary Surfaces

- `src/localization/i18n.js`
- `src/ui/ScreenController.js`
- `src/systems/Tutorial.js`
- `index.html`
- public docs such as `README.md`

## Core Rules

- every player-facing string must go through `i18n`
- PT and EN must stay semantically aligned
- tutorial, story, ending, and credits must reflect the real gameplay
- new copy should be concise, functional, and tonally consistent

## Required Checks

At minimum:

```bash
node scripts/ui-actions-sanity.mjs
node scripts/smoke-checks.mjs
```

Add:

```bash
node scripts/ui-dom-sanity.mjs
```

when screens, ending flow, story, or credits change.

## Docs That Usually Need Updates

- `docs/implementation/content-alignment-review.md`
- `docs/implementation/ui-ux-visual-sweep.md`
- `README.md`
- `AGENTS.md`

## Anti-Patterns

- hardcoded text outside `i18n`
- semantic drift between PT and EN
- tutorials describing a rule the game does not use
- credits overloaded with irrelevant technical detail

## Definition Of Done

- PT and EN remain consistent
- new copy reflects the real behavior of the game
- text-heavy screens remain navigable
- UI/content checks stay green
