/* ================================================================
   TentacleWars mode runtime

   Provides the mode-aware runtime boundary for the separate
   TentacleWars prototype. It owns sandbox entry, music routing,
   and sandbox-specific win/lose handling so the live NodeWARS
   campaign stays untouched.
   ================================================================ */

import { T } from '../localization/i18n.js';
import { STATE } from '../core/GameState.js';
import { Music } from '../audio/Music.js';
import { DOM_IDS } from '../ui/DomIds.js';
import { endTentacleWarsLevel, showNotification, showScr, showToast } from '../ui/ScreenController.js';
import { buildTentacleWarsCampaignConfig } from './TwCampaignLoader.js';
import { buildTentacleWarsSandboxConfig } from './TwSandboxConfig.js';
import { computeTentacleWarsSandboxOutcome } from './TwSandboxRules.js';

/* Local DOM helper for the pause overlay fields this runtime updates directly. */
function $(id) { return document.getElementById(id); }

export class TwModeRuntime {
  /*
   * Keep only the owning Game instance here so future TentacleWars systems can
   * be layered in without coupling the stable NodeWARS runtime directly.
   */
  constructor(game) {
    this.game = game;
  }

  /*
   * Keep sandbox detection explicit so Game can branch on the mode without
   * smuggling TentacleWars assumptions into the stable campaign loop.
   */
  isSandboxConfig(levelConfig) {
    return !!levelConfig?.isTentacleWarsSandbox;
  }

  /* TentacleWars mode can now run as either the sandbox or authored campaign. */
  isTentacleWarsConfig(levelConfig) {
    return !!(levelConfig?.isTentacleWarsSandbox || levelConfig?.isTentacleWarsCampaign);
  }

  /*
   * The active sandbox check is the single truth for pause, restart, and
   * end-state branches that must stay out of campaign progression flow.
   */
  isSandboxActive() {
    return this.isSandboxConfig(this.game.cfg);
  }

  /* Shared mode predicate for render, HUD, and simulation branches. */
  isTentacleWarsActive() {
    return this.isTentacleWarsConfig(this.game.cfg);
  }

  /* Separate check so campaign placeholder flow can stay out of NW results. */
  isCampaignActive() {
    return !!this.game.cfg?.isTentacleWarsCampaign;
  }

  /* Build a fresh sandbox config for each prototype run. */
  buildSandboxConfig() {
    return buildTentacleWarsSandboxConfig();
  }

  /* Campaign configs reuse the shared Game loader shell with authored data. */
  buildCampaignConfig(levelData, width = this.game.W, height = this.game.H) {
    return buildTentacleWarsCampaignConfig(levelData, width, height);
  }

  /*
   * Entering TentacleWars should always load the dedicated sandbox, not fall
   * through into campaign levels or placeholder toasts.
   */
  enterSandboxPrototype() {
    this.game.loadTentacleWarsSandbox();
  }

  /*
   * Sandbox music stays mode-owned so future TentacleWars tracks can diverge
   * from campaign grouping without touching the stable NodeWARS theme logic.
   */
  playSandboxMusic(levelConfig = this.game.cfg) {
    const trackId = levelConfig?.soundtrackTrackId || 'stella';
    Music.playTrackById(trackId);
  }

  /* Campaign levels can reuse the same mode-owned track routing for now. */
  playTentacleWarsMusic(levelConfig = this.game.cfg) {
    this.playSandboxMusic(levelConfig);
  }

  /*
   * Sandbox entry always announces the prototype context and switches to the
   * sandbox soundtrack so testers know they are outside the normal campaign.
   */
  onSandboxLoaded(levelConfig) {
    showNotification({
      kind: 'objective',
      icon: '◈',
      kicker: T('twModeLabel'),
      title: T('twSandboxTitle'),
      body: T('twSandboxBody'),
      dedupeKey: 'tentaclewars:sandbox-enter',
      durationMs: 4200,
    });
    this.playSandboxMusic(levelConfig);
  }

  /*
   * The first prototype uses a local sandbox end-state rather than the
   * campaign result screen. This avoids polluting progression with synthetic
   * level ids while still making the loop testable.
   */
  checkSandboxEndState() {
    const outcome = computeTentacleWarsSandboxOutcome(this.game.nodes);
    if (!outcome) return false;

    this.finishSandbox(outcome === 'win');
    return true;
  }

  /*
   * Sandbox completion reuses the pause overlay instead of the campaign result
   * flow so prototype runs can restart or exit without mutating progression.
   */
  finishSandbox(win) {
    if (this.game.done) return;

    this.game.done = true;
    this.game.paused = true;
    this.game.phaseOutcome = win ? 'win' : 'lose';

    showNotification({
      kind: win ? 'objective' : 'warning',
      icon: win ? '✦' : '⚠',
      kicker: T('twModeLabel'),
      title: win ? T('twSandboxWinTitle') : T('twSandboxLoseTitle'),
      body: win ? T('twSandboxWinBody') : T('twSandboxLoseBody'),
      dedupeKey: `tentaclewars:sandbox-end:${win ? 'win' : 'lose'}`,
      durationMs: 4200,
    });
    showToast(win ? T('twSandboxWinToast') : T('twSandboxLoseToast'));

    const pauseInfoElement = $(DOM_IDS.PINFO);
    const resumeButton = $(DOM_IDS.BTN_RESUME);
    const restartButton = $(DOM_IDS.BTN_PRR);
    const phaseSelectButton = $(DOM_IDS.BTN_PRL);
    const skipButton = $(DOM_IDS.BTN_PSKIP);
    const mainMenuButton = $(DOM_IDS.BTN_PMENU);
    const pauseSaveElement = $(DOM_IDS.PPSAVE);

    if (pauseInfoElement) pauseInfoElement.textContent = win ? T('twSandboxWinTitle') : T('twSandboxLoseTitle');
    if (resumeButton) resumeButton.style.display = 'none';
    if (restartButton) restartButton.textContent = T('restartSandbox');
    if (phaseSelectButton) phaseSelectButton.style.display = 'none';
    if (skipButton) skipButton.style.display = 'none';
    if (mainMenuButton) mainMenuButton.textContent = T('mainMenu');
    if (pauseSaveElement) pauseSaveElement.textContent = T('twSandboxPauseStatus');

    showScr('pause');
  }

  /* Phase-B campaign levels should not flow into NodeWARS progression yet. */
  finishCampaignLevel(win) {
    if (this.game.done) return;

    this.game.done = true;
    this.game.paused = true;
    this.game.phaseOutcome = win ? 'win' : 'lose';
    showToast(win ? T('phaseClear') : T('annihilated'));
    endTentacleWarsLevel(win, this.game);
  }
}
