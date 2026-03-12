# Audio Reconstruction Agent

## Purpose

This agent owns the workflow for rebuilding a game-ready track from an
author-provided audio file.

Use it when the request is:

- "analyze this MP3 and turn it into a game track"
- "rebuild this authored song inside the procedural engine"
- "extract as much musical structure as possible before composing"
- "improve an existing bonus track using a better source analysis"

The goal is not ad-hoc imitation. The goal is a repeatable, maximum-information
pipeline that extracts structure first and only then rewrites the track for the
runtime music engine.

## Primary Surfaces

- `docs/project/linux-audio-extraction-playbook.md`
- `docs/project/track-package-notes-template.txt`
- `src/audio/Music.js`
- `src/localization/i18n.js`
- `docs/implementation/music-and-notification-system.md`
- `docs/project/music-refresh-wave-2026-03-10.md`

## Canonical Extraction Package

Every authored-track analysis should be organized like this:

```text
tmp/audio-analysis/<track-slug>/
  source/
  stems/
  midi/
  analysis/
  notes.txt
```

This structure is the handoff contract for future music reconstruction work.

## Standard Workflow

1. Prepare the analysis package from the source audio
2. Extract machine metadata and stems
3. Estimate tempo, tonal center, and structural changes
4. Summarize findings in `notes.txt`
5. Translate those findings into a procedural track design
6. Integrate the new track into `Music.js`
7. Add player metadata and localized emotional descriptions
8. Validate soundtrack browsing and runtime safety

Do not skip the extraction summary step. The music rewrite should be based on
captured evidence, not memory or guesswork.

## Reconstruction Rules

- Preserve the emotional identity of the source track first
- Reuse as much structural information as the engine can realistically express
- Prefer tempo, tonal center, density, section boundaries, and groove before
  trying to mimic ornamental details
- Keep comments in English
- If the rebuilt track is intentionally a bonus or preview-only track, document
  that clearly
- If the source track is user-authored and explicitly approved for close
  reconstruction, still adapt it to the procedural engine instead of forcing
  literal one-to-one imitation

## Required Outputs

Every wave of this type should leave behind:

- an updated runtime track in `src/audio/Music.js`
- localized track title / role strings if the track is user-facing
- a short doc or report that records:
  - source file used
  - tools used
  - tempo / tonal center / section observations
  - what changed in the procedural rewrite

## Required Checks

At minimum:

```bash
node scripts/smoke-checks.mjs
node scripts/commentary-policy.mjs
```

If the soundtrack player or settings UI changed, also run:

```bash
node scripts/ui-actions-sanity.mjs
node scripts/ui-dom-sanity.mjs
```

If the music lifecycle or track browsing changed materially, run:

```bash
npm run check
```

## Anti-Patterns

- rebuilding a track without first creating an analysis package
- changing a bonus track directly from memory
- skipping `notes.txt`
- mixing technical extraction notes with public-facing emotional copy
- putting extraction artifacts directly into shipped runtime folders
- treating a source MP3 as enough information when structured extraction was
  available

## Definition Of Done

- the extraction package exists or the wave documents why it was unavailable
- the rebuilt track clearly reflects the extracted musical structure
- soundtrack player metadata remains correct
- the runtime music engine stays stable
- validation passes
