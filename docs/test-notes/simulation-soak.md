# Simulation Soak Checks

## Purpose

This script adds a lightweight long-run confidence layer on top of the existing invariant and campaign checks.

It fast-forwards a deterministic mixed scenario with:

- core tentacle flow
- AI activity
- relay/signal capture opportunities
- vortex drain
- pulsar energy bursts

The goal is not exhaustive gameplay correctness. The goal is to catch long-run numerical drift or runaway state that short smoke checks can miss.

## Run

From the repository root:

```bash
node scripts/simulation-soak.mjs
```

## What it checks

- node energy stays finite and near sane bounds
- contest scores stay finite and non-negative
- tentacle state values stay finite
- tentacle count remains bounded in the soak scenario
- the scenario actually changes ownership over time instead of stalling completely

## Recommended use

Run all three quick guards before deeper balance work:

```bash
node scripts/smoke-checks.mjs
node scripts/campaign-sanity.mjs
node scripts/simulation-soak.mjs
```

## Notes

- this is still intentionally lightweight
- it is meant to detect long-run instability, not replace real playtesting
