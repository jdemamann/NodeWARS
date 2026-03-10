import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const { STATE } = await import(pathToFileURL(path.join(ROOT, 'src/core/GameState.js')).href);
const { getLevelConfig } = await import(pathToFileURL(path.join(ROOT, 'src/config/gameConfig.js')).href);

function withIsolatedState(run) {
  const snapshot = {
    completed: STATE.completed,
    curLvl: STATE.curLvl,
    scores: [...STATE.scores],
    levelFailStreaks: [...STATE.levelFailStreaks],
    curLang: STATE.curLang,
    settings: structuredClone(STATE.settings),
  };

  try {
    STATE.completed = 0;
    STATE.curLvl = 1;
    STATE.scores = Array(33).fill(null);
    STATE.levelFailStreaks = Array(33).fill(0);
    STATE.settings = { ...STATE.settings, w2: null, w3: null, debug: false };
    run();
  } finally {
    STATE.completed = snapshot.completed;
    STATE.curLvl = snapshot.curLvl;
    STATE.scores = snapshot.scores;
    STATE.levelFailStreaks = snapshot.levelFailStreaks;
    STATE.curLang = snapshot.curLang;
    STATE.settings = snapshot.settings;
  }
}

function testFreshCampaignUnlockState() {
  withIsolatedState(() => {
    assert.equal(STATE.isWorldUnlocked(1), true, 'World 1 should always be unlocked');
    assert.equal(STATE.isLevelUnlocked(getLevelConfig(0)), true, 'World 1 tutorial should be optional and unlocked from the start');
    assert.equal(STATE.isLevelUnlocked(getLevelConfig(1)), true, 'World 1 phase 1 should be unlocked alongside the tutorial');
    assert.equal(STATE.isWorldUnlocked(2), false, 'World 2 should remain locked in a fresh campaign');
  });
}

function testNaturalWorldTransitionStillTargetsTutorial() {
  withIsolatedState(() => {
    STATE.completed = 10;
    assert.equal(STATE.isWorldUnlocked(2), true, 'finishing World 1 should unlock World 2');
    assert.equal(STATE.getNextLevelId(10), 11, 'the natural next level after World 1 should still be the World 2 tutorial');
    assert.equal(STATE.isLevelUnlocked(getLevelConfig(11)), true, 'World 2 tutorial should be unlocked as optional onboarding');
    assert.equal(STATE.isLevelUnlocked(getLevelConfig(12)), true, 'World 2 phase 1 should be unlocked alongside the tutorial');
  });
}

function testTutorialCompletionUsesCanonicalProgression() {
  withIsolatedState(() => {
    STATE.recordTutorialCompletion(2, 11);
    assert.equal(STATE.completed, 11, 'tutorial completion should advance the canonical completed level id');
    assert.equal(STATE.isLevelUnlocked(getLevelConfig(12)), true, 'completing the tutorial should preserve the first real level unlock');
    assert.equal(STATE.getNextLevelId(11), 12, 'after a tutorial, the next level should be the first real phase of the same world');
  });
}

function testManualWorldOverridesRemainEffective() {
  withIsolatedState(() => {
    STATE.settings.w2 = true;
    assert.equal(STATE.isWorldUnlocked(2), true, 'manual world visibility should be able to force-unlock World 2');
    STATE.settings.w2 = false;
    assert.equal(STATE.isWorldUnlocked(2), false, 'manual world visibility should also be able to hide World 2 again');
  });
}

function testSkipRuleAndFailStreakFlow() {
  withIsolatedState(() => {
    const levelConfig = getLevelConfig(18);
    assert.equal(STATE.canSkipLevel(levelConfig), false, 'skip should start locked');
    for (let index = 0; index < 5; index += 1) STATE.recordLevelLoss(18);
    assert.equal(STATE.canSkipLevel(levelConfig), true, 'skip should unlock after five consecutive defeats');
    STATE.consumeLevelSkip(18);
    assert.equal(STATE.canSkipLevel(levelConfig), false, 'consuming a skip should reset the fail streak gate');
  });
}

const tests = [
  ['fresh campaign unlock state stays canonical', testFreshCampaignUnlockState],
  ['natural world transition still targets tutorials', testNaturalWorldTransitionStillTargetsTutorial],
  ['tutorial completion uses canonical progression', testTutorialCompletionUsesCanonicalProgression],
  ['manual world overrides remain effective', testManualWorldOverridesRemainEffective],
  ['skip rule and fail streak flow stay canonical', testSkipRuleAndFailStreakFlow],
];

let passed = 0;
for (const [name, testFn] of tests) {
  testFn();
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log(`\n${passed}/${tests.length} GameState progression sanity checks passed`);
