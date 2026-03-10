# Music Theme Agent

## Purpose

This agent owns the musical identity of the project:

- menu theme direction
- world themes
- campaign-ending music intent
- motif continuity between tracks
- musical pacing across menus and gameplay
- procedural music rules and constraints

## Primary Surfaces

- `src/audio/Music.js`
- `src/core/Game.js`
- `src/ui/ScreenController.js`
- `src/config/gameConfig.js` when music-facing tuning is introduced
- any docs that describe theme identity or ending presentation

## Core Rules

- the score should remain highly distinctive, not generic placeholder game music
- world themes should feel related, but still clearly belong to different campaign spaces
- menu, gameplay, and ending music should feel like one authored musical language
- sacred or intentionally fixed themes must remain explicitly documented in code comments
- comments in code must remain in English, including all musical notes and guardrails
- creative changes should preserve readability and maintainability of the procedural music layer

## Creative Goals

- strong melodic identity over pure ambience
- recognizable motifs that can evolve from world to world
- a sense of organic sci-fi tension rather than anonymous synth wallpaper
- campaign ending music should feel like resolution, not just a reused victory sting

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

when music changes are tied to specific screens, ending flow, or menu behavior.

Run the full gate:

```bash
npm run check
```

if timing, settings integration, or audio lifecycle behavior changes materially.

## Docs That Usually Need Updates

- `README.md` if the audio identity or controls change publicly
- `docs/project/check-suite-review-2026-03-10.md` if new music guardrails are added
- `docs/project/development-operating-model-report-2026-03-10.md` if music becomes a more formal production track

## Anti-Patterns

- turning the score into interchangeable background ambience
- changing fixed musical themes without documenting why
- hiding music behavior behind magic numbers with no comment
- mixing creative experimentation with unclear runtime lifecycle changes in one wave
- adding timing hacks without matching guardrails

## Definition Of Done

- the music remains distinctive and authored
- the procedural music code stays understandable
- screen/music behavior remains coherent
- relevant checks stay green
