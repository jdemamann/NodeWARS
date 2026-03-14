import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const { STATE } = await import(pathToFileURL(path.join(ROOT, 'src/core/GameState.js')).href);
const { getLevelConfig } = await import(pathToFileURL(path.join(ROOT, 'src/config/gameConfig.js')).href);
const { store } = await import(pathToFileURL(path.join(ROOT, 'src/core/storage.js')).href);
const { readFileSync } = await import('node:fs');

function withIsolatedState(run) {
  const snapshot = {
    completed: STATE.completed,
    curLvl: STATE.curLvl,
    scores: [...STATE.scores],
    levelFailStreaks: [...STATE.levelFailStreaks],
    twCampaign: structuredClone(STATE.twCampaign),
    curLang: STATE.curLang,
    settings: structuredClone(STATE.settings),
    store: {
      nw_completed: store.get('nw_completed'),
      nw_curLvl: store.get('nw_curLvl'),
      nw_scores: store.get('nw_scores'),
      nw_levelFailStreaks: store.get('nw_levelFailStreaks'),
      nw_lang: store.get('nw_lang'),
      nw_activeWorldTab: store.get('nw_activeWorldTab'),
      nw_settings: store.get('nw_settings'),
      tw_campaign_completed: store.get('tw_campaign_completed'),
      tw_campaign_curLvl: store.get('tw_campaign_curLvl'),
      tw_campaign_scores: store.get('tw_campaign_scores'),
      tw_campaign_stars: store.get('tw_campaign_stars'),
      tw_campaign_levelFailStreaks: store.get('tw_campaign_levelFailStreaks'),
      tw_campaign_activeWorldTab: store.get('tw_campaign_activeWorldTab'),
    },
  };

  try {
    STATE.completed = 0;
    STATE.curLvl = 1;
    STATE.scores = Array(33).fill(null);
    STATE.levelFailStreaks = Array(33).fill(0);
    STATE.twCampaign = {
      completed: 0,
      curLvl: 'W1-01',
      scores: {},
      stars: {},
      levelFailStreaks: {},
      activeWorldTab: 1,
    };
    STATE.settings = { ...STATE.settings, w2: null, w3: null, twW2: null, twW3: null, twW4: null, debug: false };
    run();
  } finally {
    STATE.completed = snapshot.completed;
    STATE.curLvl = snapshot.curLvl;
    STATE.scores = snapshot.scores;
    STATE.levelFailStreaks = snapshot.levelFailStreaks;
    STATE.twCampaign = snapshot.twCampaign;
    STATE.curLang = snapshot.curLang;
    STATE.settings = snapshot.settings;
    Object.entries(snapshot.store).forEach(([key, value]) => {
      store.set(key, value);
    });
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
    STATE.settings.debug = true;
    STATE.settings.w2 = true;
    assert.equal(STATE.isWorldUnlocked(2), true, 'manual world visibility should be able to force-unlock World 2');
    STATE.settings.w2 = false;
    assert.equal(STATE.isWorldUnlocked(2), false, 'manual world visibility should also be able to hide World 2 again');
  });
}

function testDisablingDebugClearsManualWorldOverrides() {
  withIsolatedState(() => {
    STATE.settings.debug = true;
    STATE.settings.w2 = true;
    STATE.settings.w3 = true;
    STATE.setGameMode('tentaclewars');
    assert.equal(STATE.isWorldUnlocked(2), true, 'debug-time world override should expose World 2');

    STATE.setDebugMode(false);

    assert.equal(STATE.settings.w2, null, 'disabling debug should clear the World 2 override');
    assert.equal(STATE.settings.w3, null, 'disabling debug should clear the World 3 override');
    assert.equal(STATE.getGameMode(), 'nodewars', 'disabling debug should reset the game mode to the stable live mode');
    assert.equal(STATE.isWorldUnlocked(2), false, 'after debug is disabled, World 2 should fall back to natural campaign progression');
    assert.equal(STATE.isWorldUnlocked(3), false, 'after debug is disabled, World 3 should fall back to natural campaign progression');
  });
}

function testDebugModeCanExposeTentacleWarsTrack() {
  withIsolatedState(() => {
    STATE.setDebugMode(true);
    STATE.setGameMode('tentaclewars');
    assert.equal(STATE.getGameMode(), 'tentaclewars', 'debug mode should allow selecting the TentacleWars prototype track');
  });
}

function testTentacleWarsModeSelectionPersistsWhileDebugStaysOn() {
  withIsolatedState(() => {
    STATE.setDebugMode(true);
    STATE.setGameMode('tentaclewars');
    STATE.saveSettings();

    STATE.setGameMode('nodewars');
    assert.equal(STATE.getGameMode(), 'nodewars', 'sanity precondition should allow flipping back to NodeWARS before reload');

    STATE.loadSettings();
    assert.equal(STATE.settings.debug, true, 'loading settings should preserve debug mode when it was explicitly enabled');
    assert.equal(STATE.getGameMode(), 'tentaclewars', 'loading settings should restore the persisted TentacleWars selection while debug mode stays on');
  });
}

function testTentacleWarsFreshNamespaceDefaultsStayIsolated() {
  withIsolatedState(() => {
    store.set('tw_campaign_completed', null);
    store.set('tw_campaign_curLvl', null);
    store.set('tw_campaign_scores', null);
    store.set('tw_campaign_stars', null);
    store.set('tw_campaign_levelFailStreaks', null);
    store.set('tw_campaign_activeWorldTab', null);
    store.set('nw_completed', '9');
    store.set('nw_curLvl', '10');

    STATE.load();

    assert.equal(STATE.twCampaign.completed, 0, 'fresh TW namespace should default completed to 0');
    assert.equal(STATE.getTentacleWarsCurrentLevel(), 'W1-01', 'fresh TW namespace should default current level to W1-01');
    assert.deepEqual(STATE.twCampaign.scores, {}, 'fresh TW namespace should start with empty score records');
    assert.deepEqual(STATE.twCampaign.stars, {}, 'fresh TW namespace should start with empty star records');
    assert.equal(STATE.getTentacleWarsActiveWorldTab(), 1, 'fresh TW namespace should default active world tab to 1');
    assert.equal(STATE.completed, 9, 'loading fresh TW data should not corrupt NW completion');
    assert.equal(STATE.curLvl, 10, 'loading fresh TW data should not derive TW state from NW current level');
  });
}

function testTentacleWarsCampaignProgressionRoundTripStaysSeparate() {
  withIsolatedState(() => {
    STATE.completed = 7;
    STATE.curLvl = 8;
    STATE.recordTentacleWarsLevelWin('W1-01', 38, 40);
    STATE.recordTentacleWarsLevelWin('W1-01', 34, 40);
    STATE.recordTentacleWarsLevelLoss('W1-02');
    STATE.setTentacleWarsActiveWorldTab(2);

    assert.equal(STATE.getTentacleWarsCurrentLevel(), 'W1-02', 'TW wins should advance current level on clear');
    assert.equal(STATE.twCampaign.completed, 'W1-01', 'TW completion should track stable authored ids');
    assert.equal(STATE.getTentacleWarsStars('W1-01'), 3, 'TW stars should be monotonic and keep the best band');
    assert.equal(STATE.getTentacleWarsBestScore('W1-01').bestClearTimeSeconds, 34, 'TW best score should keep the fastest clear time');
    assert.equal(STATE.getTentacleWarsLevelFailStreak('W1-02'), 1, 'TW fail streaks should stay separate from NW fail streaks');

    STATE.save();

    STATE.twCampaign = {
      completed: 0,
      curLvl: 'W1-01',
      scores: {},
      stars: {},
      levelFailStreaks: {},
      activeWorldTab: 1,
    };

    STATE.load();

    assert.equal(STATE.completed, 7, 'TW round-trip should not overwrite NW completion');
    assert.equal(STATE.curLvl, 8, 'TW round-trip should not overwrite NW current level');
    assert.equal(STATE.twCampaign.completed, 'W1-01', 'TW round-trip should restore TW completion');
    assert.equal(STATE.getTentacleWarsCurrentLevel(), 'W1-02', 'TW round-trip should restore TW current level');
    assert.equal(STATE.getTentacleWarsStars('W1-01'), 3, 'TW round-trip should restore star records');
    assert.equal(STATE.getTentacleWarsActiveWorldTab(), 2, 'TW round-trip should restore the TW world tab only');
    assert.equal(store.get('tw_campaign_curLvl'), 'W1-02', 'TW round-trip should persist under the tw_campaign namespace');
    assert.equal(store.get('nw_curLvl'), 8, 'TW round-trip should leave NW storage keys untouched');
  });
}

function testTentacleWarsStartFlowTargetsAuthoredCampaignBeforeSandboxFallback() {
  const gameSource = readFileSync(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  assert.match(
    gameSource,
    /const currentTentacleWarsLevelId = STATE\.getTentacleWarsCurrentLevel\(\);/,
    'TentacleWars start flow should resolve the saved authored campaign level id before deciding runtime entry',
  );
  assert.match(
    gameSource,
    /const levelData = getTentacleWarsCampaignLevelById\(currentTentacleWarsLevelId\);/,
    'TentacleWars start flow should use the authored campaign lookup instead of hardcoding sandbox entry',
  );
  assert.match(
    gameSource,
    /if \(levelData\) \{\s*this\.loadTentacleWarsCampaignLevel\(levelData\);\s*return;\s*\}\s*this\.twMode\.enterSandboxPrototype\(\);/s,
    'TentacleWars start flow should load authored campaign data first and keep sandbox only as an explicit fallback',
  );
}

function testTentacleWarsDebugOverridesClearIndependently() {
  withIsolatedState(() => {
    STATE.setDebugMode(true);
    STATE.settings.twW2 = true;
    STATE.settings.twW3 = true;
    STATE.settings.twW4 = true;
    STATE.settings.w2 = true;
    STATE.settings.w3 = true;

    assert.equal(STATE.isTentacleWarsWorldUnlocked(4), true, 'TW debug overrides should be able to expose later worlds');

    STATE.setDebugMode(false);

    assert.equal(STATE.settings.twW2, null, 'disabling debug should clear TW world 2 override');
    assert.equal(STATE.settings.twW3, null, 'disabling debug should clear TW world 3 override');
    assert.equal(STATE.settings.twW4, null, 'disabling debug should clear TW world 4 override');
    assert.equal(STATE.settings.w2, null, 'disabling debug should still clear NW world 2 override');
    assert.equal(STATE.settings.w3, null, 'disabling debug should still clear NW world 3 override');
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
  ['disabling debug clears manual world overrides', testDisablingDebugClearsManualWorldOverrides],
  ['debug mode can expose the TentacleWars track', testDebugModeCanExposeTentacleWarsTrack],
  ['TentacleWars mode selection persists while debug stays on', testTentacleWarsModeSelectionPersistsWhileDebugStaysOn],
  ['TentacleWars fresh namespace defaults stay isolated', testTentacleWarsFreshNamespaceDefaultsStayIsolated],
  ['TentacleWars campaign progression round-trip stays separate', testTentacleWarsCampaignProgressionRoundTripStaysSeparate],
  ['TentacleWars start flow targets authored campaign before sandbox fallback', testTentacleWarsStartFlowTargetsAuthoredCampaignBeforeSandboxFallback],
  ['TentacleWars debug overrides clear independently', testTentacleWarsDebugOverridesClearIndependently],
  ['skip rule and fail streak flow stay canonical', testSkipRuleAndFailStreakFlow],
];

let passed = 0;
for (const [name, testFn] of tests) {
  testFn();
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log(`\n${passed}/${tests.length} GameState progression sanity checks passed`);
