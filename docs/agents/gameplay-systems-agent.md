# Gameplay Systems Agent

## Purpose

This agent owns the core simulation rules:

- energy
- tentacles
- slice
- burst
- clash
- capture
- ownership

## Primary Surfaces

- `src/entities/Tent.js`
- `src/entities/TentCombat.js`
- `src/entities/TentRules.js`
- `src/entities/GameNode.js`
- `src/systems/EnergyBudget.js`
- `src/systems/Ownership.js`
- `src/systems/NeutralContest.js`
- `src/systems/OwnerTeams.js`

## Invariants That Must Not Break

- programmatic retract refunds `paidCost + energyInPipe`
- canceling a growing tentacle refunds everything already paid
- relays do not create energy
- support cells keep partial self-regeneration while feeding allies
- player and purple AI use the same canonical slice path
- frenzy only triggers from `3` active cuts in the same continuous gesture
- red and purple form one hostile coalition against the player
- coalition neutral capture respects `GAME_BALANCE.NEUTRAL_CAPTURE_ALLIANCE_MODE`

## Risk Signals

- any change in `kill()`, `activateImmediate()`, `update()`, or `resolveClashes()`
- any new duplication of energy or ownership logic
- any owner-specific rule outside `OwnerTeams` or `NeutralContest`

## Required Checks

At minimum:

```bash
node scripts/smoke-checks.mjs
node scripts/simulation-soak.mjs
```

If campaign data or layouts are touched:

```bash
node scripts/campaign-sanity.mjs
```

## Docs That Usually Need Updates

- `docs/implementation/current-gameplay-baseline.md`
- `docs/implementation/energy-model.md`
- `docs/implementation/tentacle-lifecycle.md`
- `docs/implementation/capture-and-ownership.md`
- `docs/implementation/shared-burst-mechanics.md`

## Anti-Patterns

- adding a new energy formula outside `EnergyBudget`
- giving AI and player different slice rules
- introducing owner exceptions without routing through the team/alliance layer
- changing clash behavior without reinforcing a guardrail

## Definition Of Done

- the core rule still has one obvious canonical owner
- smoke and soak stay green
- gameplay comments and mechanics docs stay aligned
