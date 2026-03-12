# TentacleWars Energy Sanity

## Purpose

This suite protects the TentacleWars-specific energy rules that are easy to regress while the shared NodeWARS runtime keeps evolving.

## Command

```bash
node scripts/tw-energy-sanity.mjs
```

## Protects

- full-cap overflow gating
- overflow broadcast behavior
- packet-lane runtime determinism
- neutral acquisition helpers
- hostile reset-plus-carryover helper
- full refund of invested lane payload
