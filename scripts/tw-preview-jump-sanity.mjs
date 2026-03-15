import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const { STATE } = await import(pathToFileURL(path.join(ROOT, 'src/core/GameState.js')).href);
const {
  applyTentacleWarsPreviewWorldJump,
  getTentacleWarsPreviewLevelById,
  getTentacleWarsPreviewWorldEntryLevel,
  listTentacleWarsPreviewLevelIds,
  parseTentacleWarsPreviewFlags,
} = await import(pathToFileURL(path.join(ROOT, 'src/tentaclewars/TwCampaignPreview.js')).href);

function withIsolatedState(run) {
  const snapshot = {
    twCampaign: structuredClone(STATE.twCampaign),
    settings: structuredClone(STATE.settings),
  };

  try {
    STATE.twCampaign = {
      completed: 0,
      curLvl: 'W1-01',
      scores: {},
      stars: {},
      levelFailStreaks: {},
      activeWorldTab: 1,
    };
    STATE.settings = { ...STATE.settings, debug: false, gameMode: 'nodewars', twW2: null, twW3: null, twW4: null };
    run();
  } finally {
    STATE.twCampaign = snapshot.twCampaign;
    STATE.settings = snapshot.settings;
  }
}

async function read(relPath) {
  return fs.readFile(path.join(ROOT, relPath), 'utf8');
}

async function run(testName, testFn) {
  await testFn();
  console.log(`PASS ${testName}`);
}

await run('TentacleWars preview flags parse debug, level, and world query parameters', () => {
  const flags = parseTentacleWarsPreviewFlags('?tw-debug=1&tw-mode=tentaclewars&tw-autostart=1&tw-level=W1-03&tw-world=2');
  assert.equal(flags.twDebug, true, 'preview flags should preserve the debug bit');
  assert.equal(flags.twAutostart, true, 'preview flags should preserve autostart');
  assert.equal(flags.twMode, 'tentaclewars', 'preview flags should preserve TW mode selection');
  assert.equal(flags.twLevelId, 'W1-03', 'preview flags should normalize a stable TW level id');
  assert.equal(flags.twWorld, 2, 'preview flags should normalize the preview world id');
});

await run('TentacleWars preview level lookup stays fixture-backed and ordered', () => {
  assert.equal(getTentacleWarsPreviewLevelById('W1-03')?.id, 'W1-03', 'fixture lookup should resolve a stable preview level');
  assert.equal(getTentacleWarsPreviewWorldEntryLevel(2)?.id, 'W2-01', 'world entry lookup should resolve the first fixture level for that world');
  assert.deepEqual(
    listTentacleWarsPreviewLevelIds(),
    [
      'W1-01', 'W1-02', 'W1-03', 'W1-04', 'W1-05',
      'W1-06', 'W1-07', 'W1-08', 'W1-09', 'W1-10',
      'W1-11', 'W1-12', 'W1-13', 'W1-14', 'W1-15',
      'W1-16', 'W1-17', 'W1-18', 'W1-19', 'W1-20',
      'W2-01',
    ],
    'preview fixtures should remain in deterministic campaign order',
  );
});

await run('TentacleWars preview world jump only works in debug and keeps NW state isolated', () => {
  withIsolatedState(() => {
    assert.equal(applyTentacleWarsPreviewWorldJump(3), null, 'preview world jump should stay disabled outside debug mode');

    STATE.setDebugMode(true);
    const worldEntryLevelId = applyTentacleWarsPreviewWorldJump(3);

    assert.equal(worldEntryLevelId, null, 'worlds without fixture entry levels should still expose debug visibility safely');
    assert.equal(STATE.settings.twW2, true, 'jumping to World 3 should expose TW World 2 in debug');
    assert.equal(STATE.settings.twW3, true, 'jumping to World 3 should expose TW World 3 in debug');
    assert.equal(STATE.settings.twW4, null, 'jumping to World 3 should not expose TW World 4');
    assert.equal(STATE.getTentacleWarsActiveWorldTab(), 3, 'preview world jump should retarget the TW active world tab');
    assert.equal(STATE.getTentacleWarsCurrentLevel(), 'W1-01', 'missing world fixtures should not invent a fake authored entry level');
  });
});

await run('TentacleWars preview world jump seeds the current level when the world has a fixture entry', () => {
  withIsolatedState(() => {
    STATE.setDebugMode(true);
    const worldEntryLevelId = applyTentacleWarsPreviewWorldJump(2);
    assert.equal(worldEntryLevelId, 'W2-01', 'preview world jump should return the first fixture level for the world');
    assert.equal(STATE.getTentacleWarsCurrentLevel(), 'W2-01', 'preview world jump should seed the TW current level from the fixture entry');
  });
});

await run('main runtime keeps the TentacleWars preview hooks wired', async () => {
  const mainSource = await read('src/main.js');
  const previewSource = await read('src/tentaclewars/TwCampaignPreview.js');
  assert.match(previewSource, /tw-level/, 'preview helper should recognize the tw-level query parameter');
  assert.match(previewSource, /tw-world/, 'preview helper should recognize the tw-world query parameter');
  assert.match(mainSource, /loadLevelById: levelId => loadTentacleWarsPreviewLevel\(levelId\)/, 'debug API should expose a TW level loader');
  assert.match(mainSource, /jumpWorld: worldId => jumpTentacleWarsPreviewWorld\(worldId\)/, 'debug API should expose a TW world-jump helper');
});

console.log('\n5/5 TentacleWars preview/jump sanity checks passed');
