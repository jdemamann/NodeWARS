# GameState Progression Sanity

Purpose:
- validate campaign progression and world unlock rules through the canonical `GameState` API
- keep tutorial optionality, world transitions, skip logic, and manual overrides stable

Run:

```bash
node scripts/game-state-progression-sanity.mjs
```

What it checks:
- fresh campaign unlock state for World 1 tutorial and phase 1
- natural world-to-world transition still entering the next tutorial
- tutorial completion using canonical progression helpers
- manual World 2 / 3 visibility overrides
- fail-streak skip unlocking and reset flow
