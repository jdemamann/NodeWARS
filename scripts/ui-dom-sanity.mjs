import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

class FakeClassList {
  constructor() {
    this._classes = new Set();
  }

  add(...classNames) {
    classNames.filter(Boolean).forEach(className => this._classes.add(className));
  }

  remove(...classNames) {
    classNames.forEach(className => this._classes.delete(className));
  }

  toggle(className, force) {
    if (force === true) {
      this._classes.add(className);
      return true;
    }
    if (force === false) {
      this._classes.delete(className);
      return false;
    }
    if (this._classes.has(className)) {
      this._classes.delete(className);
      return false;
    }
    this._classes.add(className);
    return true;
  }

  contains(className) {
    return this._classes.has(className);
  }
}

class FakeStyle {
  constructor() {
    this.display = '';
    this.color = '';
    this.borderColor = '';
    this._properties = new Map();
  }

  setProperty(name, value) {
    this._properties.set(name, value);
  }

  getPropertyValue(name) {
    return this._properties.get(name) || '';
  }
}

class FakeElement {
  constructor(tagName = 'div', ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.classList = new FakeClassList();
    this.style = new FakeStyle();
    this.dataset = {};
    this.textContent = '';
    this._innerHTML = '';
    this.className = '';
    this.id = '';
    this._listeners = new Map();
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    if (child.id && this.ownerDocument) {
      this.ownerDocument._register(child);
    }
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }

  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(handler);
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

class FakeDocument {
  constructor() {
    this._elements = new Map();
    this.body = new FakeElement('body', this);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  getElementById(id) {
    return this._elements.get(id) || null;
  }

  appendToBody(element) {
    this.body.appendChild(element);
    this._register(element);
    return element;
  }

  _register(element) {
    if (element.id) this._elements.set(element.id, element);
  }
}

function createRegisteredElement(document, id, initialClassName = '') {
  const element = document.createElement('div');
  element.id = id;
  element.className = initialClassName;
  initialClassName.split(/\s+/).filter(Boolean).forEach(className => element.classList.add(className));
  document.appendToBody(element);
  return element;
}

let cachedModulesPromise = null;

async function loadModulesOnce() {
  if (!cachedModulesPromise) {
    cachedModulesPromise = Promise.all([
      import(pathToFileURL(path.join(ROOT, 'src/ui/DomIds.js')).href),
      import(pathToFileURL(path.join(ROOT, 'src/core/GameState.js')).href),
      import(pathToFileURL(path.join(ROOT, 'src/ui/ScreenController.js')).href),
    ]).then(([domIdsModule, gameStateModule, screenControllerModule]) => ({
      DOM_IDS: domIdsModule.DOM_IDS,
      STATE: gameStateModule.STATE,
      screenController: screenControllerModule,
    }));
  }

  return cachedModulesPromise;
}

async function setupUiDomHarness() {
  const fakeDocument = new FakeDocument();
  globalThis.document = fakeDocument;
  globalThis.window = globalThis;

  const { DOM_IDS, STATE, screenController } = await loadModulesOnce();

  [
    DOM_IDS.SCREEN_MENU,
    DOM_IDS.SCREEN_LEVELS,
    DOM_IDS.SCREEN_STORY,
    DOM_IDS.SCREEN_RESULT,
    DOM_IDS.SCREEN_ENDING,
    DOM_IDS.SCREEN_PAUSE,
    DOM_IDS.SCREEN_SETTINGS,
    DOM_IDS.SCREEN_CREDITS,
    DOM_IDS.WORLD_TABS,
    DOM_IDS.LGRID,
    DOM_IDS.WORLD_DESC,
    DOM_IDS.TUTBOX,
    DOM_IDS.HSCORE,
    DOM_IDS.DC,
    DOM_IDS.ENDING_TITLE,
    DOM_IDS.ENDING_SUB,
    DOM_IDS.ENDING_BODY,
    DOM_IDS.ENDING_STATS,
    DOM_IDS.ENDING_QUOTE,
    DOM_IDS.NOTIFICATIONS,
    DOM_IDS.DEBUG_RESET_ROW,
    DOM_IDS.DEBUG_COPY_ROW,
    DOM_IDS.DEBUG_ENDING_ROW,
    DOM_IDS.DEBUG_INFO_PANEL,
    DOM_IDS.TOG_W2,
    DOM_IDS.TOG_W3,
    DOM_IDS.TOG_DEBUG,
    DOM_IDS.TOG_SOUND,
    DOM_IDS.TOG_MUSIC,
    'togShowFps',
    'togGraphicsMode',
    'togTheme',
  ].forEach(id => createRegisteredElement(fakeDocument, id, id.startsWith('s') ? 'scr off' : ''));

  return { DOM_IDS, STATE, screenController, fakeDocument };
}

async function testShowScrTogglesSingleVisibleScreen() {
  const { DOM_IDS, screenController, fakeDocument } = await setupUiDomHarness();

  screenController.showScr('settings');
  assert.equal(fakeDocument.getElementById(DOM_IDS.SCREEN_SETTINGS).classList.contains('off'), false, 'settings screen should become visible');
  assert.equal(fakeDocument.getElementById(DOM_IDS.SCREEN_MENU).classList.contains('off'), true, 'menu screen should be hidden when another screen is shown');
  assert.equal(fakeDocument.getElementById(DOM_IDS.SCREEN_LEVELS).classList.contains('off'), true, 'level-select screen should be hidden when settings are shown');

  screenController.showScr('ending');
  assert.equal(fakeDocument.getElementById(DOM_IDS.SCREEN_ENDING).classList.contains('off'), false, 'ending screen should become visible');
  assert.equal(fakeDocument.getElementById(DOM_IDS.SCREEN_SETTINGS).classList.contains('off'), true, 'previous screen should be hidden after switching');
}

async function testRefreshSettingsUiReflectsEffectiveState() {
  const { DOM_IDS, STATE, screenController, fakeDocument } = await setupUiDomHarness();
  const originalCompleted = STATE.completed;
  const originalSettings = structuredClone(STATE.settings);

  try {
    STATE.completed = 10;
    STATE.settings.w2 = null;
    STATE.settings.w3 = null;
    STATE.settings.debug = true;
    STATE.settings.sound = false;
    STATE.settings.music = true;
    STATE.settings.showFps = true;
    STATE.settings.graphicsMode = 'high';
    STATE.settings.theme = 'SOLAR';

    screenController.refreshSettingsUI();

    assert.equal(fakeDocument.getElementById(DOM_IDS.TOG_W2).textContent, 'ON', 'world 2 toggle should reflect natural campaign unlock');
    assert.equal(fakeDocument.getElementById(DOM_IDS.TOG_W2).classList.contains('on'), true, 'world 2 toggle should gain ON styling when visible');
    assert.equal(fakeDocument.getElementById(DOM_IDS.DEBUG_RESET_ROW).style.display, '', 'debug rows should be visible when debug mode is enabled');
    assert.equal(fakeDocument.getElementById(DOM_IDS.DEBUG_COPY_ROW).style.display, '', 'copy row should be visible when debug mode is enabled');
    assert.equal(fakeDocument.getElementById(DOM_IDS.DEBUG_ENDING_ROW).style.display, '', 'ending preview row should be visible when debug mode is enabled');
    assert.equal(fakeDocument.getElementById(DOM_IDS.DEBUG_INFO_PANEL).style.display, '', 'debug panel should be visible when debug mode is enabled');
    assert.equal(fakeDocument.getElementById('togShowFps').textContent, 'ON', 'show-fps toggle should reflect the enabled state');
    assert.equal(fakeDocument.getElementById('togGraphicsMode').textContent, 'HIGH', 'graphics profile toggle should reflect high mode');
    assert.equal(fakeDocument.getElementById('togTheme').textContent, 'SOLAR', 'theme toggle should reflect the active theme');

    STATE.settings.w2 = false;
    STATE.settings.debug = false;
    screenController.refreshSettingsUI();

    assert.equal(fakeDocument.getElementById(DOM_IDS.TOG_W2).textContent, 'OFF', 'manual world-2 disable should override natural campaign unlock in settings UI');
    assert.equal(fakeDocument.getElementById(DOM_IDS.TOG_W2).classList.contains('on'), false, 'world-2 disable should clear the ON styling');
    assert.equal(fakeDocument.getElementById(DOM_IDS.DEBUG_RESET_ROW).style.display, 'none', 'debug rows should hide when debug mode is disabled');
    assert.equal(fakeDocument.getElementById(DOM_IDS.DEBUG_INFO_PANEL).style.display, 'none', 'debug panel should hide when debug mode is disabled');
  } finally {
    STATE.completed = originalCompleted;
    STATE.settings = originalSettings;
  }
}

async function testShowCampaignEndingPopulatesAndHidesHudSurfaces() {
  const { DOM_IDS, screenController, fakeDocument } = await setupUiDomHarness();
  const tutbox = fakeDocument.getElementById(DOM_IDS.TUTBOX);
  const scoreHud = fakeDocument.getElementById(DOM_IDS.HSCORE);
  const quickTip = fakeDocument.getElementById(DOM_IDS.DC);
  tutbox.style.display = 'block';
  scoreHud.style.display = 'inline-block';
  quickTip.classList.add('on');

  const fakeGame = {
    scoreTime: 97.4,
    cutsTotal: 12,
    frenzyCount: 2,
    calcScore: () => 745,
  };

  screenController.showCampaignEnding(fakeGame, { debugPreview: true });

  assert.equal(fakeDocument.getElementById(DOM_IDS.ENDING_TITLE).textContent.length > 0, true, 'campaign ending should populate a title');
  assert.equal(fakeDocument.getElementById(DOM_IDS.ENDING_SUB).textContent.length > 0, true, 'campaign ending should populate a subtitle');
  assert.equal(fakeDocument.getElementById(DOM_IDS.ENDING_BODY).innerHTML.includes('ending-paragraph'), true, 'campaign ending should render paragraph markup');
  assert.equal(fakeDocument.getElementById(DOM_IDS.ENDING_STATS).innerHTML.includes('ending-stat'), true, 'campaign ending should render stat markup');
  assert.equal(fakeDocument.getElementById(DOM_IDS.TUTBOX).style.display, 'none', 'tutorial overlay should be hidden when the campaign ending opens');
  assert.equal(fakeDocument.getElementById(DOM_IDS.HSCORE).style.display, 'none', 'HUD score should be hidden when the campaign ending opens');
  assert.equal(fakeDocument.getElementById(DOM_IDS.DC).classList.contains('on'), false, 'quick-tip tooltip should be hidden when the campaign ending opens');
  assert.equal(fakeDocument.getElementById(DOM_IDS.SCREEN_ENDING).classList.contains('off'), false, 'campaign ending should show the dedicated ending screen');
}

async function testShowNotificationAppendsStructuredCards() {
  const { DOM_IDS, screenController, fakeDocument } = await setupUiDomHarness();
  const notificationStack = fakeDocument.getElementById(DOM_IDS.NOTIFICATIONS);

  screenController.showNotification({
    kind: 'music',
    kicker: 'NOW PLAYING',
    title: 'GENESIS PULSE',
    body: 'World 1 opening cadence',
    meta: '82 BPM · LOOP 0:15',
    icon: '◈',
    durationMs: 1200,
  });

  assert.equal(notificationStack.children.length, 1, 'structured notifications should append a card into the notification stack');
  assert.match(notificationStack.children[0].innerHTML, /GENESIS PULSE/, 'notification cards should render the provided title');
  assert.match(notificationStack.children[0].className, /kind-music/, 'notification cards should preserve their visual kind');
}

async function testShowNotificationDedupesAndPrioritizesCards() {
  const { DOM_IDS, screenController, fakeDocument } = await setupUiDomHarness();
  const notificationStack = fakeDocument.getElementById(DOM_IDS.NOTIFICATIONS);

  screenController.showNotification({
    kind: 'status',
    title: 'Low Priority',
    dedupeKey: 'repeat:event',
    durationMs: 1200,
  });
  screenController.showNotification({
    kind: 'status',
    title: 'Low Priority Duplicate',
    dedupeKey: 'repeat:event',
    durationMs: 1200,
  });

  assert.equal(notificationStack.children.length, 1, 'duplicate notifications should be suppressed during the dedupe window');

  screenController.showNotification({
    kind: 'warning',
    title: 'Critical Warning',
    dedupeKey: 'warning:event',
    durationMs: 1200,
  });

  assert.equal(notificationStack.children.length, 1, 'high-priority warnings should evict lower-priority cards');
  assert.match(notificationStack.children[0].innerHTML, /Critical Warning/, 'warning card should remain visible after priority eviction');
}

async function testBuildWorldTabsRespectsEffectiveVisibility() {
  const { DOM_IDS, STATE, screenController, fakeDocument } = await setupUiDomHarness();
  const originalCompleted = STATE.completed;
  const originalSettings = structuredClone(STATE.settings);

  try {
    STATE.completed = 0;
    STATE.settings.w2 = null;
    STATE.settings.w3 = null;
    screenController.buildWorldTabs();
    assert.equal(fakeDocument.getElementById(DOM_IDS.WORLD_TABS).children.length, 1, 'fresh campaign should only render the World 1 tab');

    STATE.completed = 10;
    screenController.buildWorldTabs();
    assert.equal(fakeDocument.getElementById(DOM_IDS.WORLD_TABS).children.length, 2, 'natural World 2 unlock should add the second world tab');

    STATE.settings.w2 = false;
    screenController.buildWorldTabs();
    assert.equal(fakeDocument.getElementById(DOM_IDS.WORLD_TABS).children.length, 1, 'manual World 2 disable should remove the second world tab again');

    STATE.settings.debug = true;
    screenController.buildWorldTabs();
    assert.equal(fakeDocument.getElementById(DOM_IDS.WORLD_TABS).children.length, 3, 'debug mode should still expose all world tabs');
  } finally {
    STATE.completed = originalCompleted;
    STATE.settings = originalSettings;
  }
}

async function main() {
  const tests = [
    ['showScr toggles a single visible screen', testShowScrTogglesSingleVisibleScreen],
    ['refreshSettingsUI reflects effective state', testRefreshSettingsUiReflectsEffectiveState],
    ['showCampaignEnding populates and hides HUD surfaces', testShowCampaignEndingPopulatesAndHidesHudSurfaces],
    ['showNotification appends structured cards', testShowNotificationAppendsStructuredCards],
    ['showNotification dedupes and prioritizes cards', testShowNotificationDedupesAndPrioritizesCards],
    ['buildWorldTabs respects effective visibility', testBuildWorldTabsRespectsEffectiveVisibility],
  ];

  let passed = 0;
  for (const [name, fn] of tests) {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  }

  console.log(`\n${passed}/${tests.length} UI DOM sanity checks passed`);
}

main().catch(error => {
  console.error('UI DOM sanity checks failed');
  console.error(error);
  process.exitCode = 1;
});
