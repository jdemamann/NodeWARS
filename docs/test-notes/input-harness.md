# Input Harness

Purpose:
- execute deterministic input-side rules without a browser
- protect click intent resolution, preview generation, tap promotion, and hit-testing

Run:

```bash
node scripts/input-harness.mjs
```

What it checks:
- player click intent selection and build resolution
- preview state for new lanes and existing tentacle toggles
- deterministic tap-to-slice promotion and tap classification
- in-place slice path mutation
- closest-node hit-testing behavior
