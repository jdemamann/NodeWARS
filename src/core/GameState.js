/* ================================================================
   Game state

   Single source of truth for persistent and cross-cutting state:
   progression, settings, language, and current phase identity.
   ================================================================ */

import { LEVELS, getLevelConfig, getNextLevelId, getPreviousLevelId } from '../config/gameConfig.js';
import { store } from './storage.js';

const DEFAULT_SETTINGS = Object.freeze({
  /* World toggles act as explicit visibility overrides in Settings:
     null  -> follow natural campaign progression
     true  -> force the world visible
     false -> force the world hidden */
  w2: null,
  w3: null,
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
    this.curLvl      = 1;      // current campaign level id
    this.scores      = Array(33).fill(null); // best score per level id (1-32)
    this.levelFailStreaks = Array(33).fill(0);
    this.curLang     = 'pt';
    this.settings    = { ...DEFAULT_SETTINGS };
    this._activeWorldTab = 1;  // ui state for level select screen
  }

  save() {
    try {
      this._syncWorldUnlocksFromProgress();
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
      this._syncWorldUnlocksFromProgress();

      const activeWorldTab = parseInt(store.get('nw_activeWorldTab'));
      if (activeWorldTab >= 0 && activeWorldTab <= 3) this._activeWorldTab = activeWorldTab;
    } catch (e) {}
  }

  saveSettings() {
    this.settings = this._normalizeSettings(this.settings);
    this._syncWorldUnlocksFromProgress();
    store.set('nw_settings', JSON.stringify(this.settings));
  }

  loadSettings() {
    try {
      const st = JSON.parse(store.get('nw_settings') || '{}');
      this.settings = this._normalizeSettings(st);
      this._syncWorldUnlocksFromProgress();
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
    this.settings.w2 = null;
    this.settings.w3 = null;
    this.save();
  }

  setCurrentLevel(levelId) {
    if (Number.isInteger(levelId) && getLevelConfig(levelId)) {
      this.curLvl = levelId;
    }
  }

  getCurrentLevelConfig() {
    return getLevelConfig(this.curLvl);
  }

  getNextLevelId(levelId = this.curLvl) {
    return getNextLevelId(levelId);
  }

  getNextLevelConfig(levelId = this.curLvl) {
    const nextLevelId = this.getNextLevelId(levelId);
    return nextLevelId == null ? null : getLevelConfig(nextLevelId);
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
    this.completed = Math.max(this.completed, levelId);
    this._syncWorldUnlocksFromProgress();
    this.save();
  }

  recordTutorialCompletion(tutorialWorldId, tutorialLevelId) {
    const tutorialProgressId = Number.isInteger(tutorialLevelId)
      ? tutorialLevelId
      : (tutorialWorldId === 1 ? 0 : tutorialWorldId === 2 ? 11 : 22);
    this.completed = Math.max(this.completed, tutorialProgressId);
    this._syncWorldUnlocksFromProgress();
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

  isWorldUnlocked(worldId) {
    if (this.settings.debug) return true;
    if (worldId <= 1) return true;
    const manualVisibility = this._getManualWorldVisibility(worldId);
    if (manualVisibility != null) return manualVisibility;
    const unlockRequirement = this._getWorldUnlockRequirement(worldId);
    return unlockRequirement != null && this.completed >= unlockRequirement;
  }

  isLevelUnlocked(levelConfig) {
    if (!levelConfig) return false;
    if (this.settings.debug) return true;

    const worldId = levelConfig.worldId || levelConfig.tutorialWorldId || 1;
    if (!this.isWorldUnlocked(worldId)) return false;
    if (levelConfig.isTutorial) return true;
    if (levelConfig.id <= this.completed) return true;

    /* Tutorial phases are optional for every world, including World 1. When a
       world opens, both its tutorial and its first real phase must be playable
       so the player can skip onboarding without blocking campaign progression. */
    const firstPlayableWorldLevel = this._getFirstPlayableWorldLevelId(worldId);
    if (levelConfig.id === firstPlayableWorldLevel) return true;

    const previousLevelId = getPreviousLevelId(levelConfig.id);
    return previousLevelId != null && previousLevelId <= this.completed;
  }

  /* World visibility is now derived from campaign progress plus an explicit
     manual override in Settings, so there is no longer any persisted unlock
     flag to synchronize here. */
  _syncWorldUnlocksFromProgress() {}

  _getWorldUnlockRequirement(worldId) {
    if (worldId <= 1) return 0;
    const previousWorldId = worldId - 1;
    const previousWorldLevels = LEVELS.filter(levelConfig => (levelConfig.worldId || 1) === previousWorldId);
    if (!previousWorldLevels.length) return null;
    return Math.max(...previousWorldLevels.map(levelConfig => levelConfig.id));
  }

  _getFirstPlayableWorldLevelId(worldId) {
    const playableWorldLevels = LEVELS
      .filter(levelConfig => (levelConfig.worldId || 1) === worldId && !levelConfig.isTutorial)
      .sort((leftLevel, rightLevel) => leftLevel.id - rightLevel.id);
    return playableWorldLevels[0]?.id ?? null;
  }

  _getManualWorldVisibility(worldId) {
    if (worldId === 2) return typeof this.settings.w2 === 'boolean' ? this.settings.w2 : null;
    if (worldId === 3) return typeof this.settings.w3 === 'boolean' ? this.settings.w3 : null;
    return null;
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

    ['debug', 'sound', 'music', 'showFps', 'highGraphics'].forEach(settingKey => {
      normalizedSettings[settingKey] = !!normalizedSettings[settingKey];
    });

    ['w2', 'w3'].forEach(settingKey => {
      const value = normalizedSettings[settingKey];
      normalizedSettings[settingKey] = typeof value === 'boolean' ? value : null;
    });

    return normalizedSettings;
  }

  _normalizeGraphicsSettings() {
    this.settings = this._normalizeSettings(this.settings);
  }
}

/** Singleton — import STATE everywhere instead of using global vars. */
export const STATE = new GameState();
