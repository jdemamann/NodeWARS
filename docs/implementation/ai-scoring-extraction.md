# AI Scoring Extraction

The AI scoring wave extracted the main target-evaluation helpers into:

- `src/systems/AIScoring.js`

That module now owns:

- relay context building
- target pressure context building
- relay target scoring
- general move scoring
- relay-origin adjustment scoring

`src/systems/AI.js` remains the orchestrator for:

- update cadence
- source selection
- move picking
- tentacle creation
- purple strategic burst cuts

This split keeps the AI behavior readable while avoiding a heavy planner.
