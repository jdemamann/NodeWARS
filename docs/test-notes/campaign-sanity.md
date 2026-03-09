# Campaign Sanity Checks

## Purpose

This script validates the static campaign definition before deeper balance or playtest work.

It is intentionally lightweight and focuses on campaign integrity, not full gameplay simulation.

Current coverage:

- level ids stay sequential and unique
- level names stay unique
- tutorial phases remain anchored to the expected world transitions
- world progression stays contiguous
- pacing values stay inside reasonable shipped ranges
- special mechanics stay inside their intended world bands
- late high-pressure authored phases keep structural starting support for the player

## Run

From the repository root:

```bash
node scripts/campaign-sanity.mjs
```

## Recommended use

Run this together with the gameplay smoke suite:

```bash
node scripts/campaign-sanity.mjs
node scripts/smoke-checks.mjs
```

## Notes

- This script is a guardrail for campaign data quality.
- It does not replace real playtesting or level-by-level balance review.
- If a check fails, fix the level data first before tuning AI or mechanics around broken inputs.
