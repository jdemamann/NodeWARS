import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TW_CAMPAIGN_FIXTURE_LEVELS, getTentacleWarsSilverPar } from '../src/tentaclewars/TwCampaignFixtures.js';
import { TW_WORLD_1_LEVELS, TW_WORLD_1_PROTOTYPE_LEVELS } from '../src/tentaclewars/levels/TwWorld1.js';
import { validateTentacleWarsLevelData } from '../src/tentaclewars/TwLevelSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TW_BALANCE_MATRIX_PATH = path.join(ROOT, 'docs/tentaclewars/tw-balance-matrix.csv');
const ALLOWED_OBSTACLE_SHAPES = ['circle', 'capsule'];

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function getHostileCells(level) {
  return level.cells.filter(cell => cell.owner === 'red' || cell.owner === 'purple');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

async function main() {
  await runCheck('authored World 1 levels pass the TentacleWars level schema', () => {
    TW_WORLD_1_LEVELS.forEach(level => {
      const validated = validateTentacleWarsLevelData(structuredClone(level));
      assert.equal(validated.id, level.id, `schema should preserve level ${level.id}`);
    });
  });

  await runCheck('authored World 1 phases stay contiguous from W1-01 to W1-20', () => {
    assert.deepEqual(
      TW_WORLD_1_LEVELS.map(level => level.id),
      Array.from({ length: 20 }, (_, index) => `W1-${String(index + 1).padStart(2, '0')}`),
      'World 1 authoring should cover the full W1-01..W1-20 range in order',
    );
  });

  await runCheck('combined sanity levels pass the TentacleWars level schema', () => {
    TW_CAMPAIGN_FIXTURE_LEVELS.forEach(level => {
      const validated = validateTentacleWarsLevelData(structuredClone(level));
      assert.equal(validated.id, level.id, `schema should preserve level ${level.id}`);
    });
  });

  await runCheck('campaign ordering stays stable across authored World 1 and future-world anchors', () => {
    assert.equal(TW_CAMPAIGN_FIXTURE_LEVELS[0].id, 'W1-01', 'campaign sanity should start at W1-01');

    let previousWorld = 0;
    let previousPhase = 0;
    TW_CAMPAIGN_FIXTURE_LEVELS.forEach(level => {
      assert.ok(level.world >= previousWorld, `${level.id} should not move backwards in world order`);
      if (level.world === previousWorld) {
        assert.ok(level.phase > previousPhase, `${level.id} should move forward within its world`);
      } else {
        assert.equal(level.phase, 1, `${level.id} should restart at phase 1 when a new world begins`);
      }
      previousWorld = level.world;
      previousPhase = level.phase;
    });
  });

  await runCheck('mechanic introductions stay unique and in the intended world bands', () => {
    const firstIntroByTag = new Map();
    TW_CAMPAIGN_FIXTURE_LEVELS.forEach(level => {
      level.introMechanicTags.forEach(tag => {
        assert.ok(!firstIntroByTag.has(tag), `${tag} should only be introduced once in fixture data`);
        firstIntroByTag.set(tag, level);
      });
    });

    assert.equal(firstIntroByTag.get('connect')?.id, 'W1-01', 'connect should anchor the campaign start');
    assert.equal(firstIntroByTag.get('priority-target')?.world, 1, 'priority-target should stay in World 1');
    assert.equal(firstIntroByTag.get('slice')?.world, 1, 'slice should stay in World 1');
    assert.equal(firstIntroByTag.get('obstacle-routing')?.world, 1, 'obstacle routing should stay in World 1');
    assert.equal(firstIntroByTag.get('pulsar-class')?.world, 1, 'pulsar-class should stay in World 1');
    assert.equal(firstIntroByTag.get('purple-intro')?.world, 2, 'purple should first appear in World 2');
  });

  await runCheck('loader expectations stay coherent for play-ready levels', () => {
    TW_CAMPAIGN_FIXTURE_LEVELS.forEach(level => {
      const playerCells = level.cells.filter(cell => cell.owner === 'player');
      const hostileCells = getHostileCells(level);
      assert.ok(playerCells.length >= 1, `${level.id} should include at least one player-owned start cell`);
      assert.ok(hostileCells.length >= 1, `${level.id} should include at least one hostile cell`);
      assert.equal(
        level.winCondition,
        'all_hostiles_converted',
        `${level.id} should keep the canonical TW campaign win condition`,
      );
    });
  });

  await runCheck('progression expectations stay compatible with the TW score spec', () => {
    TW_CAMPAIGN_FIXTURE_LEVELS.forEach(level => {
      const silverPar = getTentacleWarsSilverPar(level.par);
      assert.ok(Number.isInteger(level.par) && level.par > 0, `${level.id} should expose a positive integer par`);
      assert.ok(silverPar >= level.par, `${level.id} silver par should not undershoot authored par`);
      assert.ok(silverPar > level.par, `${level.id} silver par should stay looser than authored par`);
    });
  });

  await runCheck('obstacle and purple usage respect the phase-one campaign specs', () => {
    TW_CAMPAIGN_FIXTURE_LEVELS.forEach(level => {
      const hasPurpleCells = level.cells.some(cell => cell.owner === 'purple');
      if (level.world === 1) {
        assert.equal(hasPurpleCells, false, `${level.id} should not contain purple cells in World 1`);
      }

      level.obstacles.forEach(obstacle => {
        assert.ok(
          ALLOWED_OBSTACLE_SHAPES.includes(obstacle.shape.kind),
          `${level.id} should keep authored obstacles on the allowed shape path`,
        );
      });
    });

    const purpleIntroLevel = TW_CAMPAIGN_FIXTURE_LEVELS.find(level =>
      level.introMechanicTags.includes('purple-intro'),
    );
    assert.ok(purpleIntroLevel, 'fixture campaign should include a purple intro level');
    assert.ok(
      purpleIntroLevel.cells.some(cell => cell.owner === 'purple'),
      'purple intro level should actually contain a purple-owned cell',
    );
  });

  await runCheck('balance matrix rows exist for each authored World 1 level', async () => {
    const raw = await fs.readFile(TW_BALANCE_MATRIX_PATH, 'utf8');
    const rows = raw.trim().split(/\r?\n/).slice(1).map(parseCsvLine);
    const ids = new Set(rows.map(row => row[0]));
    TW_WORLD_1_LEVELS.forEach(level => {
      assert.ok(ids.has(level.id), `${level.id} should exist in the TentacleWars balance matrix`);
    });
  });

  await runCheck('World 1 prototype subset remains stable for preview and gate tooling', () => {
    assert.deepEqual(
      TW_WORLD_1_PROTOTYPE_LEVELS.map(level => level.id),
      ['W1-01', 'W1-02', 'W1-03', 'W1-04', 'W1-05'],
      'World 1 prototype subset should remain the phase-C gate slice',
    );
  });

  console.log('\n10/10 TentacleWars campaign sanity checks passed');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
