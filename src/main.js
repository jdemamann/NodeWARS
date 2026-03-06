/* ================================================================
   NODE WARS v3 — Entry Point

   Bootstraps the game:
     1. Load saved progress + settings
     2. Build DOM event listeners (buttons, language, settings)
     3. Create Game instance
     4. Start AudioContext on first user gesture
     5. Reveal UI (fade out boot screen)
   ================================================================ */

import { STATE }    from './GameState.js';
import { T, setLang, applyLang, toggleLang, curLang } from './i18n.js';
import { Music }    from './audio/Music.js';
import { Audio as SFX } from './audio/Audio.js';
import { Game }     from './Game.js';
import { IDS }      from './ui/IDS.js';
import {
  showScr, fadeGo, showToast, buildWorldTabs, buildStory, buildCredits,
  syncWorldTab, refreshSettingsUI, updateDebugInfo, Screens, endLevel,
} from './ui/Screens.js';
import { LEVELS } from './constants.js';

function $id(id) { return document.getElementById(id); }

/* ── Bootstrap ── */
STATE.load();
STATE.loadSettings();
/* Apply persisted display settings immediately (before first render) */
(function() {
  const id = STATE.settings.fontId || 'orbitron';
  document.documentElement.dataset.font = id;
  document.documentElement.style.setProperty('--ui-zoom', STATE.settings.textZoom ?? 1.0);
})();

let game;

function initGame() {
  const canvas = $id(IDS.CANVAS);
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
  const fade = $id(IDS.FADE);
  const boot = $id(IDS.BOOTMSG);
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
  $id(IDS.BTN_PLAY)?.addEventListener('click', () => {
    Music.menuClick();
    fadeGo(() => { syncWorldTab(); buildWorldTabs(); showScr('levels'); });
  });
  $id(IDS.BTN_STORY)?.addEventListener('click', () => { buildStory(); fadeGo(() => showScr('story')); });
  $id(IDS.BTN_SETTINGS)?.addEventListener('click', () => {
    Music.menuClick();
    refreshSettingsUI();
    refreshDisplayUI();
    if (STATE.settings.debug) updateDebugInfo();
    fadeGo(() => showScr('settings'));
  });
  $id(IDS.BTN_CREDITS)?.addEventListener('click', () => {
    Music.menuClick();
    buildCredits();
    fadeGo(() => showScr('credits'));
  });

  /* Settings */
  $id(IDS.BTN_SETTINGS_BACK)?.addEventListener('click', () => {
    Music.menuClick(); Music.playMenu(); fadeGo(() => showScr('menu'));
  });
  $id(IDS.BTN_CREDITS_BACK)?.addEventListener('click', () => {
    Music.menuClick(); fadeGo(() => showScr('menu'));
  });
  ['w2','w3','debug','sound','music'].forEach(key => {
    const id  = 'tog' + key.charAt(0).toUpperCase() + key.slice(1);
    $id(id)?.addEventListener('click', () => toggleSetting(key));
  });
  $id(IDS.BTN_RESET_PROG)?.addEventListener('click', () => {
    if (!confirm('Reset all progress?')) return;
    STATE.resetProgress();
    showToast('Progress reset');
    refreshSettingsUI();
  });

  /* Story */
  $id(IDS.BTN_STORY_BACK)?.addEventListener('click',  () => fadeGo(() => { syncWorldTab(); buildWorldTabs(); showScr('levels'); }));
  $id(IDS.BTN_STORY_BACK2)?.addEventListener('click', () => fadeGo(() => showScr('menu')));

  /* Level select */
  $id(IDS.BTN_BACK)?.addEventListener('click', () => { Music.menuClick(); Music.playMenu(); fadeGo(() => showScr('menu')); });

  /* Result */
  $id(IDS.BTN_RL)?.addEventListener('click', () => fadeGo(() => { syncWorldTab(); buildWorldTabs(); showScr('levels'); }));
  $id(IDS.BTN_RR)?.addEventListener('click', () => fadeGo(() => { showScr(null); game.loadLevel(STATE.curLvl); }));
  $id(IDS.BTN_RN)?.addEventListener('click', () => {
    if (STATE.curLvl < LEVELS.length - 1) {
      STATE.curLvl++;
      fadeGo(() => { showScr(null); game.loadLevel(STATE.curLvl); });
    }
  });

  /* Pause */
  $id(IDS.BTN_RESUME)?.addEventListener('click', () => {
    game.paused = false;
    showScr(null);
    const w = game.cfg ? game.cfg.w || 1 : 1;
    if (w === 2) Music.playVoid();
    else if (w === 3) Music.playNexus();
    else Music.playGenesis();
  });
  $id(IDS.BTN_PRL)?.addEventListener('click', () => fadeGo(() => { game.paused = false; buildWorldTabs(); showScr('levels'); }));
  $id(IDS.BTN_PRR)?.addEventListener('click', () => fadeGo(() => { game.paused = false; showScr(null); game.loadLevel(STATE.curLvl); }));
  $id(IDS.BTN_PSKIP)?.addEventListener('click', () => {
    if (STATE.curLvl < LEVELS.length - 1) {
      STATE.completed = Math.max(STATE.completed, STATE.curLvl);
      STATE.save();
      STATE.curLvl++;
      fadeGo(() => { game.paused = false; showScr(null); game.loadLevel(STATE.curLvl); });
    } else showToast(T('alreadyFinal'));
  });
  $id(IDS.BTN_PMENU)?.addEventListener('click', () => {
    Music.menuClick(); Music.playMenu(); fadeGo(() => { game.paused = false; showScr('menu'); });
  });

  /* Language buttons (now in settings) */
  $id(IDS.BTN_LANG_PT)?.addEventListener('click', () => setLang('pt'));
  $id(IDS.BTN_LANG_EN)?.addEventListener('click', () => setLang('en'));

  /* Font cycle */
  $id(IDS.BTN_FONT_CYCLE)?.addEventListener('click', () => {
    const fonts = ['orbitron', 'techno', 'rajdhani', 'exo2'];
    const idx   = fonts.indexOf(STATE.settings.fontId || 'orbitron');
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
  $id(IDS.BTN_ZOOM_DEC)?.addEventListener('click', () => {
    STATE.settings.textZoom = ZOOM_STEPS[Math.max(0, _zoomIdx() - 1)];
    STATE.saveSettings(); applyZoom(); refreshDisplayUI();
  });
  $id(IDS.BTN_ZOOM_INC)?.addEventListener('click', () => {
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
    return import('./EventBus.js').then(m => ({ bus: m.bus }));
  })();
  /* Async wire after module resolves */
  import('./EventBus.js').then(({ bus: b }) => {
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
    const row = $id(IDS.DEBUG_RESET_ROW);
    const panel = $id(IDS.DEBUG_INFO_PANEL);
    if (row)  row.style.display  = STATE.settings.debug ? '' : 'none';
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

/* ── Font / Zoom helpers ── */
const FONT_LABELS = {
  orbitron: 'ORBITRON',
  techno:   'SHARE TECH',
  rajdhani: 'RAJDHANI',
  exo2:     'EXO 2',
};

function applyFont() {
  const id = STATE.settings.fontId || 'orbitron';
  document.documentElement.dataset.font = id;
}

function applyZoom() {
  const zoom = STATE.settings.textZoom ?? 1.0;
  document.documentElement.style.setProperty('--ui-zoom', zoom);
}

function refreshDisplayUI() {
  const fontBtn = $id(IDS.BTN_FONT_CYCLE);
  if (fontBtn) fontBtn.textContent = FONT_LABELS[STATE.settings.fontId || 'orbitron'] || 'ORBITRON';
  const zoomEl = $id(IDS.ZOOM_DISPLAY);
  if (zoomEl) zoomEl.textContent = Math.round((STATE.settings.textZoom ?? 1.0) * 100) + '%';
}

/* ── Boot ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
