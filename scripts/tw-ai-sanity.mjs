import assert from 'node:assert/strict';

import { STATE } from '../src/core/GameState.js';
import { TentState } from '../src/config/gameConfig.js';
import { GameNode } from '../src/entities/GameNode.js';
import { areAlliedOwners, areHostileOwners } from '../src/systems/OwnerTeams.js';
import { TwAI } from '../src/tentaclewars/TwAI.js';
import { TW_BALANCE } from '../src/tentaclewars/TwBalance.js';

function testTentacleWarsHostilityMode() {
  const previousMode = STATE.getGameMode();

  try {
    STATE.setGameMode('tentaclewars');
    assert.equal(TW_BALANCE.ENEMY_RELATION_MODE, 'all_hostile', 'TentacleWars should default to all-hostile enemy relations');
    assert.equal(areAlliedOwners(2, 3), false, 'Red and purple should not be allied in TentacleWars by default');
    assert.equal(areHostileOwners(2, 3), true, 'Red and purple should be hostile in TentacleWars by default');
  } finally {
    STATE.setGameMode(previousMode);
  }
}

function testTentacleWarsPurpleSlicePressure() {
  const previousMode = STATE.getGameMode();

  try {
    STATE.setGameMode('tentaclewars');

    const purpleNode = new GameNode(0, 0, 0, 160, 3);
    const playerNode = new GameNode(1, 140, 0, 10, 1);
    purpleNode.maxE = 160;
    playerNode.maxE = 100;
    purpleNode.simulationMode = 'tentaclewars';
    playerNode.simulationMode = 'tentaclewars';
    purpleNode.syncLevelFromEnergy();

    let appliedCutRatio = null;
    const ai = new TwAI({
      nodes: [purpleNode, playerNode],
      tents: [{
        alive: true,
        state: TentState.ACTIVE,
        energyInPipe: 18,
        effectiveSourceNode: purpleNode,
        effectiveTargetNode: playerNode,
        applySliceCut(ratio) { appliedCutRatio = ratio; },
      }],
    }, { aiThinkIntervalSeconds: 10 }, 3);

    ai.update(0.1);
    assert.equal(appliedCutRatio, 0.15, 'Purple AI should trigger the canonical slice path on an obvious charged hostile lane');
  } finally {
    STATE.setGameMode(previousMode);
  }
}

function run(testName, testFn) {
  testFn();
  console.log(`PASS ${testName}`);
}

run('TentacleWars hostility mode stays canonical', testTentacleWarsHostilityMode);
run('TentacleWars purple slice pressure stays active', testTentacleWarsPurpleSlicePressure);

console.log('\n2/2 TentacleWars AI sanity checks passed');
