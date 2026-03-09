import assert from 'node:assert/strict';

const { LEVELS } = await import('../src/config/gameConfig.js');
const { getFixedCampaignLayout } = await import('../src/levels/FixedCampaignLayouts.js');

function runCheck(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function main() {
  runCheck('level ids are sequential and unique', () => {
    const ids = LEVELS.map(levelConfig => levelConfig.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, 'level ids must be unique');
    ids.forEach((levelId, index) => {
      assert.equal(levelId, index, `level id ${levelId} should match its array index ${index}`);
    });
  });

  runCheck('level names are unique', () => {
    const names = LEVELS.map(levelConfig => levelConfig.name);
    const uniqueNames = new Set(names);
    assert.equal(uniqueNames.size, names.length, 'level names must be unique for reliable UI/debug references');
  });

  runCheck('tutorial levels map to the expected worlds', () => {
    const tutorialLevels = LEVELS.filter(levelConfig => levelConfig.isTutorial);
    assert.deepEqual(
      tutorialLevels.map(levelConfig => levelConfig.id),
      [0, 11, 22],
      'tutorial levels should stay anchored at phase 0, 11, and 22',
    );
    assert.deepEqual(
      tutorialLevels.map(levelConfig => levelConfig.tutorialWorldId),
      [1, 2, 3],
      'tutorial levels should expose tutorialWorldId 1, 2, and 3 in order',
    );
  });

  runCheck('world progression stays contiguous', () => {
    let previousWorldId = LEVELS[0].worldId;
    LEVELS.forEach(levelConfig => {
      assert.ok(levelConfig.worldId >= previousWorldId, 'world ids should not move backwards');
      assert.ok(levelConfig.worldId >= 0 && levelConfig.worldId <= 3, 'world ids should stay within the shipped campaign range');
      previousWorldId = levelConfig.worldId;
    });
  });

  runCheck('level pacing values stay sane', () => {
    LEVELS.forEach(levelConfig => {
      assert.ok(levelConfig.nodes >= 5 && levelConfig.nodes <= 15, `${levelConfig.name} has an unexpected node count`);
      assert.ok(levelConfig.nodeEnergyCap >= 80 && levelConfig.nodeEnergyCap <= 200, `${levelConfig.name} has an unexpected energy cap`);
      assert.ok(levelConfig.distanceCostMultiplier > 0 && levelConfig.distanceCostMultiplier <= 0.2, `${levelConfig.name} has an unexpected distance cost multiplier`);
      assert.ok(levelConfig.playerStartEnergy > 0, `${levelConfig.name} should give the player starting energy`);
      assert.ok(levelConfig.enemyStartEnergy >= 0, `${levelConfig.name} should not use negative enemy energy`);
      assert.ok(Array.isArray(levelConfig.neutralEnergyRange) && levelConfig.neutralEnergyRange.length === 2, `${levelConfig.name} should expose a valid neutral energy range`);
      assert.ok(levelConfig.neutralEnergyRange[0] <= levelConfig.neutralEnergyRange[1], `${levelConfig.name} neutral range should be ordered`);
      if (!levelConfig.isTutorial) {
        assert.ok(levelConfig.par > 0 && levelConfig.par < 400, `${levelConfig.name} should keep a realistic par target`);
      }
    });
  });

  runCheck('special mechanics stay inside their intended worlds', () => {
    LEVELS.forEach(levelConfig => {
      if (levelConfig.worldId < 2) {
        assert.ok(!levelConfig.vortexCount, `${levelConfig.name} should not use vortexes before World 2`);
        assert.ok(!levelConfig.movingVortexCount, `${levelConfig.name} should not use moving vortexes before World 2`);
      }
      if (levelConfig.worldId < 3) {
        assert.ok(!levelConfig.relayCount, `${levelConfig.name} should not use relays before World 3`);
        assert.ok(!levelConfig.pulsarCount, `${levelConfig.name} should not use pulsars before World 3`);
        assert.ok(!levelConfig.signalTowerCount, `${levelConfig.name} should not use signal towers before World 3`);
        assert.ok(!levelConfig.fortifiedRelayCount, `${levelConfig.name} should not use fortified relays before World 3`);
      }
    });
  });

  runCheck('late high-pressure authored phases give the player structural opening support', () => {
    const supportedLevels = [18, 21, 30, 32];
    supportedLevels.forEach(levelId => {
      const layout = getFixedCampaignLayout(levelId, 1000, 1000);
      assert.ok(layout, `level ${levelId} should have a fixed layout`);
      const playerStartNodes = layout.nodes.filter(node => node.owner === 1);
      assert.ok(
        playerStartNodes.length >= 2,
        `${LEVELS[levelId].name} should give the player at least two owned starting nodes to avoid one-node late-game snowball openings`,
      );
    });
  });

  console.log('\n7/7 campaign sanity checks passed');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
