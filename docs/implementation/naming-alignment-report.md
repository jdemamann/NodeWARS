# Naming Alignment Report

## Goal

Track which naming migrations are already aligned with the repository convention and which ones remain as compatibility debt.

## Completed In This Pass

- Source tree was reorganized into clearer technical layers:
  - `src/core`
  - `src/config`
  - `src/localization`
  - `src/math`
  - `src/rendering`
  - `src/theme`
- Tentacle public-facing reads now prefer:
  - `effectiveSourceNode`
  - `effectiveTargetNode`
  - `distance`
  - `travelDuration`
  - `pipeCapacity`
- Level config now exposes descriptive fields:
  - `worldId`
  - `nodeEnergyCap`
  - `playerStartEnergy`
  - `enemyCount`
  - `enemyStartEnergy`
  - `purpleEnemyCount`
  - `purpleEnemyStartEnergy`
  - `neutralEnergyRange`
  - `distanceCostMultiplier`
  - `aiThinkIntervalSeconds`
  - `bunkerCount`
  - `vortexCount`
  - `movingVortexCount`
  - `pulsingVortexPeriodSeconds`
  - `hasSuperVortex`
  - `relayCount`
  - `pulsarCount`
  - `signalTowerCount`
  - `fortifiedRelayCount`
  - `hasSuperPulsar`
  - `isTutorial`
  - `isSymmetricLayout`
- Raw campaign data in `LEVELS` now uses those descriptive fields directly.
- Shared math helpers now expose descriptive names:
  - `computeDistance`
  - `computeDistanceSquared`
  - `computeEnergyLevel`
  - `computeNodeRadius`
  - `computeBuildCost`
  - `computeTravelDuration`
  - `computeAttackLevelMultiplier`
  - `computeDefenseLevelMultiplier`
- Former `utils.js` responsibilities are now split by concern:
  - `src/math/simulationMath.js`
  - `src/math/bezierGeometry.js`
  - `src/rendering/canvasPrimitives.js`
- Renamed files and exported primary names now align better with intent:
  - `GNode.js` -> `GameNode.js`
  - `Audio.js` -> `SoundEffects.js`
  - `IDS.js` -> `DomIds.js`
  - `Screens.js` -> `ScreenController.js`
  - `constants.js` -> `gameConfig.js`
  - `ownerColors.js` -> `ownerPalette.js`
- Public exports now use:
  - `GameNode`
  - `SoundEffects`
  - `DOM_IDS`

## Compatibility Layer Still Present

- Some tightly scoped loop indices and render geometry temporaries remain short by design.

## Remaining Recommended Work

1. Keep future local short names limited to loop indices and obvious geometry math only.
2. Continue trimming historical docs that still describe pre-refactor file paths.
