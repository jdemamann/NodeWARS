# AI Relay Targeting

## Behavior Change

AI no longer excludes relay nodes from target selection.

Relay targets are now scored with a small heuristic instead of a hard skip:

- `centrality`: relays near many nodes are more valuable because they shorten follow-up routes
- `route value`: relays near friendly and neutral nodes make better expansion infrastructure
- `player influence`: relays near player territory, player contest progress, or active player relay links are worth contesting
- `losing risk`: relays under strong player coverage are penalized when the attacking source lacks enough remaining budget

## Design Intent

This keeps the current personality model intact while making World 3 relay play contestable.

The AI still does not plan multi-step relay networks. It only uses a local positional score, so behavior stays readable and lightweight.

## Code Anchor

- Relay eligibility and scoring: `src/systems/AI.js`
