/* ================================================================
   NODE WARS v3 — Screen Manager

   showScr / fadeGo / showToast / buildWorldTabs / buildGrid /
   buildStory / endLevel / showWorldBanner

   Depends on: STATE, i18n (T), Audio, Music, LEVELS, WORLDS
   ================================================================ */

import { DOM_IDS }       from './DomIds.js';
import { LEVELS, WORLDS, starsFor, worldOf } from '../config/gameConfig.js';
import { T, setLang, applyLang, curLang }    from '../localization/i18n.js';
import { STATE }         from '../core/GameState.js';
import { Music }         from '../audio/Music.js';
import { SoundEffects as SFX } from '../audio/SoundEffects.js';
import { getLevelSelectWorldMeta, getLevelGridWorldAccent, getWorldBannerMeta } from './screenWorldMeta.js';
import { buildLevelMechanicBadge, buildPurpleEnemyBadge } from './levelSelectView.js';
import { buildResultInfoMarkup } from './resultScreenView.js';

function $(id) { return document.getElementById(id); }

/* ── Screen keys → DOM IDs ── */
const SCR = {
  menu:     DOM_IDS.SCREEN_MENU,
  levels:   DOM_IDS.SCREEN_LEVELS,
  story:    DOM_IDS.SCREEN_STORY,
  result:   DOM_IDS.SCREEN_RESULT,
  pause:    DOM_IDS.SCREEN_PAUSE,
  settings: DOM_IDS.SCREEN_SETTINGS,
  credits:  DOM_IDS.SCREEN_CREDITS,
};

/* Active world tab in the level-select screen */
let _activeWorldTab = STATE.getActiveWorldTab();

/* ── Core screen helpers ── */
export function showScr(name) {
  Object.values(SCR).forEach(id => {
    const el = $(id);
    if (el) el.classList.add('off');
  });
  if (name && SCR[name]) $(SCR[name]).classList.remove('off');
}

let _fadeTmr = null;
export function fadeGo(cb) {
  const fadeElement = $(DOM_IDS.FADE);
  fadeElement.classList.add('in');
  if (_fadeTmr) clearTimeout(_fadeTmr);
  _fadeTmr = setTimeout(() => { cb(); fadeElement.classList.remove('in'); }, 300);
}

let _toastTmr = null;
export function showToast(msg) {
  const toastElement = $(DOM_IDS.TOAST);
  toastElement.textContent = msg;
  toastElement.classList.add('on');
  if (_toastTmr) clearTimeout(_toastTmr);
  _toastTmr = setTimeout(() => toastElement.classList.remove('on'), 2800);
}

function getStoryChapterMeta(chapterTitle) {
  if (!chapterTitle) return { icon: '◈', accentClass: 'story-accent-prologue' };
  if (chapterTitle.includes('WORLD 1') || chapterTitle.includes('MUNDO 1')) return { icon: '◈', accentClass: 'story-accent-genesis' };
  if (chapterTitle.includes('WORLD 2') || chapterTitle.includes('MUNDO 2') || chapterTitle.includes('VOID') || chapterTitle.includes('VAZIO')) return { icon: '⊗', accentClass: 'story-accent-void' };
  if (chapterTitle.includes('WORLD 3') || chapterTitle.includes('MUNDO 3') || chapterTitle.includes('NEXUS')) return { icon: '⚡', accentClass: 'story-accent-nexus' };
  if (chapterTitle.includes('EPILOGUE') || chapterTitle.includes('EPÍLOGO')) return { icon: '✦', accentClass: 'story-accent-epilogue' };
  return { icon: '◈', accentClass: 'story-accent-prologue' };
}

/* ── Level-select: world tabs + grid ── */
export function syncWorldTab() {
  const currentLevelConfig = LEVELS.find(levelConfig => levelConfig.id === STATE.curLvl);
  if (!currentLevelConfig) return;
  const currentWorldId = currentLevelConfig.worldId || 1;
  _activeWorldTab = currentWorldId === 0 ? 0 : currentWorldId;
  if (_activeWorldTab === 2 && !STATE.settings.w2 && !STATE.settings.debug) _activeWorldTab = 1;
  if (_activeWorldTab === 3 && !STATE.settings.w3 && !STATE.settings.debug) _activeWorldTab = 1;
  STATE.setActiveWorldTab(_activeWorldTab);
}

export function buildWorldTabs() {
  const tabs = $(DOM_IDS.WORLD_TABS);
  const grid = $(DOM_IDS.LGRID);
  if (!tabs || !grid) return;

  const lang = curLang();
  const worldMetaById = getLevelSelectWorldMeta(lang);

  const w2ok = STATE.settings.w2 || STATE.settings.debug;
  const w3ok = STATE.settings.w3 || STATE.settings.debug;

  tabs.innerHTML = '';
  [0,1,2,3].forEach(w => {
    if (w === 2 && !w2ok) return;
    if (w === 3 && !w3ok) return;
    const meta = worldMetaById[w];
    const tab  = document.createElement('button');
    tab.className = 'wtab' + (w === _activeWorldTab ? ' active' : '');
    tab.style.setProperty('--wtc', meta.col);
    tab.innerHTML = w === 0
      ? '◈ TUTORIAL'
      : `${meta.icon} W${w}: ${meta.name}`;
    tab.addEventListener('click', () => {
      Music.tabSwitch();
      _activeWorldTab = w;
      STATE.setActiveWorldTab(w);
      buildWorldTabs();
    });
    tabs.appendChild(tab);
  });

  const descEl = $(DOM_IDS.WORLD_DESC);
  if (descEl) {
    const m = worldMetaById[_activeWorldTab] || {};
    descEl.textContent  = m.sub || '';
    descEl.style.color  = m.col
      ? m.col.replace(')', ',0.45)').replace('rgb', 'rgba')
      : 'rgba(255,255,255,0.3)';
  }

  buildGrid(_activeWorldTab);
}

export function buildGrid(worldFilter = _activeWorldTab) {
  const levelGridElement = $(DOM_IDS.LGRID);
  levelGridElement.innerHTML = '';

  if (worldFilter === 0) {
    const tutorialLevelConfig = LEVELS[0];
    const tutorialButton = _makeLvBtn(tutorialLevelConfig, 0, '#00ff9d', false, 0 <= STATE.completed, !(0 <= STATE.completed), false, true);
    levelGridElement.appendChild(tutorialButton);
    return;
  }

  const levelsForWorld = LEVELS.filter(lv => lv.worldId === worldFilter);
  const worldAccent = getLevelGridWorldAccent(worldFilter);
  const w2ok= STATE.settings.w2 || STATE.settings.debug;
  const w3ok= STATE.settings.w3 || STATE.settings.debug;

  levelsForWorld.forEach(levelConfig => {
    const phaseNum   = levelConfig.id;
    const worldId    = levelConfig.worldId || 1;
    const isDone     = phaseNum <= STATE.completed;
    const isTutorialEntry = !!levelConfig.isTutorial;
    const worldLocked= (worldId === 2 && !w2ok) || (worldId === 3 && !w3ok);
    const isNext     = phaseNum === STATE.completed + 1 ||
                       (isTutorialEntry && !worldLocked && !isDone && phaseNum > STATE.completed);
    const isLocked   = STATE.settings.debug ? false
                     : worldLocked          ? true
                     : isTutorialEntry      ? false
                     : phaseNum > STATE.completed + 1;
    const levelButton = _makeLvBtn(levelConfig, phaseNum, worldAccent.col, isLocked, isDone, isNext, worldLocked, levelConfig.isTutorial);
    levelGridElement.appendChild(levelButton);
  });
}

function _makeLvBtn(levelConfig, phaseNum, accentColor, isLocked, isDone, isNext, worldLocked, isTutorialLevel) {
  const btn = document.createElement('div');
  let className   = 'lb2';
  if (isLocked)     className += ' lk';
  else if (isDone)  className += ' dn';
  else if (isNext)  className += ' nxt';
  if (phaseNum === STATE.curLvl && !isLocked) className += ' cur';
  btn.className = className;
  if (!isLocked) btn.style.borderColor = accentColor + '40';

  const diff = Math.ceil(((phaseNum - 1) % 10 + 1) / 2) || 1;
  const dots = Array.from({ length: 5 }, (_, d) =>
    '<span' + (d < diff ? ' class="lit"' : '') + '></span>'
  ).join('');

  const score       = STATE.scores[phaseNum];
  const starCount   = starsFor(score);
  const starHtml = isDone
    ? '<div class="lstar">' +
        [0,1,2].map(j =>
          '<span class="s' + (j < starCount ? ' on' : '') +
          '" data-star-color="' + (j < starCount ? accentColor : 'dim') + '">&#9733;</span>'
        ).join('') +
      '</div>'
    : '';

  const badge = isDone
    ? starHtml + (score != null ? '<div class="lb-score" data-score-color="' + accentColor + '">' + score + '</div>' : '')
    : worldLocked
      ? '<div class="lck lck-muted">⚙</div><div class="lb-meta lb-meta-muted">SETTINGS</div>'
      : isNext
        ? '<div class="lck lck-next">▶</div>'
        : '<div class="lck">🔒</div>';

  const mechanicBadge = buildLevelMechanicBadge(levelConfig);
  const purpleBadge = buildPurpleEnemyBadge(levelConfig);

  const idLabel = isTutorialLevel ? 'TUT' : String(phaseNum).padStart(2, '0');
  btn.innerHTML = '<div class="ln" data-level-color="' + accentColor + '">' + idLabel + '</div>' +
                  '<div class="lna">' + levelConfig.name + '</div>' +
                  '<div class="ld">' + dots + '</div>' + badge + mechanicBadge + purpleBadge;
  const levelLabel = btn.querySelector('.ln');
  if (levelLabel) levelLabel.style.color = accentColor;
  btn.querySelectorAll('.lstar .s[data-star-color]').forEach(star => {
    const tone = star.getAttribute('data-star-color');
    star.style.color = tone === 'dim' ? 'rgba(255,255,255,0.15)' : tone;
  });
  const scoreLabel = btn.querySelector('.lb-score');
  if (scoreLabel) scoreLabel.style.color = accentColor;

  if (!isLocked) {
    btn.addEventListener('click', () => {
      STATE.setCurrentLevel(phaseNum);
      STATE.save();
      /* Game reference injected at init via Screens.setGame(game) */
      fadeGo(() => { showScr(null); Screens._game.loadLevel(phaseNum); });
    });
  }
  return btn;
}

/* ── Story screen ── */
export function buildStory() {
  const wrap = $(DOM_IDS.STORY_WRAP);
  wrap.innerHTML = '';
  const stor = T('stor');
  const title = document.createElement('div');
  title.className  = 'sttitle';
  title.textContent= T('storTitle');
  wrap.appendChild(title);

  const worldStrip = document.createElement('div');
  worldStrip.className = 'story-strip';
  worldStrip.innerHTML =
    '<div class="story-chip story-accent-genesis"><span class="story-chip-icon">◈</span><span>GENESIS</span></div>' +
    '<div class="story-chip story-accent-void"><span class="story-chip-icon">⊗</span><span>VOID</span></div>' +
    '<div class="story-chip story-accent-nexus"><span class="story-chip-icon">⚡</span><span>NEXUS PRIME</span></div>';
  wrap.appendChild(worldStrip);

  stor.forEach(item => {
    if (item.t) {
      const chapterMeta = getStoryChapterMeta(item.t);
      const chapterCard = document.createElement('div');
      chapterCard.className = 'stchap-card ' + chapterMeta.accentClass;
      chapterCard.innerHTML =
        '<div class="stchap-icon">' + chapterMeta.icon + '</div>' +
        '<div class="stchap">' + item.t + '</div>';
      wrap.appendChild(chapterCard);
    }
    if (item.p) { const d = document.createElement('div'); d.className = 'stpara'; d.innerHTML   = item.p; wrap.appendChild(d); }
    if (item.q) { const d = document.createElement('div'); d.className = 'stquote';d.textContent = item.q; wrap.appendChild(d); }
    if (item.t || item.p || item.q) { const hr = document.createElement('hr'); hr.className = 'stdivider'; wrap.appendChild(hr); }
  });
  const sb = $(DOM_IDS.BTN_STORY_BACK);
  if (sb) sb.textContent = T('enterGrid');
  const sb2 = $(DOM_IDS.BTN_STORY_BACK2);
  if (sb2) sb2.textContent = T('back');
}

/* ── World banner ── */
export function showWorldBanner(w, lang) {
  const m = getWorldBannerMeta(w, lang); if (!m) return;
  let ban = $(DOM_IDS.WORLD_BANNER);
  if (!ban) { ban = document.createElement('div'); ban.id = DOM_IDS.WORLD_BANNER; document.body.appendChild(ban); }
  ban.innerHTML = `<div class="wb-inner">
    <div class="wb-icon">${m.icon}</div>
    <div class="wb-world">WORLD ${w}</div>
    <div class="wb-name">${m.name}</div>
    <div class="wb-sub">${m.subText}</div>
    ${m.mechanicText ? '<div class="wb-mech">' + m.mechanicText + '</div>' : ''}
  </div>`;
  const inner = ban.querySelector('.wb-inner');
  if (inner) {
    inner.style.setProperty('--wb-col', m.col);
    inner.style.setProperty('--wb-border', m.col + '22');
  }
  ban.className = 'wb-show';
  setTimeout(() => { ban.className = 'wb-hide'; }, 4000);
}

/* ── Result / end-level screen ── */
export function endLevel(win, game) {
  const levelConfig = game.cfg;
  const score = win ? game.calcScore() : 0;
  const levelId = levelConfig.id;

  if (win && levelId >= 1) {
    STATE.completed = Math.max(STATE.completed, levelId);
    if (score != null && (STATE.scores[levelId] === null || score > STATE.scores[levelId])) STATE.scores[levelId] = score;
    STATE.save();
    if ([10, 21, 32].includes(levelId)) setTimeout(() => SFX.worldUnlock(), 600);
  }

  if (win) { SFX.win(); setTimeout(() => Music.playMenu(), 1500); }
  else     { SFX.lose(); setTimeout(() => Music.playMenu(), 1200); }

  setTimeout(() => {
    const rtitle = $(DOM_IDS.RTITLE);
    rtitle.textContent = win ? T('phaseClear') : T('annihilated');
    rtitle.className   = 'rt ' + (win ? 'win' : 'lose');

    const nextName = STATE.curLvl < LEVELS.length - 1 ? LEVELS[STATE.curLvl + 1].name : '';
    $(DOM_IDS.RSUB).textContent = win
      ? levelConfig.name + ' — ' + T('phaseOf', levelConfig.id, LEVELS.length - 1) + ' ' +
        (STATE.curLvl < LEVELS.length - 1 ? T('nextPhase', nextName) : T('allComplete'))
      : levelConfig.name + ' — ' + T('eliminated', levelConfig.id, 30);

    /* Score display */
    const scoreElement = $(DOM_IDS.RSCORE);
    if (scoreElement && win && score != null && !levelConfig.isTutorial) {
      scoreElement.style.display = 'block';
      const previousBestScore = STATE.scores[levelId];
      const isPersonalBest = previousBestScore === score;
      const parScore = levelConfig.par || 120;
      const elapsedSeconds = Math.floor(game.scoreTime);
      const parDiff   = elapsedSeconds - parScore;
      const parLabel  = parDiff <= 0
        ? '<span class="result-good">' + parDiff + 's vs par</span>'
        : '<span class="result-bad">+' + parDiff + 's vs par</span>';
      const starCount = starsFor(score);
      scoreElement.innerHTML =
        '<div class="sstar" id="_rstars">' + [0,1,2].map(j => '<span id="_rs' + j + '" class="s">&#9733;</span>').join('') + '</div>' +
        '<div class="snum result-fade-in" id="_rscnum">' + score + '</div>' +
        '<div id="_rscpar" class="result-subline result-fade-in">' + parLabel + '</div>' +
        '<div id="_rscpb" class="result-subline result-subline-small result-fade-in">' +
          (isPersonalBest ? '&#9650; BEST' : previousBestScore != null ? 'BEST: ' + previousBestScore : '') + '</div>';
      for (let j = 0; j < 3; j++) {
        setTimeout(() => {
          const el = document.getElementById('_rs' + j); if (!el) return;
          if (j < starCount) {
            el.classList.add('on');
            el.style.transform = 'scale(1.7)'; el.style.transition = 'transform 0.22s ease-out';
            setTimeout(() => el.style.transform = 'scale(1)', 200);
            SFX.capture();
          }
        }, 280 + j * 340);
      }
      setTimeout(() => {
        const e1 = document.getElementById('_rscnum');
        const e2 = document.getElementById('_rscpar');
        const e3 = document.getElementById('_rscpb');
        if (e1) e1.style.opacity = '1';
        if (e2) e2.style.opacity = '1';
        if (e3) e3.style.opacity = '1';
      }, 280 + 3 * 340 + 120);
    } else if (scoreElement) scoreElement.style.display = 'none';

    $(DOM_IDS.RINFO).innerHTML = buildResultInfoMarkup(levelConfig, game, T, LEVELS.length - 1);

    const btnRN = $(DOM_IDS.BTN_RN);
    if (btnRN) btnRN.style.display = (win && STATE.curLvl < LEVELS.length - 1) ? '' : 'none';

    const tutbox = $(DOM_IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'none';
    const scoreHudElement = $(DOM_IDS.HSCORE);
    if (scoreHudElement) scoreHudElement.style.display = 'none';

    showScr('result');
    const dc = $(DOM_IDS.DC); if (dc) dc.classList.remove('on');

    $(DOM_IDS.BTN_RL).textContent = T('phases');
    $(DOM_IDS.BTN_RR).textContent = T('retry');
    if (win && STATE.curLvl < LEVELS.length - 1 && btnRN) btnRN.textContent = T('next');
  }, 500);
}

/* ── Settings UI ── */
export function refreshSettingsUI() {
  ['w2','w3','debug','sound','music','showFps'].forEach(k => {
    const id  = 'tog' + k.charAt(0).toUpperCase() + k.slice(1);
    const btn = $(id);
    if (!btn) return;
    btn.textContent = STATE.settings[k] ? 'ON' : 'OFF';
    btn.classList.toggle('on', STATE.settings[k]);
  });
  const graphicsBtn = $('togGraphicsMode');
  if (graphicsBtn) {
    const mode = STATE.settings.graphicsMode === 'high' ? 'HIGH' : 'LOW';
    graphicsBtn.textContent = mode;
    graphicsBtn.classList.toggle('on', mode === 'HIGH');
  }
  const themeBtn = $('togTheme');
  if (themeBtn) {
    const t = STATE.settings.theme || 'AURORA';
    themeBtn.textContent = t;
    themeBtn.classList.toggle('on', t !== 'GLACIER');
  }
  const debugResetRow = $(DOM_IDS.DEBUG_RESET_ROW);
  if (debugResetRow) debugResetRow.style.display = STATE.settings.debug ? '' : 'none';
  const debugCopyRow = $(DOM_IDS.DEBUG_COPY_ROW);
  if (debugCopyRow) debugCopyRow.style.display = STATE.settings.debug ? '' : 'none';
  const debugPanel = $(DOM_IDS.DEBUG_INFO_PANEL);
  if (debugPanel) debugPanel.style.display = STATE.settings.debug ? '' : 'none';
}

export function updateDebugInfo() {
  const el = $(DOM_IDS.DEBUG_INFO_TEXT); if (!el) return;
  const game = Screens._game;
  const renderStats = game?.renderStats;
  el.innerHTML = [
    'completed: ' + STATE.completed,
    'curLvl: '    + STATE.curLvl,
    'LEVELS: '    + LEVELS.length,
    'Scores: '    + STATE.scores.filter(s => s !== null).length + ' saved',
    'theme: '     + (STATE.settings.theme || 'AURORA'),
    'graphics: '  + (STATE.settings.graphicsMode || 'low'),
    'font: '      + (STATE.settings.fontId || 'exo2'),
    'showFps: '   + !!STATE.settings.showFps,
    ...(game ? [
      'runtime_fps: ' + Math.round(game.fps || 0),
      'nodes: ' + game.nodes.length,
      'tents: ' + game.tents.length,
      'world_events: ' + (game.visualEvents?.length || 0),
      ...(renderStats ? [
        `render_ms: ${renderStats.frameMs.toFixed(2)} (avg ${renderStats.avgFrameMs.toFixed(2)})`,
        `render_load: n${renderStats.nodeCount} t${renderStats.tentCount} h${renderStats.hazardCount} p${renderStats.pulsarCount}`,
        `particles: orb ${renderStats.orbCount} free ${renderStats.freeOrbCount}`,
        `graphics_mode: ${renderStats.graphicsMode}`,
      ] : []),
    ] : []),
  ].join('<br>');
}

/* ── Credits screen ── */
export function buildCredits() {
  const wrap = $(DOM_IDS.CRED_WRAP);
  if (!wrap) return;
  const pt = curLang() === 'pt';

  const sections = [
    {
      title: pt ? 'CRIAÇÃO' : 'CREATION',
      items: [
        { label: pt ? 'Direção, design e código' : 'Direction, design, and code', value: 'Jonis Alves Demamann' },
      ],
    },
    {
      title: pt ? 'PRODUÇÃO' : 'PRODUCTION',
      items: [
        { label: pt ? 'Render' : 'Render', value: 'HTML5 Canvas 2D' },
        { label: pt ? 'Áudio procedural' : 'Procedural audio', value: 'Web Audio API' },
        { label: pt ? 'Plataforma' : 'Platform', value: 'Vanilla JavaScript ES Modules' },
      ],
    },
    {
      title: pt ? 'CONTATO' : 'CONTACT',
      items: [
        { label: 'E-mail', value: 'jonis@outlook.com' },
      ],
    },
  ];

  let html = '<div class="cred-title">' + T('creditsTitle') + '</div>';
  html += '<div class="cred-sub">' + (pt ? 'INFORMAÇÃO ESSENCIAL' : 'ESSENTIAL INFORMATION') + '</div>';

  sections.forEach(sec => {
    html += '<div class="cred-block"><div class="cred-block-title">' + sec.title + '</div>';
    sec.items.forEach(item => {
      html += '<div class="cred-item"><b>' + item.label + '</b> — ' + item.value + '</div>';
    });
    html += '</div>';
  });

  html += '<div class="cred-sig">' +
    '<div class="cred-sig-name">Jonis Alves Demamann</div>' +
    '<div class="cred-sig-contact"><a href="mailto:jonis@outlook.com">jonis@outlook.com</a></div>' +
  '</div>';
  html += '<div class="cred-copy">© 2025 Jonis Alves Demamann · NODE WARS</div>';

  wrap.innerHTML = html;
}

/* ── Back-reference to game instance (injected from main.js) ── */
export const Screens = {
  _game: null,
  setGame(g) { this._game = g; },
};
