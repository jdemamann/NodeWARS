/* ================================================================
   NODE WARS v3 — GameState
   Single source of truth for persistent/cross-cutting state.
   Replaces the scattered globals: completed, curLvl, scores,
   curLang, and SETTINGS.
   ================================================================ */

import { store } from './storage.js';

const DEFAULT_SETTINGS = Object.freeze({
  w2: false,
  w3: false,
  debug: false,
  sound: true,
  music: true,
  showFps: false,
  fontId: 'exo2',
  textZoom: 1.0,
  graphicsMode: 'low',
  highGraphics: false,
  theme: 'AURORA',
});

const VALID_THEMES = new Set(['AURORA', 'SOLAR', 'GLACIER']);
const VALID_FONTS = new Set(['orbitron', 'techno', 'rajdhani', 'exo2']);

class GameState {
  constructor() {
    this.completed   = 0;      // highest campaign phase id beaten
    this.curLvl      = 1;      // current level index into LEVELS[]
    this.scores      = Array(33).fill(null); // best score per level id (1-32)
    this.levelFailStreaks = Array(33).fill(0);
    this.curLang     = 'pt';
    this.settings    = { ...DEFAULT_SETTINGS };
    this._activeWorldTab = 1;  // ui state for level select screen
  }

  save() {
    try {
      store.set('nw_completed', this.completed);
      store.set('nw_curLvl',    this.curLvl);
      store.set('nw_scores',    JSON.stringify(this.scores));
      store.set('nw_levelFailStreaks', JSON.stringify(this.levelFailStreaks));
      store.set('nw_lang',      this.curLang);
      store.set('nw_activeWorldTab', this._activeWorldTab);
      store.set('nw_settings',  JSON.stringify(this.settings));
    } catch (e) {}
  }

  load() {
    try {
      const c = parseInt(store.get('nw_completed'));
      if (c >= 0 && c <= 32) this.completed = c;

      const curLvl = parseInt(store.get('nw_curLvl'));
      if (curLvl >= 0 && curLvl <= 32) this.curLvl = curLvl;

      const lang = store.get('nw_lang');
      if (lang === 'en' || lang === 'pt') this.curLang = lang;

      const s = JSON.parse(store.get('nw_scores') || '[]');
      if (Array.isArray(s)) s.forEach((v, i) => {
        if (i >= 1 && i <= 32 && v != null) this.scores[i] = v;
      });

      const failStreaks = JSON.parse(store.get('nw_levelFailStreaks') || '[]');
      if (Array.isArray(failStreaks)) failStreaks.forEach((value, index) => {
        if (index >= 0 && index <= 32 && Number.isFinite(value) && value >= 0) {
          this.levelFailStreaks[index] = value;
        }
      });

      const st = JSON.parse(store.get('nw_settings') || '{}');
      this.settings = this._normalizeSettings(st);

      const activeWorldTab = parseInt(store.get('nw_activeWorldTab'));
      if (activeWorldTab >= 0 && activeWorldTab <= 3) this._activeWorldTab = activeWorldTab;
    } catch (e) {}
  }

  saveSettings() {
    this.settings = this._normalizeSettings(this.settings);
    store.set('nw_settings', JSON.stringify(this.settings));
  }

  loadSettings() {
    try {
      const st = JSON.parse(store.get('nw_settings') || '{}');
      this.settings = this._normalizeSettings(st);
    } catch (e) {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  saveLang(lang) {
    this.curLang = lang;
    store.set('nw_lang', lang);
  }

  resetProgress() {
    this.completed = 0;
    this.curLvl = 1;
    this.scores = Array(33).fill(null);
    this.levelFailStreaks = Array(33).fill(0);
    this.save();
  }

  setCurrentLevel(levelId) {
    if (Number.isInteger(levelId) && levelId >= 0 && levelId <= 32) {
      this.curLvl = levelId;
    }
  }

  setActiveWorldTab(worldId) {
    if (Number.isInteger(worldId) && worldId >= 0 && worldId <= 3) {
      this._activeWorldTab = worldId;
      store.set('nw_activeWorldTab', worldId);
    }
  }

  getActiveWorldTab() {
    return this._activeWorldTab;
  }

  getLevelFailStreak(levelId) {
    if (!Number.isInteger(levelId) || levelId < 0 || levelId > 32) return 0;
    return this.levelFailStreaks[levelId] || 0;
  }

  recordLevelLoss(levelId) {
    if (!Number.isInteger(levelId) || levelId < 0 || levelId > 32) return;
    this.levelFailStreaks[levelId] = (this.levelFailStreaks[levelId] || 0) + 1;
    this.save();
  }

  recordLevelWin(levelId) {
    if (!Number.isInteger(levelId) || levelId < 0 || levelId > 32) return;
    this.levelFailStreaks[levelId] = 0;
    this.save();
  }

  consumeLevelSkip(levelId) {
    if (!Number.isInteger(levelId) || levelId < 0 || levelId > 32) return;
    this.levelFailStreaks[levelId] = 0;
    this.save();
  }

  canSkipLevel(levelConfig) {
    if (!levelConfig) return false;
    if (levelConfig.isTutorial || levelConfig.isBoss) return false;
    if (levelConfig.id >= 32) return false;
    return this.getLevelFailStreak(levelConfig.id) >= 5;
  }

  _normalizeSettings(partialSettings = {}) {
    const normalizedSettings = { ...DEFAULT_SETTINGS, ...(partialSettings || {}) };
    const mode = normalizedSettings.graphicsMode;
    if (mode === 'high' || mode === 'low') {
      normalizedSettings.highGraphics = mode === 'high';
    } else {
      normalizedSettings.graphicsMode = normalizedSettings.highGraphics ? 'high' : 'low';
      normalizedSettings.highGraphics = normalizedSettings.graphicsMode === 'high';
    }

    normalizedSettings.theme = VALID_THEMES.has(normalizedSettings.theme)
      ? normalizedSettings.theme
      : DEFAULT_SETTINGS.theme;

    normalizedSettings.fontId = VALID_FONTS.has(normalizedSettings.fontId)
      ? normalizedSettings.fontId
      : DEFAULT_SETTINGS.fontId;

    const zoom = Number(normalizedSettings.textZoom);
    normalizedSettings.textZoom = Number.isFinite(zoom)
      ? Math.max(0.5, Math.min(2.0, zoom))
      : DEFAULT_SETTINGS.textZoom;

    ['w2', 'w3', 'debug', 'sound', 'music', 'showFps', 'highGraphics'].forEach(settingKey => {
      normalizedSettings[settingKey] = !!normalizedSettings[settingKey];
    });

    return normalizedSettings;
  }

  _normalizeGraphicsSettings() {
    this.settings = this._normalizeSettings(this.settings);
  }
}

/** Singleton — import STATE everywhere instead of using global vars. */
export const STATE = new GameState();
