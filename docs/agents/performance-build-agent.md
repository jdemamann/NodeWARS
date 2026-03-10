# Performance / Build Agent

## Purpose

This agent owns operational robustness, performance, and release preparation:

- render cost
- long-run stability
- HIGH / LOW graphics profiles
- local assets and fonts
- desktop/mobile packaging readiness
- runtime portability

## Primary Surfaces

- `src/rendering/*`
- `src/entities/Orb.js`
- `src/core/Game.js`
- `src/main.js`
- `src/core/GameState.js`
- `styles/main.css`
- `assets/fonts/*`
- packaging docs and scripts

## Core Rules

- LOW must remain materially cheaper than HIGH
- HIGH may enrich visuals without breaking gameplay readability
- critical assets must not depend on internet access
- render instrumentation should remain available in debug

## Required Checks

At minimum:

```bash
node scripts/smoke-checks.mjs
node scripts/simulation-soak.mjs
```

For build/readiness waves:

```bash
npm run check
```

## Docs That Usually Need Updates

- `docs/implementation/graphics-profiles.md`
- `docs/implementation/render-performance-instrumentation.md`
- `docs/project/linux-desktop-binary-report.md`
- `docs/project/android-port-report.md`

## Anti-Patterns

- adding expensive HIGH visuals without preserving LOW fallback
- reintroducing remote font or asset dependencies
- changing performance-sensitive code without updating instrumentation or guardrails when needed

## Definition Of Done

- visual profiles remain coherent
- robustness checks stay green
- the project is more ready for packaging, not less
