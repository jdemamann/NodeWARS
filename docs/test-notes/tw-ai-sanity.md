# TentacleWars AI Sanity

## Purpose

This suite protects the TentacleWars-specific AI identity, especially the parts that should stay visible in live sandbox playtests.

## Command

```bash
node scripts/tw-ai-sanity.mjs
```

## Protects

- all-hostile default red/purple relation mode
- purple slice identity
- canonical AI-to-slice wiring through `applySliceCut(...)`
