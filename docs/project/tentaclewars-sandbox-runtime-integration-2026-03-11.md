# TentacleWars Sandbox Runtime Integration

## Purpose

Record the first point where the TentacleWars branch stopped being only a
pure-core library set and started affecting the live sandbox runtime.

## Runtime Pieces Now Wired

- sandbox nodes are marked with `simulationMode = 'tentaclewars'`
- node grade sync uses the TentacleWars grade table in the sandbox
- node display regen uses TentacleWars packet-rate values in the sandbox
- prior-frame incoming support is buffered as TentacleWars overflow budget
- tentacle outgoing throughput in the sandbox uses:
  - base per-grade rate
  - plus split-equal overflow from buffered `inFlow`
- player build cost in the sandbox now uses:
  - linear distance-only cost
  - no NodeWARS range surcharge
- tentacle build cost and max bandwidth now branch on source simulation mode

## Important Limitation

This is still a first-pass live integration.

The sandbox now feels materially closer to TentacleWars, but it is not yet a
fully packet-native runtime. The remaining gap is mainly in:

- discrete packet rendering / movement
- full capture resolution driven entirely by TentacleWars packet events
- lane feel and visual identity

## Why This Step Matters

The branch is now testable as a mechanical prototype instead of only a frozen
architecture proposal. Future playtest notes can now react to:

- level thresholds
- overflow pressure
- linear lane cost
- TentacleWars-specific hostility between red and purple

## Validation

- `70/70 smoke checks passed`
- `6/6 UI DOM sanity checks passed`
- `7/7 campaign sanity checks passed`
- `1/1 simulation soak checks passed`
- `1/1 commentary policy checks passed`
