import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function read(relPath) {
  return fs.readFile(path.join(ROOT, relPath), 'utf8');
}

async function testScreenIdsStayUniqueAndPresent() {
  const html = await read('index.html');
  const screenIds = ['sm', 'sl', 'ss', 'sr', 'sce', 'pm', 'sq', 'scredit'];

  for (const screenId of screenIds) {
    const matches = html.match(new RegExp(`id="${screenId}"`, 'g')) || [];
    assert.equal(matches.length, 1, `screen id ${screenId} should exist exactly once in index.html`);
  }
}

async function testCriticalMenuButtonsAreWired() {
  const mainSource = await read('src/main.js');
  const html = await read('index.html');

  const buttonIds = [
    'btnplay', 'btnstory', 'btnsettings', 'btncredits',
    'btnSettingsBack', 'btncreditsback',
    'btnback',
    'btnstoryback', 'btnstoryback2',
    'btnrl', 'btnrr', 'btnrn',
    'btnEndingLevels', 'btnEndingReplay', 'btnEndingMenu',
    'btnresume', 'btnprl', 'btnprr', 'btnpskip', 'btnpmenu',
    'btnCopyDebug', 'btnViewEnding', 'btnResetProg',
    'btnMusicPrev', 'btnMusicToggle', 'btnMusicNext',
  ];

  for (const buttonId of buttonIds) {
    assert.match(html, new RegExp(`id="${buttonId}"`), `${buttonId} should exist in index.html`);
  }

  const wiredDomIds = [
    'BTN_PLAY', 'BTN_STORY', 'BTN_SETTINGS', 'BTN_CREDITS',
    'BTN_SETTINGS_BACK', 'BTN_CREDITS_BACK',
    'BTN_BACK',
    'BTN_STORY_BACK', 'BTN_STORY_BACK2',
    'BTN_RL', 'BTN_RR', 'BTN_RN',
    'BTN_ENDING_LEVELS', 'BTN_ENDING_REPLAY', 'BTN_ENDING_MENU',
    'BTN_RESUME', 'BTN_PRL', 'BTN_PRR', 'BTN_PSKIP', 'BTN_PMENU',
    'BTN_COPY_DEBUG', 'BTN_VIEW_ENDING', 'BTN_RESET_PROG',
    'BTN_MUSIC_PREV', 'BTN_MUSIC_TOGGLE', 'BTN_MUSIC_NEXT',
  ];

  for (const domIdName of wiredDomIds) {
    assert.match(mainSource, new RegExp(`${domIdName}\\)\\?\\.addEventListener\\('click'`), `${domIdName} should be wired to a click handler in main.js`);
  }
}

async function testTutorialAndHudControlsAreWired() {
  const gameSource = await read('src/core/Game.js');
  const html = await read('index.html');

  for (const elementId of ['hpause', 'hlang', 'tutNext', 'tutExit']) {
    assert.match(html, new RegExp(`id="${elementId}"`), `${elementId} should exist in index.html`);
  }

  assert.match(gameSource, /hpause\.addEventListener\('click', \(\) => this\.togglePause\(\)\)/, 'HUD pause button should be wired inside Game');
  assert.match(gameSource, /tutNext\.addEventListener\('click', \(\) => this\.tut\.advance\(\)\)/, 'tutorial next button should be wired inside Game');
  assert.match(gameSource, /tutExit\.addEventListener\('pointerdown', exitTutorial\)/, 'tutorial exit button should use pointerdown for reliable dismissal');
  assert.match(gameSource, /tutExit\.addEventListener\('click', exitTutorial\)/, 'tutorial exit button should also use click for compatibility');
  assert.match(gameSource, /hlang\.addEventListener\('click', \(\) => \{/, 'HUD language button should remain wired');
}

async function testSettingsControlsHaveI18nCoverage() {
  const html = await read('index.html');
  const i18n = await read('src/localization/i18n.js');

  const requiredKeys = [
    'settings', 'setWorlds', 'setGameplay', 'setDisplay', 'setDeveloper',
    'setGraphicsMode', 'setGraphicsModeDesc',
    'setShowFps', 'setShowFpsDesc',
    'setTheme', 'setThemeDesc',
    'setFont', 'setFontDesc',
    'setZoom', 'setZoomDesc',
    'setLang', 'setLangDesc',
    'setDebug', 'setDebugDesc',
    'setCopyDebug', 'setCopyDebugDesc',
    'setViewEnding', 'setViewEndingDesc',
    'setReset', 'setResetDesc',
    'setMusicPlayer', 'setMusicPlayerDesc',
    'setMusicPlay', 'setMusicPause', 'setMusicCurrentIdle',
    'viewEnding',
    'notifNowPlaying',
    'notifSignalTowerTitle', 'notifSignalTowerBody',
    'notifAiRetreatTitle', 'notifAiRetreatBody',
    'notifDebugSnapshotCopiedTitle', 'notifDebugSnapshotCopiedBody',
    'notifProgressResetTitle', 'notifProgressResetBody',
    'trackDriftSignal', 'trackGenesisPulse', 'trackSiegeBloom',
    'trackEchoCore', 'trackHollowSignal', 'trackEntropyCurrent',
    'trackOblivionGate', 'trackCurrent', 'trackSignalWar',
    'trackTranscendenceProtocol', 'trackNetworkAwakens',
  ];

  for (const key of requiredKeys) {
    assert.match(i18n, new RegExp(`${key}:`), `i18n should expose ${key}`);
  }

  for (const key of ['setCopyDebug', 'setViewEnding', 'setReset', 'setMusicPlayer']) {
    assert.match(html, new RegExp(`data-t="${key}"`), `${key} should be rendered through i18n in index.html`);
  }
}

async function testScreenTransitionsUseNamedScreens() {
  const screenController = await read('src/ui/ScreenController.js');
  const mainSource = await read('src/main.js');

  for (const screenName of ['menu', 'levels', 'story', 'result', 'ending', 'pause', 'settings', 'credits']) {
    assert.match(screenController, new RegExp(`${screenName}:\\s+DOM_IDS\\.`), `ScreenController should map the ${screenName} screen`);
  }

  assert.match(mainSource, /showScr\('levels'\)/, 'main menu flow should still navigate to the level-select screen');
  assert.match(mainSource, /showScr\('settings'\)/, 'settings flow should still navigate to the settings screen');
  assert.match(mainSource, /showScr\('credits'\)/, 'credits flow should still navigate to the credits screen');
  assert.match(mainSource, /showScr\('menu'\)/, 'back buttons should still navigate to the menu screen');
  assert.match(screenController, /showScr\('ending'\)/, 'campaign completion should still navigate to the dedicated ending screen');
}

async function testClipboardAndDebugPreviewFallbacksExist() {
  const mainSource = await read('src/main.js');

  assert.match(mainSource, /async function copyTextToClipboard\(text\)/, 'clipboard helper should exist');
  assert.ok(mainSource.includes('navigator.clipboard?.writeText'), 'clipboard helper should try the modern API first');
  assert.match(mainSource, /document\.execCommand\('copy'\)/, 'clipboard helper should preserve the fallback copy path');
  assert.match(mainSource, /showCampaignEnding\(debugPreviewGame, \{ debugPreview: true \}\)/, 'debug preview button should open the campaign ending');
}

async function testMusicNotificationWiringStaysPresent() {
  const html = await read('index.html');
  const mainSource = await read('src/main.js');
  const musicSource = await read('src/audio/Music.js');
  const screenControllerSource = await read('src/ui/ScreenController.js');

  assert.match(html, /id="notifications"/, 'the notification stack should exist in index.html');
  assert.match(screenControllerSource, /export function showNotification\(/, 'ScreenController should expose the structured notification entry point');
  assert.match(mainSource, /Music\.setTrackChangeListener\(/, 'main.js should wire a music track-change listener');
  assert.match(mainSource, /notifNowPlaying/, 'music notifications should go through i18n');
  assert.match(musicSource, /playLevelTheme\(levelConfig\)/, 'Music should expose grouped level-theme playback');
  assert.match(musicSource, /playEnding\(\)/, 'Music should expose a dedicated ending theme');
  assert.match(musicSource, /setTrackChangeListener\(listener\)/, 'Music should expose a track-change listener registration API');
}

async function testSettingsWorldTogglesAndMenuFeedbackStayRobust() {
  const gameStateModuleUrl = pathToFileURL(path.join(ROOT, 'src/core/GameState.js')).href + `?ui-sanity=${Date.now()}`;
  const { STATE } = await import(gameStateModuleUrl);
  const mainSource = await read('src/main.js');
  const screenController = await read('src/ui/ScreenController.js');
  const css = await read('styles/main.css');

  const originalCompleted = STATE.completed;
  const originalSettings = structuredClone(STATE.settings);

  try {
    STATE.completed = 10;
    STATE.settings.w2 = null;
    STATE.settings.w3 = null;
    assert.equal(STATE.isWorldUnlocked(2), true, 'world 2 should unlock naturally from campaign progress');

    STATE.settings.w2 = false;
    assert.equal(STATE.isWorldUnlocked(2), false, 'world 2 manual OFF should override campaign unlock');

    STATE.settings.w2 = true;
    assert.equal(STATE.isWorldUnlocked(2), true, 'world 2 manual ON should re-enable the world');

    STATE.completed = 0;
    STATE.settings.w2 = null;
    assert.equal(STATE.isWorldUnlocked(2), false, 'world 2 should stay hidden on a fresh save with no override');

    STATE.settings.w2 = true;
    assert.equal(STATE.isWorldUnlocked(2), true, 'world 2 manual ON should still work before natural unlock');
  } finally {
    STATE.completed = originalCompleted;
    STATE.settings = originalSettings;
  }

  assert.match(mainSource, /function bindMenuControlFeedback\(\)/, 'main.js should centralize menu feedback wiring');
  assert.ok(
    mainSource.includes(".btn,.btn.sec,.wtab,.stoggle,.lb2,.btn-lang,.zoom-ctrl,.font-cycle-btn"),
    'delegated menu feedback should cover buttons, tabs, toggles, level cards, language, and zoom controls',
  );
  assert.match(mainSource, /clickedControl\.matches\('\.wtab'\)\) Music\.tabSwitch\(\)/, 'world tabs should keep their distinct click sound through the delegated menu feedback path');
  assert.match(screenController, /STATE\.isWorldUnlocked\(2\)/, 'settings UI should reflect the effective world-2 visibility state');
  assert.match(screenController, /STATE\.isWorldUnlocked\(3\)/, 'settings UI should reflect the effective world-3 visibility state');
  assert.match(css, /\.menu-press \{/, 'styles should provide transient visual click feedback for menu controls');
}

async function testFontSelectionStaysUiWide() {
  const mainSource = await read('src/main.js');
  const css = await read('styles/main.css');
  const html = await read('index.html');
  const bundledFontFiles = [
    'assets/fonts/Orbitron-wght.woff2',
    'assets/fonts/Orbitron-wght.ttf',
    'assets/fonts/ShareTechMono-Regular.woff2',
    'assets/fonts/ShareTechMono-Regular.ttf',
    'assets/fonts/Rajdhani-Regular.woff2',
    'assets/fonts/Rajdhani-Regular.ttf',
    'assets/fonts/Rajdhani-Bold.woff2',
    'assets/fonts/Rajdhani-Bold.ttf',
    'assets/fonts/Exo2-wght.woff2',
    'assets/fonts/Exo2-wght.ttf',
  ];

  assert.match(mainSource, /document\.documentElement\.dataset\.font = id;/, 'font application should update the html data-font attribute');
  assert.match(mainSource, /STATE\.settings\.fontId = fonts\[\(idx \+ 1\) % fonts\.length\];/, 'font cycle should still persist the selected font id');
  assert.match(mainSource, /applyFont\(\);\s*refreshDisplayUI\(\);/, 'font cycle should reapply the font and refresh the settings UI immediately');
  assert.doesNotMatch(html, /fonts\.googleapis\.com/, 'the app should not depend on remote Google Fonts for its UI');
  assert.match(css, /@font-face \{\s*font-family: 'NW Orbitron';\s*src:\s*url\('\.\.\/assets\/fonts\/Orbitron-wght\.woff2'\) format\('woff2'\),\s*url\('\.\.\/assets\/fonts\/Orbitron-wght\.ttf'\) format\('truetype'\),\s*local\('Orbitron'\);/s, 'styles should define a bundled Orbitron alias');
  assert.match(css, /@font-face \{\s*font-family: 'NW Tech Mono';\s*src:\s*url\('\.\.\/assets\/fonts\/ShareTechMono-Regular\.woff2'\) format\('woff2'\),\s*url\('\.\.\/assets\/fonts\/ShareTechMono-Regular\.ttf'\) format\('truetype'\),\s*local\('Share Tech Mono'\);/s, 'styles should define a bundled techno alias');
  assert.match(css, /@font-face \{\s*font-family: 'NW Rajdhani';\s*src:\s*url\('\.\.\/assets\/fonts\/Rajdhani-Regular\.woff2'\) format\('woff2'\),\s*url\('\.\.\/assets\/fonts\/Rajdhani-Regular\.ttf'\) format\('truetype'\),\s*local\('Rajdhani'\);/s, 'styles should define a bundled Rajdhani alias');
  assert.match(css, /@font-face \{\s*font-family: 'NW Exo 2';\s*src:\s*url\('\.\.\/assets\/fonts\/Exo2-wght\.woff2'\) format\('woff2'\),\s*url\('\.\.\/assets\/fonts\/Exo2-wght\.ttf'\) format\('truetype'\),\s*local\('Exo 2'\);/s, 'styles should define a bundled Exo 2 alias');

  for (const relPath of bundledFontFiles) {
    await fs.access(path.join(ROOT, relPath));
  }

  const cssWithoutFontSources = css
    .replace(/--font-ui:[^;]+;/g, '')
    .replace(/--font-copy:[^;]+;/g, '')
    .replace(/@font-face\s*\{[^}]+\}/g, '')
    .replace(/html\[data-font="[^"]+"\][^{]*\{[^}]+\}/g, '');

  assert.doesNotMatch(cssWithoutFontSources, /Orbitron|Share Tech Mono/, 'UI stylesheet should not hardcode specific menu fonts outside the shared font variables');
  assert.match(css, /html\[data-font="orbitron"\][^{]*\{[^}]*--font-ui:[^}]*--font-copy:/, 'orbitron mode should override both display and copy font variables');
  assert.match(css, /html\[data-font="techno"\][^{]*\{[^}]*--font-ui:[^}]*--font-copy:/, 'techno mode should override both display and copy font variables');
  assert.match(css, /html\[data-font="rajdhani"\][^{]*\{[^}]*--font-ui:[^}]*--font-copy:/, 'rajdhani mode should override both display and copy font variables');
  assert.match(css, /html\[data-font="exo2"\][^{]*\{[^}]*--font-ui:[^}]*--font-copy:/, 'exo2 mode should override both display and copy font variables');
}

async function main() {
  const tests = [
    ['screen ids stay unique and present', testScreenIdsStayUniqueAndPresent],
    ['critical menu buttons are wired', testCriticalMenuButtonsAreWired],
    ['tutorial and HUD controls are wired', testTutorialAndHudControlsAreWired],
    ['settings controls have i18n coverage', testSettingsControlsHaveI18nCoverage],
    ['screen transitions use named screens', testScreenTransitionsUseNamedScreens],
    ['clipboard and debug preview fallbacks exist', testClipboardAndDebugPreviewFallbacksExist],
    ['music notification wiring stays present', testMusicNotificationWiringStaysPresent],
    ['settings world toggles and menu feedback stay robust', testSettingsWorldTogglesAndMenuFeedbackStayRobust],
    ['font selection stays UI-wide', testFontSelectionStaysUiWide],
  ];

  let passed = 0;
  for (const [name, fn] of tests) {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  }

  console.log(`\n${passed}/${tests.length} UI action sanity checks passed`);
}

main().catch(error => {
  console.error('UI action sanity checks failed');
  console.error(error);
  process.exitCode = 1;
});
