/* ================================================================
   NODE WARS v3 — Entry Point

   Bootstraps the game:
     1. Load saved progress + settings
     2. Build DOM event listeners (buttons, language, settings)
     3. Create Game instance
     4. Start AudioContext on first user gesture
     5. Reveal UI (fade out boot screen)
   ================================================================ */

import { STATE }    from './core/GameState.js';
import { T, setLang, applyLang, toggleLang, curLang } from './localization/i18n.js';
import { Music }    from './audio/Music.js';
import { SoundEffects as SFX } from './audio/SoundEffects.js';
import { Game }     from './core/Game.js';
import { DOM_IDS }  from './ui/DomIds.js';
import {
  showScr, fadeGo, showToast, buildWorldTabs, buildStory, buildCredits,
  syncWorldTab, refreshSettingsUI, updateDebugInfo, Screens, endLevel,
} from './ui/ScreenController.js';
import { LEVELS } from './config/gameConfig.js';

function $id(id) { return document.getElementById(id); }

/* ── Bootstrap ── */
STATE.load();
STATE.loadSettings();
/* Apply persisted display settings immediately (before first render) */
(function() {
  const id = STATE.settings.fontId || 'exo2';
  document.documentElement.dataset.font = id;
  document.documentElement.style.setProperty('--ui-zoom', STATE.settings.textZoom ?? 1.0);
  document.documentElement.dataset.theme = STATE.settings.theme || 'AURORA';
})();

let game;

function initGame() {
  const canvas = $id(DOM_IDS.CANVAS);
  if (!canvas) { console.error('canvas element missing'); return; }

  /* Restore language */
  const savedLang = STATE.curLang;
  if (savedLang === 'en' || savedLang === 'pt') setLang(savedLang);
  else setLang('pt');

  try {
    game = new Game(canvas);
    Screens.setGame(game);
    wireButtons();
    applyLang();
  } catch (err) {
    console.error('Game init error:', err);
    document.body.style.cssText = 'background:#04070f;color:#00e5ff;font-family:monospace;padding:20px;';
    document.body.innerHTML = '<h2 style="color:#ff3d5a">NODE WARS — Init Error</h2><pre>' + err + '</pre>';
    return;
  }

  /* Start audio on first gesture */
  let _audioStarted = false;
  function _startAudio() {
    if (_audioStarted) return;
    _audioStarted = true;
    Music.initOnGesture();
    Music.playMenu();
  }
  document.addEventListener('click',      _startAudio, { once:true, passive:true });
  document.addEventListener('touchstart', _startAudio, { once:true, passive:true });
  document.addEventListener('keydown',    _startAudio, { once:true, passive:true });

  /* Reveal game after first paint */
  const fade = $id(DOM_IDS.FADE);
  const boot = $id(DOM_IDS.BOOTMSG);
  const reveal = () => {
    if (boot) boot.style.display = 'none';
    fade.classList.remove('in');
    showScr('menu');
    _startAudio();
  };
  requestAnimationFrame(() => requestAnimationFrame(reveal));
}

/* ── Wire all button listeners ── */
function wireButtons() {
  /* Main menu */
  $id(DOM_IDS.BTN_PLAY)?.addEventListener('click', () => {
    Music.menuClick();
    fadeGo(() => { syncWorldTab(); buildWorldTabs(); showScr('levels'); });
  });
  $id(DOM_IDS.BTN_STORY)?.addEventListener('click', () => { buildStory(); fadeGo(() => showScr('story')); });
  $id(DOM_IDS.BTN_SETTINGS)?.addEventListener('click', () => {
    Music.menuClick();
    refreshSettingsUI();
    refreshDisplayUI();
    if (STATE.settings.debug) updateDebugInfo();
    fadeGo(() => showScr('settings'));
  });
  $id(DOM_IDS.BTN_CREDITS)?.addEventListener('click', () => {
    Music.menuClick();
    buildCredits();
    fadeGo(() => showScr('credits'));
  });

  /* Settings */
  $id(DOM_IDS.BTN_SETTINGS_BACK)?.addEventListener('click', () => {
    Music.menuClick(); Music.playMenu(); fadeGo(() => showScr('menu'));
  });
  $id(DOM_IDS.BTN_CREDITS_BACK)?.addEventListener('click', () => {
    Music.menuClick(); fadeGo(() => showScr('menu'));
  });
  ['w2','w3','debug','sound','music','showFps'].forEach(key => {
    const id  = 'tog' + key.charAt(0).toUpperCase() + key.slice(1);
    $id(id)?.addEventListener('click', () => toggleSetting(key));
  });
  $id('togGraphicsMode')?.addEventListener('click', () => cycleGraphicsMode());
  $id('togTheme')?.addEventListener('click', () => {
    cycleTheme();
  });
  $id(DOM_IDS.BTN_COPY_DEBUG)?.addEventListener('click', async () => {
    const snapshot = buildDebugSnapshot();
    try {
      await navigator.clipboard.writeText(snapshot);
      showToast(curLang() === 'pt' ? 'Snapshot de debug copiado' : 'Debug snapshot copied');
    } catch {
      showToast(snapshot);
    }
  });
  $id(DOM_IDS.BTN_RESET_PROG)?.addEventListener('click', () => {
    if (!confirm('Reset all progress?')) return;
    STATE.resetProgress();
    showToast('Progress reset');
    refreshSettingsUI();
  });

  /* Story */
  $id(DOM_IDS.BTN_STORY_BACK)?.addEventListener('click',  () => fadeGo(() => { syncWorldTab(); buildWorldTabs(); showScr('levels'); }));
  $id(DOM_IDS.BTN_STORY_BACK2)?.addEventListener('click', () => fadeGo(() => showScr('menu')));

  /* Level select */
  $id(DOM_IDS.BTN_BACK)?.addEventListener('click', () => { Music.menuClick(); Music.playMenu(); fadeGo(() => showScr('menu')); });

  /* Result */
  $id(DOM_IDS.BTN_RL)?.addEventListener('click', () => fadeGo(() => { syncWorldTab(); buildWorldTabs(); showScr('levels'); }));
  $id(DOM_IDS.BTN_RR)?.addEventListener('click', () => fadeGo(() => { showScr(null); game.loadLevel(STATE.curLvl); }));
  $id(DOM_IDS.BTN_RN)?.addEventListener('click', () => {
    if (STATE.curLvl < LEVELS.length - 1) {
      STATE.setCurrentLevel(STATE.curLvl + 1);
      STATE.save();
      fadeGo(() => { showScr(null); game.loadLevel(STATE.curLvl); });
    }
  });

  /* Pause */
  $id(DOM_IDS.BTN_RESUME)?.addEventListener('click', () => {
    game.paused = false;
    showScr(null);
    const w = game.cfg ? game.cfg.worldId || 1 : 1;
    if (w === 2) Music.playVoid();
    else if (w === 3) Music.playNexus();
    else Music.playGenesis();
  });
  $id(DOM_IDS.BTN_PRL)?.addEventListener('click', () => fadeGo(() => { syncWorldTab(); buildWorldTabs(); showScr('levels'); }));
  $id(DOM_IDS.BTN_PRR)?.addEventListener('click', () => fadeGo(() => { game.paused = false; showScr(null); game.loadLevel(STATE.curLvl); }));
  $id(DOM_IDS.BTN_PSKIP)?.addEventListener('click', () => {
    if (STATE.canSkipLevel(game.cfg) && STATE.curLvl < LEVELS.length - 1) {
      STATE.completed = Math.max(STATE.completed, STATE.curLvl);
      STATE.consumeLevelSkip(STATE.curLvl);
      STATE.setCurrentLevel(STATE.curLvl + 1);
      STATE.save();
      fadeGo(() => { game.paused = false; showScr(null); game.loadLevel(STATE.curLvl); });
    } else {
      showToast(
        game.cfg?.isBoss
          ? T('skipLockedBoss')
          : STATE.curLvl >= LEVELS.length - 1
            ? T('alreadyFinal')
            : T('skipLockedProgress', Math.max(0, 5 - STATE.getLevelFailStreak(STATE.curLvl))),
      );
    }
  });
  $id(DOM_IDS.BTN_PMENU)?.addEventListener('click', () => {
    Music.menuClick(); Music.playMenu(); fadeGo(() => showScr('menu'));
  });

  /* Language buttons (now in settings) */
  $id(DOM_IDS.BTN_LANG_PT)?.addEventListener('click', () => setLang('pt'));
  $id(DOM_IDS.BTN_LANG_EN)?.addEventListener('click', () => setLang('en'));

  /* Font cycle */
  $id(DOM_IDS.BTN_FONT_CYCLE)?.addEventListener('click', () => {
    const fonts = ['orbitron', 'techno', 'rajdhani', 'exo2'];
    const idx   = fonts.indexOf(STATE.settings.fontId || 'exo2');
    STATE.settings.fontId = fonts[(idx + 1) % fonts.length];
    STATE.saveSettings();
    applyFont();
    refreshDisplayUI();
  });

  /* Text zoom */
  const ZOOM_STEPS = [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
  function _zoomIdx() {
    const cur = STATE.settings.textZoom ?? 1.0;
    return ZOOM_STEPS.reduce((best, v, i) =>
      Math.abs(v - cur) < Math.abs(ZOOM_STEPS[best] - cur) ? i : best, 0);
  }
  $id(DOM_IDS.BTN_ZOOM_DEC)?.addEventListener('click', () => {
    STATE.settings.textZoom = ZOOM_STEPS[Math.max(0, _zoomIdx() - 1)];
    STATE.saveSettings(); applyZoom(); refreshDisplayUI();
  });
  $id(DOM_IDS.BTN_ZOOM_INC)?.addEventListener('click', () => {
    STATE.settings.textZoom = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, _zoomIdx() + 1)];
    STATE.saveSettings(); applyZoom(); refreshDisplayUI();
  });

  /* Hover / click sound for menu elements */
  document.querySelectorAll('.btn,.btn.sec,.wtab,.stoggle,.lb2').forEach(el => {
    el.addEventListener('mouseenter', () => Music.menuHover(), { passive: true });
    el.addEventListener('touchstart', () => Music.menuHover(), { passive: true });
  });
  document.querySelectorAll('.btn,.btn.sec').forEach(el => {
    el.addEventListener('click', () => Music.menuClick());
  });

  /* EventBus → audio wiring */
  wireAudioBus();
}

function wireAudioBus() {
  const { bus } = (() => {
    /* Inline import — bus is a singleton, already constructed */
    return import('./core/EventBus.js').then(m => ({ bus: m.bus }));
  })();
  /* Async wire after module resolves */
  import('./core/EventBus.js').then(({ bus: b }) => {
    b.on('node:levelup',       ()  => SFX.levelUp());
    b.on('node:capture',       ()  => SFX.capture());
    b.on('cell:killed_enemy',  ()  => SFX.killEnemy());
    b.on('cell:lost',          ()  => SFX.enemyAlarm());
    b.on('cell:shieldHit',     ()  => SFX.shieldHit());
    b.on('tent:connect',       ()  => SFX.tentConnect());
    b.on('hazard:drain',       ()  => SFX.hazardDrain());
    b.on('relay:capture',      ()  => SFX.relayCapture());
    b.on('pulsar:fire',        ()  => SFX.pulsarFire());
    b.on('pulsar:charge',      ()  => SFX.pulsarCharge());
    b.on('autoretract',        ()  => SFX.autoRetract());
    b.on('frenzy:start',       ()  => SFX.frenzy());
    b.on('frenzy:end',         ()  => SFX.frenzyEnd());
    b.on('signal:capture',     ()  => {
      showToast('📡 ' + (curLang() === 'pt' ? 'TORRE DE SINAL — VARREDURA TOTAL 8s' : 'SIGNAL TOWER — FULL SCAN 8s'));
      SFX.capture();
    });
    b.on('ai:defensive',       ()  => showToast('🛡 ' + (curLang() === 'pt' ? 'IA RECUANDO' : 'AI RETREATING')));
    b.on('node:owner_change',  (n, prev) => {
      if (n.owner === 1)  { /* captured */ }
      if (prev === 1)     SFX.enemyAlarm();
    });
  });
}

/* ── Settings toggle ── */
function toggleSetting(key) {
  STATE.settings[key] = !STATE.settings[key];
  STATE.saveSettings();
  refreshSettingsUI();

  if (key === 'debug') {
    const row = $id(DOM_IDS.DEBUG_RESET_ROW);
    const copyRow = $id(DOM_IDS.DEBUG_COPY_ROW);
    const panel = $id(DOM_IDS.DEBUG_INFO_PANEL);
    if (row)  row.style.display  = STATE.settings.debug ? '' : 'none';
    if (copyRow) copyRow.style.display = STATE.settings.debug ? '' : 'none';
    if (panel) panel.style.display = STATE.settings.debug ? '' : 'none';
    if (STATE.settings.debug) updateDebugInfo();
  }

  if (key === 'sound' || key === 'music') {
    if (!STATE.settings.music || !STATE.settings.sound) {
      Music.fadeOut(0.5);
    } else {
      /* Both sound and music are now ON — resume without restarting track */
      if (Music.isPlaying()) Music.fadeIn(1.0);
      else Music.playMenu();
    }
  }

  if (key === 'w2' || key === 'w3' || key === 'debug') {
    Music.menuClick();
    buildWorldTabs();
  }
}

function cycleGraphicsMode() {
  STATE.settings.graphicsMode = STATE.settings.graphicsMode === 'high' ? 'low' : 'high';
  STATE.settings.highGraphics = STATE.settings.graphicsMode === 'high';
  STATE.saveSettings();
  refreshSettingsUI();
  Music.menuClick();
}

const THEME_ORDER = ['AURORA', 'SOLAR', 'GLACIER'];

function applyTheme() {
  const theme = STATE.settings.theme || 'AURORA';
  document.documentElement.dataset.theme = theme;
}

function cycleTheme() {
  const currentTheme = STATE.settings.theme || 'AURORA';
  const themeIndex = THEME_ORDER.indexOf(currentTheme);
  STATE.settings.theme = THEME_ORDER[(themeIndex + 1 + THEME_ORDER.length) % THEME_ORDER.length];
  STATE.saveSettings();
  applyTheme();
  refreshSettingsUI();
  Music.menuClick();
}

function buildDebugSnapshot() {
  const renderStats = game?.renderStats;
  return [
    `theme=${STATE.settings.theme}`,
    `graphics=${STATE.settings.graphicsMode}`,
    `font=${STATE.settings.fontId}`,
    `zoom=${STATE.settings.textZoom}`,
    `fps=${STATE.settings.showFps}`,
    `lang=${STATE.curLang}`,
    `completed=${STATE.completed}`,
    `curLvl=${STATE.curLvl}`,
    `sound=${STATE.settings.sound}`,
    `music=${STATE.settings.music}`,
    `debug=${STATE.settings.debug}`,
    ...(renderStats ? [
      `render_frame_ms=${renderStats.frameMs.toFixed(2)}`,
      `render_avg_ms=${renderStats.avgFrameMs.toFixed(2)}`,
      `render_nodes=${renderStats.nodeCount}`,
      `render_tents=${renderStats.tentCount}`,
      `render_hazards=${renderStats.hazardCount}`,
      `render_pulsars=${renderStats.pulsarCount}`,
      `render_orbs=${renderStats.orbCount}`,
      `render_free_orbs=${renderStats.freeOrbCount}`,
      `render_visual_events=${renderStats.visualEventCount}`,
    ] : []),
  ].join('\n');
}

/* ── Font / Zoom helpers ── */
const FONT_LABELS = {
  orbitron: 'ORBITRON',
  techno:   'SHARE TECH',
  rajdhani: 'RAJDHANI',
  exo2:     'EXO 2',
};

function applyFont() {
  const id = STATE.settings.fontId || 'exo2';
  document.documentElement.dataset.font = id;
}

function applyZoom() {
  const zoom = STATE.settings.textZoom ?? 1.0;
  document.documentElement.style.setProperty('--ui-zoom', zoom);
}

function refreshDisplayUI() {
  const fontBtn = $id(DOM_IDS.BTN_FONT_CYCLE);
  if (fontBtn) fontBtn.textContent = FONT_LABELS[STATE.settings.fontId || 'exo2'] || 'EXO 2';
  const zoomEl = $id(DOM_IDS.ZOOM_DISPLAY);
  if (zoomEl) zoomEl.textContent = Math.round((STATE.settings.textZoom ?? 1.0) * 100) + '%';
}

/* ── Boot ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
