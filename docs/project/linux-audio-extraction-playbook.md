# Linux Audio Extraction Playbook

## Purpose

This playbook defines the standard Linux workflow for turning an authored track
into a reusable analysis package for future soundtrack recreation work.

Use it when you want to:

- preserve as much musical structure as possible from a track you own
- extract stems, timing, key, and rough MIDI
- generate a repeatable folder layout that can be handed back into this project
- create a `notes.txt` file with both auto-generated metadata and manual musical intent

This document is intentionally detailed so the process can be repeated later
without rediscovery.

## What This Workflow Produces

A finished extraction package should look like this:

```text
track-package/
  source/
    mix.wav
    mix.mp3
  stems/
    drums.wav
    bass.wav
    vocals.wav
    other.wav
  midi/
    mix_basic_pitch.mid
    bass_basic_pitch.mid
    other_basic_pitch.mid
  analysis/
    ffprobe.json
    tempo.csv
    key.csv
    waveform-notes.txt
  notes.txt
```

Not every project will produce every file, but this is the target structure.

## Recommended Toolchain

There is no single Linux tool that does all of this well. The practical
pipeline is:

1. `ffmpeg`
   - convert and normalize source audio
2. `ffprobe`
   - inspect stream metadata
3. `demucs`
   - separate stems
4. `sonic-annotator` + Vamp plugins
   - detect tempo/key and musical descriptors
5. `basic-pitch`
   - produce approximate MIDI
6. optional DAW or waveform editor
   - confirm section markers manually

## Recommended Output Location

For this project, keep personal extraction packages outside the shipped game
assets unless they are approved production content.

Recommended local workspace:

```text
tmp/audio-analysis/<track-slug>/
```

Example:

```text
tmp/audio-analysis/stella/
```

That keeps analysis artifacts out of the runtime until a final musical decision
is made.

## Dependencies

### System packages

Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg sonic-annotator vamp-plugin-sdk vamp-qm-vamp-plugins
```

### Python tools

Prefer user installs:

```bash
python3 -m pip install --user demucs basic-pitch
```

If you prefer virtual environments, create one before installation.

## Step 1: Create the Working Folder

Choose a short, stable slug for the track.

Example:

```bash
mkdir -p tmp/audio-analysis/stella/{source,stems,midi,analysis}
```

You should now have:

```text
tmp/audio-analysis/stella/
  source/
  stems/
  midi/
  analysis/
```

## Step 2: Copy the Source Audio

Copy the original file into the package first, even if it is an MP3.

Example:

```bash
cp ~/imgs/Incubus-Stellar.mp3 tmp/audio-analysis/stella/source/mix.mp3
```

If you already have an original WAV export from the DAW, prefer that instead of
the MP3 and store it as:

```text
source/mix.wav
```

## Step 3: Convert to WAV

Always create a clean analysis WAV, even if the source is already playable.

Example:

```bash
ffmpeg -i tmp/audio-analysis/stella/source/mix.mp3 \
  -ar 44100 \
  -ac 2 \
  tmp/audio-analysis/stella/source/mix.wav
```

Explanation:

- `-ar 44100`
  - standard sample rate for analysis
- `-ac 2`
  - stereo output

## Step 4: Capture Machine Metadata with ffprobe

This gives the technical baseline for the track.

Example:

```bash
ffprobe -v quiet \
  -print_format json \
  -show_format \
  -show_streams \
  tmp/audio-analysis/stella/source/mix.wav \
  > tmp/audio-analysis/stella/analysis/ffprobe.json
```

This file helps capture:

- duration
- codec
- sample rate
- channel count
- bit rate

## Step 5: Separate the Stems

Run Demucs on the WAV file.

Example:

```bash
python3 -m demucs \
  --out tmp/audio-analysis/stella/stems-demucs \
  tmp/audio-analysis/stella/source/mix.wav
```

Demucs will usually create a nested folder. Move the final files into the
standard package layout:

```bash
find tmp/audio-analysis/stella/stems-demucs -type f -name '*.wav'
```

Typical output names:

- `drums.wav`
- `bass.wav`
- `other.wav`
- `vocals.wav`

Copy them into:

```text
tmp/audio-analysis/stella/stems/
```

If there are no vocals in the track, the `vocals.wav` stem may still be useful
as a placeholder channel. Keep it unless it is completely empty.

## Step 6: Estimate Tempo with Sonic Annotator

Example:

```bash
sonic-annotator \
  -d vamp:qm-vamp-plugins:qm-tempotracker:tempo \
  tmp/audio-analysis/stella/source/mix.wav \
  -w csv \
  --csv-basedir tmp/audio-analysis/stella/analysis
```

This will write a CSV file under:

```text
tmp/audio-analysis/stella/analysis/
```

You can inspect it with:

```bash
ls tmp/audio-analysis/stella/analysis
```

## Step 7: Estimate Key

If the relevant Vamp plugin is available:

```bash
sonic-annotator \
  -d vamp:qm-vamp-plugins:qm-keydetector:key \
  tmp/audio-analysis/stella/source/mix.wav \
  -w csv \
  --csv-basedir tmp/audio-analysis/stella/analysis
```

If the key detector plugin is unavailable, note that in `notes.txt` and fill
the key manually later.

## Step 8: Create Approximate MIDI

Basic Pitch can generate useful rough MIDI, especially from stems.

### Full mix

```bash
basic-pitch tmp/audio-analysis/stella/midi tmp/audio-analysis/stella/source/mix.wav
```

### Bass stem

```bash
basic-pitch tmp/audio-analysis/stella/midi tmp/audio-analysis/stella/stems/bass.wav
```

### Harmonic stem

```bash
basic-pitch tmp/audio-analysis/stella/midi tmp/audio-analysis/stella/stems/other.wav
```

This will produce MIDI files in:

```text
tmp/audio-analysis/stella/midi/
```

Important limitation:

- full-mix MIDI will not be perfect
- bass stem MIDI is usually more useful than full-mix MIDI
- harmonic stem MIDI can still be noisy

Treat these as reconstruction helpers, not ground truth.

## Step 9: Generate an Initial notes.txt Automatically

You asked for a way to automate even this part. The goal here is not to produce
final musical truth, but to generate a structured starting file that can be
edited later.

Create this shell script locally:

```bash
cat > tmp/audio-analysis/stella/generate-notes.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT="tmp/audio-analysis/stella"
FFPROBE_JSON="$ROOT/analysis/ffprobe.json"
NOTES_TXT="$ROOT/notes.txt"

DURATION="$(python3 - <<'PY'
import json
from pathlib import Path
data = json.loads(Path("tmp/audio-analysis/stella/analysis/ffprobe.json").read_text())
duration = data.get("format", {}).get("duration", "unknown")
print(duration)
PY
)"

cat > "$NOTES_TXT" <<EOF2
Title: Stella
Author: [fill in]
Source file: source/mix.wav
Duration seconds: $DURATION
BPM: [fill in from tempo analysis]
Key: [fill in from key analysis]
Time signature: 4/4

Structure:
0:00 intro
[fill manually]

Mood:
- [fill manually]
- [fill manually]
- [fill manually]

Instrumentation:
- drums: [fill manually]
- bass: [fill manually]
- harmony: [fill manually]
- lead: [fill manually]

Notes:
- Generated from Linux Audio Extraction Playbook
- Confirm structure manually in a DAW or waveform editor
- Confirm BPM/key manually if analysis disagrees with musical reality
EOF2
EOF
chmod +x tmp/audio-analysis/stella/generate-notes.sh
```

Then run:

```bash
tmp/audio-analysis/stella/generate-notes.sh
```

This gives you a consistent starter `notes.txt` that can be refined later.

## Step 10: Add Section Markers Manually

This is the part you should not trust automation to finish perfectly.

Open the track in:

- Reaper
- Audacity
- Ardour
- your main DAW

Then write section boundaries like:

```text
Structure:
0:00 intro
0:18 verse
0:42 chorus
1:10 bridge
1:32 chorus
2:05 outro
```

This matters more than many auto-generated descriptors because structure is one
of the most useful ingredients for later recreation.

## Step 11: Optional Manual Notes That Help Most Later

If you want the best future recreation quality, add these observations:

- where the drums open up
- where the bass becomes more active
- whether the lead is sparse or continuous
- whether the harmony is dark, bright, suspended, major, minor, modal
- whether the track feels dry, huge, intimate, dreamy, aggressive, nocturnal

These notes are extremely useful later when translating the track into a game
music engine.

## Suggested Final notes.txt Format

Use this structure:

```text
Title: Stella
Author: [your name]
Source file: source/mix.wav
Duration seconds: 196.05
BPM: 94
Key: E minor
Time signature: 4/4

Structure:
0:00 intro
0:18 verse
0:42 chorus
1:10 bridge
1:32 chorus
2:05 outro

Mood:
- nocturnal
- suspended
- hopeful

Instrumentation:
- drums: restrained kick, dry snare, airy hats
- bass: rounded and supportive
- harmony: wide suspended chords
- lead: floating, delayed, emotional

Notes:
- stem extraction complete
- bass MIDI usable
- full mix MIDI only approximate
- recreate with emphasis on pulse, space, and emotional lift
```

## Validation Checklist

Before handing the package back into the project, confirm:

- `source/mix.wav` exists
- `analysis/ffprobe.json` exists
- at least `drums.wav`, `bass.wav`, and `other.wav` exist
- at least one MIDI file exists
- `notes.txt` exists
- `notes.txt` includes:
  - BPM
  - key
  - structure
  - mood

## Reuse Rule For This Project

This repository should treat the structure below as the canonical extraction
layout for future custom soundtrack recreation work:

```text
tmp/audio-analysis/<track-slug>/
  source/
  stems/
  midi/
  analysis/
  notes.txt
```

If a future agent needs to recreate or reinterpret an authored track supplied
by the project owner, this is the first structure to request.

## Practical Minimal Version

If you want the fastest useful package, produce only:

```text
source/mix.wav
stems/drums.wav
stems/bass.wav
stems/other.wav
analysis/ffprobe.json
notes.txt
```

That is already enough to do much better work than from an MP3 alone.
