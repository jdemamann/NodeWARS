/* ================================================================
   HUD

   Updates the fixed top-bar DOM elements. Uses a dirty flag so the
   DOM is only touched when values actually change.
   ================================================================ */

import { DOM_IDS } from './DomIds.js';
import { T }   from '../localization/i18n.js';
import { STATE } from '../core/GameState.js';

function $(id) { return document.getElementById(id); }

export class HUD {
  constructor() {
    /* Cache last-rendered values */
    this._sp   = -1;
    this._sn   = -1;
    this._se   = -1;
    this._par  = '';
    this._sc   = '';
    this._lvl  = '';
    this._name = '';
    this._fps  = '';
  }

  update(game) {
    const isTentacleWarsMode = game.twMode?.isTentacleWarsActive?.() || false;
    const brandElement = $(DOM_IDS.HBRAND);
    if (brandElement) {
      brandElement.textContent = isTentacleWarsMode ? T('twModeLabel') : 'NODE WARS';
    }

    /* Node counts */
    const playerNodeCount = game.nodes.filter(node => node.owner === 1).length;
    const neutralNodeCount = game.nodes.filter(node => node.owner === 0).length;
    const enemyNodeCount = game.nodes.filter(node => node.owner !== 0 && node.owner !== 1).length;

    if (playerNodeCount !== this._sp) { this._sp = playerNodeCount; const el = $(DOM_IDS.SP); if (el) el.textContent = playerNodeCount; }
    if (neutralNodeCount !== this._sn) { this._sn = neutralNodeCount; const el = $(DOM_IDS.SN); if (el) el.textContent = neutralNodeCount; }
    if (enemyNodeCount !== this._se) { this._se = enemyNodeCount; const el = $(DOM_IDS.SE); if (el) el.textContent = enemyNodeCount; }

    /* Label translations */
    const playerLabel = document.querySelector('.hst.hp .lb');
    if (playerLabel) playerLabel.textContent = T('you');
    const neutralLabel = document.querySelector('.hst.hn .lb');
    if (neutralLabel) neutralLabel.textContent = T('neutral');
    const enemyLabel = document.querySelector('.hst.he .lb');
    if (enemyLabel) enemyLabel.textContent = T('enemy');

    /* Par timer */
    if (game.cfg && !game.cfg.isTutorial && game.cfg.par) {
      const elapsedSeconds  = Math.floor(game.scoreTime);
      const par = game.cfg.par;
      const parDeltaSeconds = elapsedSeconds - par;
      const parText = parDeltaSeconds <= 0 ? 'PAR ' + (-parDeltaSeconds) + 's ▲' : 'PAR +' + parDeltaSeconds + 's ▼';
      if (parText !== this._par) {
        this._par = parText;
        const el  = $(DOM_IDS.HPAR);
        if (el) {
          el.textContent = parText;
          el.style.color = parDeltaSeconds <= -10 ? '#00ff9d' : parDeltaSeconds <= 0 ? '#00e5ff' : parDeltaSeconds < 20 ? '#f5c518' : '#ff7090';
        }
      }
    } else {
      const el = $(DOM_IDS.HPAR);
      if (el && this._par !== '') { this._par = ''; el.textContent = ''; }
    }

    /* Live score */
    const scoreElement = $(DOM_IDS.HSCORE);
    if (scoreElement && game.cfg && !game.cfg.isTutorial && !game.done && !isTentacleWarsMode) {
      const score = game.calcScore();
      const starCount = game._utils.starsFor(score);
      const scoreText = ['★','☆','☆'].map((_, i) => i < starCount ? '★' : '☆').join('') + ' ' + score;
      if (scoreText !== this._sc) {
        this._sc          = scoreText;
        scoreElement.classList.remove('hud-hidden');
        scoreElement.style.display = '';
        scoreElement.textContent   = scoreText;
      }
    } else if (scoreElement && scoreElement.style.display !== 'none') {
      this._sc          = '';
      scoreElement.classList.add('hud-hidden');
      scoreElement.style.display = 'none';
    }

    const fpsEl = $(DOM_IDS.HFPS);
    if (fpsEl) {
      if (STATE.settings.showFps && game.fps > 0) {
        const fpsText = `${Math.round(game.fps)} FPS`;
        if (fpsText !== this._fps) {
          this._fps = fpsText;
          fpsEl.textContent = fpsText;
        }
        fpsEl.classList.remove('hud-hidden');
        fpsEl.style.display = 'inline-block';
      } else if (fpsEl.style.display !== 'none') {
        this._fps = '';
        fpsEl.classList.add('hud-hidden');
        fpsEl.style.display = 'none';
      }
    }

    /* Level label */
    if (game.cfg) {
      const levelConfig = game.cfg;
      const worldLabel = levelConfig.worldId > 0 ? ' W' + levelConfig.worldId : '';
      const levelText = isTentacleWarsMode
        ? (levelConfig.isTentacleWarsSandbox
          ? (levelConfig.twPresetId ? `TW · ${levelConfig.twPresetId.toUpperCase()}` : T('twModeLabel'))
          : `TW · ${levelConfig.twLevelId || levelConfig.id}`)
        : levelConfig.isTutorial ? T('tutorial') : ('LVL ' + levelConfig.id + worldLabel);
      if (levelText !== this._lvl) {
        this._lvl = levelText;
        const el  = $(DOM_IDS.HLVL);
        if (el) el.textContent = levelText;
      }
      const levelName = levelConfig.name;
      if (levelName !== this._name) {
        this._name = levelName;
        const el   = $(DOM_IDS.HLN);
        if (el) el.textContent = levelName;
      }
    }
  }

  /* Called once when a level loads, or language changes */
  setLevel(levelConfig) {
    this._sp = this._sn = this._se = -1;
    this._par = this._sc = this._lvl = this._name = this._fps = '';

    const pauseButton = $(DOM_IDS.HPAUSE);
    if (pauseButton) pauseButton.style.display = 'inline-flex';
  }

  setHints() {
    const hintsElement = $(DOM_IDS.HHINTS);
    if (!hintsElement) return;
    hintsElement.innerHTML = '';
    hintsElement.style.display = 'none';
  }
}
