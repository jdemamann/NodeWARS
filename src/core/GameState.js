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
  twW2: null,
  twW3: null,
  twW4: null,
  debug: false,
  sound: true,
  music: true,
  showFps: false,
  gameMode: 'nodewars',
  fontId: 'exo2',
  textZoom: 1.0,
  graphicsMode: 'low',
  highGraphics: false,
  theme: 'AURORA',
});

const VALID_THEMES = new Set(['AURORA', 'SOLAR', 'GLACIER']);
const VALID_FONTS = new Set(['orbitron', 'techno', 'rajdhani', 'exo2']);
const VALID_GAME_MODES = new Set(['nodewars', 'tentaclewars']);
const TW_CAMPAIGN_LEVEL_ID_RE = /^W([1-4])-(0[1-9]|1\d|20)$/;
const TW_CAMPAIGN_MAX_WORLD = 4;
const TW_CAMPAIGN_PHASES_PER_WORLD = 20;
const DEFAULT_TW_CAMPAIGN_STATE = Object.freeze({
  completed: 0,
  curLvl: 'W1-01',
  scores: Object.freeze({}),
  stars: Object.freeze({}),
  levelFailStreaks: Object.freeze({}),
  activeWorldTab: 1,
});

/* Builds a mutable TW campaign state object from the canonical defaults. */
function createDefaultTentacleWarsCampaignState() {
  return {
    completed: DEFAULT_TW_CAMPAIGN_STATE.completed,
    curLvl: DEFAULT_TW_CAMPAIGN_STATE.curLvl,
    scores: {},
    stars: {},
    levelFailStreaks: {},
    activeWorldTab: DEFAULT_TW_CAMPAIGN_STATE.activeWorldTab,
  };
}

/* Parses a stable TW authored level id into sortable world and phase parts. */
function parseTentacleWarsLevelId(levelId) {
  if (typeof levelId !== 'string') return null;
  const match = levelId.match(TW_CAMPAIGN_LEVEL_ID_RE);
  if (!match) return null;
  return {
    world: Number(match[1]),
    phase: Number(match[2]),
  };
}

/* Compares two TW level ids without depending on authored level arrays yet. */
function compareTentacleWarsLevelIds(leftLevelId, rightLevelId) {
  const left = parseTentacleWarsLevelId(leftLevelId);
  const right = parseTentacleWarsLevelId(rightLevelId);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  if (left.world !== right.world) return left.world - right.world;
  return left.phase - right.phase;
}

/* Derives the next TW level id in the fixed 4x20 campaign skeleton. */
function getNextTentacleWarsLevelId(levelId) {
  const parsed = parseTentacleWarsLevelId(levelId);
  if (!parsed) return null;
  if (parsed.phase < TW_CAMPAIGN_PHASES_PER_WORLD) {
    return `W${parsed.world}-${String(parsed.phase + 1).padStart(2, '0')}`;
  }
  if (parsed.world >= TW_CAMPAIGN_MAX_WORLD) return null;
  return `W${parsed.world + 1}-01`;
}

/* Keeps TW stars on the phase-one time-band model from the progression spec. */
function computeTentacleWarsStars(clearTimeSeconds, parSeconds) {
  const clearTime = Number(clearTimeSeconds);
  const par = Number(parSeconds);
  if (!Number.isFinite(clearTime) || clearTime <= 0) return 0;
  if (!Number.isFinite(par) || par <= 0) return 1;
  const silverPar = Math.ceil(par * 1.35);
  if (clearTime <= par) return 3;
  if (clearTime <= silverPar) return 2;
  return 1;
}

/* Sanitizes persisted TW score records so malformed storage never leaks in. */
function normalizeTentacleWarsScores(rawScores) {
  if (!rawScores || typeof rawScores !== 'object' || Array.isArray(rawScores)) return {};
  const normalizedScores = {};
  Object.entries(rawScores).forEach(([levelId, scoreRecord]) => {
    if (!parseTentacleWarsLevelId(levelId)) return;
    if (!scoreRecord || typeof scoreRecord !== 'object' || Array.isArray(scoreRecord)) return;
    const bestClearTimeSeconds = Number(scoreRecord.bestClearTimeSeconds);
    const parSeconds = Number(scoreRecord.parSeconds);
    const silverParSeconds = Number(scoreRecord.silverParSeconds);
    if (!Number.isFinite(bestClearTimeSeconds) || bestClearTimeSeconds <= 0) return;
    normalizedScores[levelId] = {
      bestClearTimeSeconds,
      parSeconds: Number.isFinite(parSeconds) && parSeconds > 0 ? parSeconds : null,
      silverParSeconds: Number.isFinite(silverParSeconds) && silverParSeconds > 0 ? silverParSeconds : null,
    };
  });
  return normalizedScores;
}

/* Sanitizes persisted TW integer maps such as stars and fail streaks. */
function normalizeTentacleWarsNumberMap(rawMap, minimum, maximum) {
  if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return {};
  const normalizedMap = {};
  Object.entries(rawMap).forEach(([levelId, value]) => {
    if (!parseTentacleWarsLevelId(levelId)) return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    const clampedValue = Math.max(minimum, Math.min(maximum, Math.floor(numericValue)));
    normalizedMap[levelId] = clampedValue;
  });
  return normalizedMap;
}

class GameState {
  constructor() {
    this.completed   = 0;      // highest campaign phase id beaten
    this.curLvl      = 1;      // current campaign level id
    this.scores      = Array(33).fill(null); // best score per level id (1-32)
    this.levelFailStreaks = Array(33).fill(0);
    this.twCampaign = createDefaultTentacleWarsCampaignState();
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
      store.set('tw_campaign_completed', this.twCampaign.completed);
      store.set('tw_campaign_curLvl', this.twCampaign.curLvl);
      store.set('tw_campaign_scores', JSON.stringify(this.twCampaign.scores));
      store.set('tw_campaign_stars', JSON.stringify(this.twCampaign.stars));
      store.set('tw_campaign_levelFailStreaks', JSON.stringify(this.twCampaign.levelFailStreaks));
      store.set('tw_campaign_activeWorldTab', this.twCampaign.activeWorldTab);
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

      this._loadTentacleWarsCampaignState();
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

  /*
   * Debug mode exposes internal control surfaces, but manual world visibility
   * overrides should disappear as soon as debug mode is turned off.
   */
  setDebugMode(enabled) {
    this.settings.debug = !!enabled;
    if (!this.settings.debug) {
      this.clearManualWorldVisibilityOverrides();
      this.clearTentacleWarsManualWorldVisibilityOverrides();
      this.settings.gameMode = 'nodewars';
    }
  }

  /*
   * Mode selection lives in state so menu flow and future mode-specific
   * persistence continue to share one canonical switch.
   */
  setGameMode(modeId) {
    this.settings.gameMode = VALID_GAME_MODES.has(modeId) ? modeId : 'nodewars';
  }

  /*
   * Consumers should always read the active mode through this accessor so
   * invalid persisted values never leak into menu or runtime decisions.
   */
  getGameMode() {
    return VALID_GAME_MODES.has(this.settings.gameMode)
      ? this.settings.gameMode
      : 'nodewars';
  }

  /*
   * World visibility overrides are only meant for explicit debug sessions.
   */
  clearManualWorldVisibilityOverrides() {
    this.settings.w2 = null;
    this.settings.w3 = null;
  }

  /* TentacleWars debug-world overrides must stay isolated from NodeWARS. */
  clearTentacleWarsManualWorldVisibilityOverrides() {
    this.settings.twW2 = null;
    this.settings.twW3 = null;
    this.settings.twW4 = null;
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

  /* TentacleWars progression resets independently from NodeWARS. */
  resetTentacleWarsCampaignProgress() {
    this.twCampaign = createDefaultTentacleWarsCampaignState();
    this.clearTentacleWarsManualWorldVisibilityOverrides();
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

  /* TentacleWars current-level access stays separate from NW numeric ids. */
  setTentacleWarsCurrentLevel(levelId) {
    if (parseTentacleWarsLevelId(levelId)) {
      this.twCampaign.curLvl = levelId;
      this.save();
    }
  }

  /* Always expose a stable TW level id even on fresh saves. */
  getTentacleWarsCurrentLevel() {
    return parseTentacleWarsLevelId(this.twCampaign.curLvl)
      ? this.twCampaign.curLvl
      : DEFAULT_TW_CAMPAIGN_STATE.curLvl;
  }

  /* TW active world tab belongs to the separate campaign namespace. */
  setTentacleWarsActiveWorldTab(worldId) {
    if (Number.isInteger(worldId) && worldId >= 1 && worldId <= TW_CAMPAIGN_MAX_WORLD) {
      this.twCampaign.activeWorldTab = worldId;
      this.save();
    }
  }

  /* TW world-tab reads should never leak back to the NW UI tab state. */
  getTentacleWarsActiveWorldTab() {
    return this.twCampaign.activeWorldTab;
  }

  getLevelFailStreak(levelId) {
    if (!Number.isInteger(levelId) || levelId < 0 || levelId > 32) return 0;
    return this.levelFailStreaks[levelId] || 0;
  }

  /* TW fail streaks are keyed by stable authored ids instead of numeric ids. */
  getTentacleWarsLevelFailStreak(levelId) {
    if (!parseTentacleWarsLevelId(levelId)) return 0;
    return this.twCampaign.levelFailStreaks[levelId] || 0;
  }

  recordLevelLoss(levelId) {
    if (!Number.isInteger(levelId) || levelId < 0 || levelId > 32) return;
    this.levelFailStreaks[levelId] = (this.levelFailStreaks[levelId] || 0) + 1;
    this.save();
  }

  /* TW fail streaks are retained for analytics and future accessibility only. */
  recordTentacleWarsLevelLoss(levelId) {
    if (!parseTentacleWarsLevelId(levelId)) return;
    this.twCampaign.levelFailStreaks[levelId] = (this.twCampaign.levelFailStreaks[levelId] || 0) + 1;
    this.save();
  }

  recordLevelWin(levelId) {
    if (!Number.isInteger(levelId) || levelId < 0 || levelId > 32) return;
    this.levelFailStreaks[levelId] = 0;
    this.completed = Math.max(this.completed, levelId);
    this._syncWorldUnlocksFromProgress();
    this.save();
  }

  /* TW wins update completion, best clear time, and stars without touching NW keys. */
  recordTentacleWarsLevelWin(levelId, clearTimeSeconds, parSeconds) {
    if (!parseTentacleWarsLevelId(levelId)) return;

    this.twCampaign.levelFailStreaks[levelId] = 0;
    if (compareTentacleWarsLevelIds(levelId, this.twCampaign.completed) > 0) {
      this.twCampaign.completed = levelId;
    }

    const parsedClearTime = Number(clearTimeSeconds);
    const parsedPar = Number(parSeconds);
    if (Number.isFinite(parsedClearTime) && parsedClearTime > 0) {
      const previousBestRecord = this.twCampaign.scores[levelId];
      const nextSilverPar = Number.isFinite(parsedPar) && parsedPar > 0 ? Math.ceil(parsedPar * 1.35) : null;
      if (!previousBestRecord || parsedClearTime < previousBestRecord.bestClearTimeSeconds) {
        this.twCampaign.scores[levelId] = {
          bestClearTimeSeconds: parsedClearTime,
          parSeconds: Number.isFinite(parsedPar) && parsedPar > 0 ? parsedPar : null,
          silverParSeconds: nextSilverPar,
        };
      }

      const earnedStars = computeTentacleWarsStars(parsedClearTime, parsedPar);
      this.twCampaign.stars[levelId] = Math.max(this.twCampaign.stars[levelId] || 0, earnedStars);
    } else {
      this.twCampaign.stars[levelId] = Math.max(this.twCampaign.stars[levelId] || 0, 1);
    }

    const nextLevelId = getNextTentacleWarsLevelId(levelId);
    this.twCampaign.curLvl = nextLevelId || levelId;
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

  /* TW stars are mastery-only and must remain monotonic per phase. */
  getTentacleWarsStars(levelId) {
    if (!parseTentacleWarsLevelId(levelId)) return 0;
    return this.twCampaign.stars[levelId] || 0;
  }

  /* TW best-result records stay independent from the NW score table. */
  getTentacleWarsBestScore(levelId) {
    if (!parseTentacleWarsLevelId(levelId)) return null;
    return this.twCampaign.scores[levelId] || null;
  }

  canSkipLevel(levelConfig) {
    if (!levelConfig) return false;
    if (levelConfig.isTutorial || levelConfig.isBoss) return false;
    if (levelConfig.id >= 32) return false;
    return this.getLevelFailStreak(levelConfig.id) >= 5;
  }

  /* World unlocking for TW mirrors the 4x20 campaign skeleton, not NW ids. */
  isTentacleWarsWorldUnlocked(worldId) {
    if (worldId <= 1) return true;
    const manualVisibility = this._getTentacleWarsManualWorldVisibility(worldId);
    if (manualVisibility != null) return manualVisibility;

    const completedLevel = parseTentacleWarsLevelId(this.twCampaign.completed);
    if (!completedLevel) return false;
    return completedLevel.world >= worldId - 1 && completedLevel.phase >= TW_CAMPAIGN_PHASES_PER_WORLD;
  }

  /* Stars must not gate progression in the separate TW campaign. */
  isTentacleWarsLevelUnlocked(levelId) {
    const parsedLevel = parseTentacleWarsLevelId(levelId);
    if (!parsedLevel) return false;
    if (!this.isTentacleWarsWorldUnlocked(parsedLevel.world)) return false;
    if (this.settings.debug) return true;
    if (levelId === 'W1-01') return true;

    const currentLevel = parseTentacleWarsLevelId(this.getTentacleWarsCurrentLevel());
    if (currentLevel && compareTentacleWarsLevelIds(levelId, this.getTentacleWarsCurrentLevel()) <= 0) {
      return true;
    }

    const previousPhaseId = parsedLevel.phase > 1
      ? `W${parsedLevel.world}-${String(parsedLevel.phase - 1).padStart(2, '0')}`
      : `W${parsedLevel.world - 1}-${TW_CAMPAIGN_PHASES_PER_WORLD}`;
    return compareTentacleWarsLevelIds(previousPhaseId, this.twCampaign.completed) <= 0;
  }

  isWorldUnlocked(worldId) {
    if (worldId <= 1) return true;
    const manualVisibility = this._getManualWorldVisibility(worldId);
    if (manualVisibility != null) return manualVisibility;
    const unlockRequirement = this._getWorldUnlockRequirement(worldId);
    return unlockRequirement != null && this.completed >= unlockRequirement;
  }

  isLevelUnlocked(levelConfig) {
    if (!levelConfig) return false;

    const worldId = levelConfig.worldId || levelConfig.tutorialWorldId || 1;
    if (!this.isWorldUnlocked(worldId)) return false;
    if (this.settings.debug) return true;
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

  /* TW debug-world overrides mirror the NW pattern but stay isolated. */
  _getTentacleWarsManualWorldVisibility(worldId) {
    if (worldId === 2) return typeof this.settings.twW2 === 'boolean' ? this.settings.twW2 : null;
    if (worldId === 3) return typeof this.settings.twW3 === 'boolean' ? this.settings.twW3 : null;
    if (worldId === 4) return typeof this.settings.twW4 === 'boolean' ? this.settings.twW4 : null;
    return null;
  }

  /* Loads the separate TW campaign namespace without deriving anything from NW. */
  _loadTentacleWarsCampaignState() {
    this.twCampaign = createDefaultTentacleWarsCampaignState();

    const completedLevelId = store.get('tw_campaign_completed');
    if (completedLevelId === '0') {
      this.twCampaign.completed = 0;
    } else if (parseTentacleWarsLevelId(completedLevelId)) {
      this.twCampaign.completed = completedLevelId;
    }

    const currentLevelId = store.get('tw_campaign_curLvl');
    if (parseTentacleWarsLevelId(currentLevelId)) {
      this.twCampaign.curLvl = currentLevelId;
    }

    try {
      this.twCampaign.scores = normalizeTentacleWarsScores(JSON.parse(store.get('tw_campaign_scores') || '{}'));
      this.twCampaign.stars = normalizeTentacleWarsNumberMap(JSON.parse(store.get('tw_campaign_stars') || '{}'), 0, 3);
      this.twCampaign.levelFailStreaks = normalizeTentacleWarsNumberMap(
        JSON.parse(store.get('tw_campaign_levelFailStreaks') || '{}'),
        0,
        999,
      );
    } catch (error) {
      this.twCampaign.scores = {};
      this.twCampaign.stars = {};
      this.twCampaign.levelFailStreaks = {};
    }

    const activeWorldTab = parseInt(store.get('tw_campaign_activeWorldTab'));
    if (activeWorldTab >= 1 && activeWorldTab <= TW_CAMPAIGN_MAX_WORLD) {
      this.twCampaign.activeWorldTab = activeWorldTab;
    }
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

    normalizedSettings.gameMode = VALID_GAME_MODES.has(normalizedSettings.gameMode)
      ? normalizedSettings.gameMode
      : DEFAULT_SETTINGS.gameMode;

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

    ['twW2', 'twW3', 'twW4'].forEach(settingKey => {
      const value = normalizedSettings[settingKey];
      normalizedSettings[settingKey] = typeof value === 'boolean' ? value : null;
    });

    if (!normalizedSettings.debug) {
      normalizedSettings.w2 = null;
      normalizedSettings.w3 = null;
      normalizedSettings.twW2 = null;
      normalizedSettings.twW3 = null;
      normalizedSettings.twW4 = null;
      normalizedSettings.gameMode = 'nodewars';
    }

    return normalizedSettings;
  }

  _normalizeGraphicsSettings() {
    this.settings = this._normalizeSettings(this.settings);
  }
}

/** Singleton — import STATE everywhere instead of using global vars. */
export const STATE = new GameState();
