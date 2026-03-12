# TentacleWars Grade Sanity

## Purpose

This suite locks the TentacleWars grade model so threshold or Dominator changes do not silently drift away from the documented fidelity target.

## Command

```bash
node scripts/tw-grade-sanity.mjs
```

## Protects

- ascend and descend thresholds
- grade hysteresis
- Dominator throughput
- three-tentacle slot cap
