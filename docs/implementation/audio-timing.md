# Audio Timing

`src/audio/audioTiming.js` is now the canonical helper for lightweight
procedural-audio event timing.

It owns:

- monotonic time lookup for audio cooldown decisions
- cooldown eligibility checks
- cooldown recording
- one-call execution with cooldown guarding

Current consumer:

- `src/audio/SoundEffects.js`

Why this exists:

- keep procedural SFX timing logic out of ad-hoc inline code
- make cooldown behavior easier to audit and port
- reduce the chance of cooldown logic drifting between audio call sites
