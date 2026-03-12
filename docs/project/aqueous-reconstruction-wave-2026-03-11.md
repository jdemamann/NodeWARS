# Aqueous Reconstruction Wave

## Purpose

Document the extraction and procedural rebuild of the bonus soundtrack track
`AQUEOUS`.

## Source

- source file: `~/imgs/Aqueous.mp3`
- extraction package:
  - `tmp/audio-analysis/aqueous/`

## Tools Used

- `ffmpeg`
- `ffprobe`
- Python venv: `.venv-audio`
- `librosa`
- `numpy`

## Extracted Signals

- duration: `403.49s`
- estimated tempo: `152.0 BPM`
- estimated tonal center: `A major`
- strongest pitch classes:
  - `E`
  - `D`
  - `F#`
  - `B`
  - `C#`
  - `A`
- strongest structural boundaries:
  - `24.23s`
  - `25.93s`
  - `50.36s`
  - `76.93s`
  - `81.48s`
  - `120.11s`
  - `139.66s`

## Translation Into The Runtime Engine

The procedural rebuild does not try to mirror the recorded arrangement one to
one. Instead it translates the extracted profile into:

- a faster `152 BPM` drive
- an A-centered harmonic field with a strong D/E pull
- a wetter, more fluid bonus-track identity
- sharper drum propulsion than `Stella`
- section contrast between glide, break, and surge states

## Runtime Placement

`AQUEOUS` is exposed only through the Settings soundtrack player as a bonus
track. It does not replace any campaign-context music.
