import assert from 'node:assert/strict';

import { buildPlayerTentaclePreview } from '../src/input/BuildPreview.js';
import { canCreateTentacleConnection, computeTentacleBuildCost } from '../src/input/TentacleCommands.js';
import { resolvePlayerClickIntent } from '../src/input/PlayerClickResolution.js';
import { buildTentacleWarsCampaignConfig } from '../src/tentaclewars/TwCampaignLoader.js';
import { TW_CAMPAIGN_FIXTURE_LEVELS } from '../src/tentaclewars/TwCampaignFixtures.js';

function run(testName, testFn) {
  testFn();
  console.log(`PASS ${testName}`);
}

const byId = id => TW_CAMPAIGN_FIXTURE_LEVELS.find(level => level.id === id);

function buildRuntimeNodes(level, width = 1440, height = 1024) {
  const config = buildTentacleWarsCampaignConfig(level, width, height);
  return {
    config,
    runtimeNodes: config.fixedLayout.nodes.map((node, index) => ({
      ...node,
      id: index,
      simulationMode: 'tentaclewars',
    })),
  };
}

function getCheapestOpeningMove(level, targetFilter = () => true) {
  const { config, runtimeNodes } = buildRuntimeNodes(level);
  let bestMove = null;

  level.cells.forEach((cell, sourceIndex) => {
    if (cell.owner !== 'player') return;

    level.cells.forEach((targetCell, targetIndex) => {
      if (sourceIndex === targetIndex || !targetFilter(targetCell)) return;
      if (!canCreateTentacleConnection(runtimeNodes[sourceIndex], runtimeNodes[targetIndex], config.fixedLayout.twObstacles)) return;

      const rawBuildCost = computeTentacleBuildCost(runtimeNodes[sourceIndex], runtimeNodes[targetIndex], 0).totalBuildCost;
      const roundedBuildCost = Math.ceil(rawBuildCost);
      const reserve = cell.initialEnergy - roundedBuildCost;
      if (!bestMove || roundedBuildCost < bestMove.roundedBuildCost) {
        bestMove = {
          sourceId: cell.id,
          targetId: targetCell.id,
          targetOwner: targetCell.owner,
          rawBuildCost,
          roundedBuildCost,
          reserve,
        };
      }
    });
  });

  return bestMove;
}

run('TentacleWars campaign config builder maps authored level data into runtime config', () => {
  const config = buildTentacleWarsCampaignConfig(byId('W1-02'), 1000, 800);
  assert.equal(config.isTentacleWarsCampaign, true, 'loader should mark authored levels as TentacleWars campaign configs');
  assert.equal(config.isTentacleWarsSandbox, false, 'authored levels should not be mislabeled as sandbox configs');
  assert.equal(config.id, 'W1-02', 'loader should preserve the stable authored id');
  assert.equal(config.worldId, 1, 'loader should expose the authored world id');
  assert.equal(config.nodeEnergyCap, 50, 'loader should preserve the authored energy cap');
  assert.equal(config.fixedLayout.nodes.length, 3, 'loader should scale all authored cells into the fixed layout');
  assert.equal(config.fixedLayout.nodes[0].owner, 1, 'loader should map player ownership to runtime owner 1');
  assert.equal(config.fixedLayout.nodes[1].owner, 2, 'loader should map red ownership to runtime owner 2');
  assert.equal(config.fixedLayout.nodes[2].owner, 2, 'loader should map red ownership to runtime owner 2');
  assert.ok(config.twCostNormalizer > 0, 'loader should expose a positive cost normalizer for authored TW levels');
});

run('TentacleWars campaign config builder keeps authored capsule obstacles in runtime space', () => {
  const config = buildTentacleWarsCampaignConfig(byId('W1-05'), 1000, 800);
  assert.equal(config.fixedLayout.twObstacles.length, 2, 'loader should expose authored obstacles to the runtime');
  assert.equal(config.fixedLayout.twObstacles[0].kind, 'capsule', 'authored TW obstacles should stay on the capsule path');
  assert.ok(config.fixedLayout.twObstacles[0].r > 0, 'scaled capsule obstacle should preserve a positive blocking radius');
});

run('TentacleWars authored obstacle geometry keeps at least one canonical blocked lane pair', () => {
  const config = buildTentacleWarsCampaignConfig(byId('W1-05'), 1000, 800);
  const runtimeNodes = config.fixedLayout.nodes.map((node, index) => ({
    ...node,
    id: index,
    simulationMode: 'tentaclewars',
    maxSlots: 2,
    outCount: 0,
  }));
  assert.equal(
    canCreateTentacleConnection(runtimeNodes[2], runtimeNodes[3], config.fixedLayout.twObstacles),
    false,
    'W1-05 should preserve at least one authored lane pair that is canonically blocked by obstacles',
  );
});

run('TentacleWars build preview keeps obstacle blocking surfaced on a canonically blocked lane pair', () => {
  const config = buildTentacleWarsCampaignConfig(byId('W1-05'), 1000, 800);
  const runtimeNodes = config.fixedLayout.nodes.map((node, index) => ({
    ...node,
    id: index,
    simulationMode: 'tentaclewars',
    maxSlots: 2,
    outCount: 0,
  }));
  const selectedNode = runtimeNodes[2];
  const hoveredNode = runtimeNodes[3];

  const previewModel = buildPlayerTentaclePreview({
    selectedNode,
    hoveredNode,
    tents: [],
    liveOut: () => 0,
    distanceCostMultiplier: 0,
    obstacles: config.fixedLayout.twObstacles,
  });

  assert.equal(previewModel.type, 'build_new_tentacle', 'preview should remain on the build path for a blocked authored lane');
  assert.equal(previewModel.isBlockedByObstacle, true, 'preview should surface obstacle blocking explicitly');
  assert.equal(previewModel.canBuildTentacle, false, 'preview should not advertise a blocked authored lane as buildable');
});

run('TentacleWars campaign viewport expands responsively while keeping normalized build costs stable', () => {
  const compactConfig = buildTentacleWarsCampaignConfig(byId('W1-01'), 220, 160);
  const roomyConfig = buildTentacleWarsCampaignConfig(byId('W1-01'), 1440, 1024);
  const compactSource = { ...compactConfig.fixedLayout.nodes[0], id: 0, simulationMode: 'tentaclewars' };
  const compactTarget = { ...compactConfig.fixedLayout.nodes[1], id: 1, simulationMode: 'tentaclewars' };
  const roomySource = { ...roomyConfig.fixedLayout.nodes[0], id: 0, simulationMode: 'tentaclewars' };
  const roomyTarget = { ...roomyConfig.fixedLayout.nodes[1], id: 1, simulationMode: 'tentaclewars' };
  const compactBuildCost = computeTentacleBuildCost(compactSource, compactTarget, 0);
  const roomyBuildCost = computeTentacleBuildCost(roomySource, roomyTarget, 0);

  assert.ok(roomyConfig.fixedLayout.twViewport.width > compactConfig.fixedLayout.twViewport.width, 'authored TW viewport should expand on larger canvases');
  assert.ok(Math.abs(roomyBuildCost.totalBuildCost - compactBuildCost.totalBuildCost) < 0.05, 'responsive authored TW viewport should preserve normalized build cost feel');
});

run('TentacleWars W1-01 and W1-05 expose safe opening reserves under the re-authored Phase 2 geometry', () => {
  const firstMoveW101 = getCheapestOpeningMove(byId('W1-01'), targetCell => targetCell.owner === 'red');
  const firstMoveW105 = getCheapestOpeningMove(byId('W1-05'));

  assert.ok(firstMoveW101, 'W1-01 should expose a measurable opening path');
  assert.ok(firstMoveW101.reserve >= 4, 'W1-01 should leave a safe reserve after its opening connection');

  assert.ok(firstMoveW105, 'W1-05 should expose a measurable relay opening path');
  assert.ok(firstMoveW105.reserve >= 4, 'W1-05 should leave a safe reserve after its opening relay connection');
});

run('TentacleWars World 4 levels expose safe opening reserves for the final-world pack', () => {
  const world4LevelIds = Array.from({ length: 20 }, (_, index) => `W4-${String(index + 1).padStart(2, '0')}`);

  world4LevelIds.forEach(levelId => {
    const firstMove = getCheapestOpeningMove(byId(levelId), targetCell => targetCell.owner !== 'player');
    assert.ok(firstMove, `${levelId} should expose a measurable opening path`);
    assert.ok(firstMove.reserve >= 4, `${levelId} should leave a safe reserve after its opening connection`);
  });
});

console.log('\n7/7 TentacleWars campaign loader sanity checks passed');
