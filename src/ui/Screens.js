/* ================================================================
   NODE WARS v3 — Screen Manager

   showScr / fadeGo / showToast / buildWorldTabs / buildGrid /
   buildStory / endLevel / showWorldBanner

   Depends on: STATE, i18n (T), Audio, Music, LEVELS, WORLDS
   ================================================================ */

import { IDS }           from './IDS.js';
import { LEVELS, WORLDS, starsFor, worldOf } from '../constants.js';
import { T, setLang, applyLang, curLang }    from '../i18n.js';
import { STATE }         from '../GameState.js';
import { Music }         from '../audio/Music.js';
import { Audio as SFX }  from '../audio/Audio.js';

function $(id) { return document.getElementById(id); }

/* ── Screen keys → DOM IDs ── */
const SCR = {
  menu:     IDS.SCREEN_MENU,
  levels:   IDS.SCREEN_LEVELS,
  story:    IDS.SCREEN_STORY,
  result:   IDS.SCREEN_RESULT,
  pause:    IDS.SCREEN_PAUSE,
  settings: IDS.SCREEN_SETTINGS,
  credits:  IDS.SCREEN_CREDITS,
};

/* Active world tab in the level-select screen */
let _activeWorldTab = 1;

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
  const f = $(IDS.FADE);
  f.classList.add('in');
  if (_fadeTmr) clearTimeout(_fadeTmr);
  _fadeTmr = setTimeout(() => { cb(); f.classList.remove('in'); }, 300);
}

let _toastTmr = null;
export function showToast(msg) {
  const e = $(IDS.TOAST);
  e.textContent = msg;
  e.classList.add('on');
  if (_toastTmr) clearTimeout(_toastTmr);
  _toastTmr = setTimeout(() => e.classList.remove('on'), 2800);
}

/* ── Level-select: world tabs + grid ── */
export function syncWorldTab() {
  const lv = LEVELS.find(l => l.id === STATE.curLvl);
  if (!lv) return;
  const w = lv.w || 1;
  _activeWorldTab = w === 0 ? 0 : w;
  if (_activeWorldTab === 2 && !STATE.settings.w2 && !STATE.settings.debug) _activeWorldTab = 1;
  if (_activeWorldTab === 3 && !STATE.settings.w3 && !STATE.settings.debug) _activeWorldTab = 1;
}

export function buildWorldTabs() {
  const tabs = $(IDS.WORLD_TABS);
  const grid = $(IDS.LGRID);
  if (!tabs || !grid) return;

  const lang = curLang();
  const WORLD_META = {
    0: { name: 'TUTORIAL',    col:'#00ff9d', icon:'◈', sub:'' },
    1: { name: lang==='pt' ? 'GÊNESIS' : 'GENESIS',       col:'#00c8e0', icon:'◈', sub: lang==='pt' ? 'O Despertar' : 'The Awakening' },
    2: { name: lang==='pt' ? 'O VAZIO' : 'THE VOID',      col:'#c040ff', icon:'⊗', sub: lang==='pt' ? 'Vórtices' : 'Drain Vortexes' },
    3: { name: lang==='pt' ? 'NEXO PRIME' : 'NEXUS PRIME',col:'#ff9020', icon:'⚡', sub: lang==='pt' ? 'Retransmissores e Pulsares' : 'Relays & Pulsars' },
  };

  const w2ok = STATE.settings.w2 || STATE.settings.debug;
  const w3ok = STATE.settings.w3 || STATE.settings.debug;

  tabs.innerHTML = '';
  [0,1,2,3].forEach(w => {
    if (w === 2 && !w2ok) return;
    if (w === 3 && !w3ok) return;
    const meta = WORLD_META[w];
    const tab  = document.createElement('button');
    tab.className = 'wtab' + (w === _activeWorldTab ? ' active' : '');
    tab.style.setProperty('--wtc', meta.col);
    tab.innerHTML = w === 0
      ? '◈ TUTORIAL'
      : `${meta.icon} W${w}: ${meta.name}`;
    tab.addEventListener('click', () => {
      Music.tabSwitch();
      _activeWorldTab = w;
      buildWorldTabs();
    });
    tabs.appendChild(tab);
  });

  const descEl = $(IDS.WORLD_DESC);
  if (descEl) {
    const m = WORLD_META[_activeWorldTab] || {};
    descEl.textContent  = m.sub || '';
    descEl.style.color  = m.col
      ? m.col.replace(')', ',0.45)').replace('rgb', 'rgba')
      : 'rgba(255,255,255,0.3)';
  }

  buildGrid(_activeWorldTab);
}

export function buildGrid(worldFilter = _activeWorldTab) {
  const g = $(IDS.LGRID);
  g.innerHTML = '';

  const WORLD_META = {
    1:{col:'#00c8e0'}, 2:{col:'#c040ff'}, 3:{col:'#ff9020'},
  };

  if (worldFilter === 0) {
    const lv = LEVELS[0];
    const btn = _makeLvBtn(lv, 0, '#00ff9d', false, 0 <= STATE.completed, !(0 <= STATE.completed), false, true);
    g.appendChild(btn);
    return;
  }

  const levelsForWorld = LEVELS.filter(lv => lv.w === worldFilter);
  const wm  = WORLD_META[worldFilter] || { col:'#00c8e0' };
  const w2ok= STATE.settings.w2 || STATE.settings.debug;
  const w3ok= STATE.settings.w3 || STATE.settings.debug;

  levelsForWorld.forEach(lv => {
    const phaseNum   = lv.id;
    const w          = lv.w || 1;
    const isDone     = phaseNum <= STATE.completed;
    const isTutEntry = !!lv.tut;
    const worldLocked= (w === 2 && !w2ok) || (w === 3 && !w3ok);
    const isNext     = phaseNum === STATE.completed + 1 ||
                       (isTutEntry && !worldLocked && !isDone && phaseNum > STATE.completed);
    const isLocked   = STATE.settings.debug ? false
                     : worldLocked          ? true
                     : isTutEntry           ? false
                     : phaseNum > STATE.completed + 1;
    const btn = _makeLvBtn(lv, phaseNum, wm.col, isLocked, isDone, isNext, worldLocked, lv.tut);
    g.appendChild(btn);
  });
}

function _makeLvBtn(lv, phaseNum, col, isLocked, isDone, isNext, worldLocked, isTut) {
  const btn = document.createElement('div');
  let cls   = 'lb2';
  if (isLocked)     cls += ' lk';
  else if (isDone)  cls += ' dn';
  else if (isNext)  cls += ' nxt';
  if (phaseNum === STATE.curLvl && !isLocked) cls += ' cur';
  btn.className = cls;
  if (!isLocked) btn.style.borderColor = col + '40';

  const diff = Math.ceil(((phaseNum - 1) % 10 + 1) / 2) || 1;
  const dots = Array.from({ length: 5 }, (_, d) =>
    '<span' + (d < diff ? ' class="lit"' : '') + '></span>'
  ).join('');

  const sc       = STATE.scores[phaseNum];
  const nStars   = starsFor(sc);
  const starHtml = isDone
    ? '<div class="lstar">' +
        [0,1,2].map(j =>
          '<span class="s' + (j < nStars ? ' on' : '') +
          '" style="color:' + (j < nStars ? col : 'rgba(255,255,255,0.15)') + '">&#9733;</span>'
        ).join('') +
      '</div>'
    : '';

  const badge = isDone
    ? starHtml + (sc != null ? '<div style="font-size:7px;color:' + col + ';letter-spacing:1px;opacity:0.8">' + sc + '</div>' : '')
    : worldLocked
      ? '<div class="lck" style="opacity:0.3">⚙</div><div style="font-size:6px;color:rgba(255,255,255,0.28);letter-spacing:1px;margin-top:2px">SETTINGS</div>'
      : isNext
        ? '<div class="lck" style="color:#00ff9d">▶</div>'
        : '<div class="lck">🔒</div>';

  const mechBadge = lv.hz > 0
    ? '<div style="font-size:6px;color:#c040ff;letter-spacing:1px;margin-top:1px">VORTEX×' + lv.hz +
        (lv.supervhz ? ' ⊗' : '') + (lv.mvhz ? ' MV' : '') + (lv.pchz ? ' ∿' : '') + '</div>'
    : (lv.rl > 0 || lv.ps > 0 || lv.sig)
      ? '<div style="font-size:6px;color:#ff9020;letter-spacing:1px;margin-top:1px">' +
          (lv.rl  ? 'R×' + lv.rl  : '') +
          (lv.rl  && lv.ps ? ' '  : '') +
          (lv.ps  ? 'P×' + lv.ps  : '') +
          ((lv.rl || lv.ps) && lv.sig ? ' ' : '') +
          (lv.sig ? 'S×' + lv.sig : '') +
          (lv.bkrl ? ' <span style="color:#f5c518">FORT×' + lv.bkrl + '</span>' : '') +
          (lv.superps ? ' <span style="color:#ffdd00">CORE</span>' : '') +
          '</div>'
    : (lv.bk || lv.sym)
      ? '<div style="font-size:6px;color:#f5c518;letter-spacing:1px;margin-top:1px">' +
          (lv.bk  ? 'BK×' + lv.bk : '') +
          (lv.sym ? (lv.bk ? ' ' : '') + 'ECHO' : '') + '</div>'
    : '';

  const purpleBadge = lv.ai3 > 0
    ? '<div style="font-size:6px;color:#c040ff;letter-spacing:1px;margin-top:1px">⚔ CUTTHROAT×' + lv.ai3 + '</div>'
    : '';

  const idLabel = isTut ? 'TUT' : String(phaseNum).padStart(2, '0');
  btn.innerHTML = '<div class="ln" style="color:' + col + '">' + idLabel + '</div>' +
                  '<div class="lna">' + lv.name + '</div>' +
                  '<div class="ld">' + dots + '</div>' + badge + mechBadge + purpleBadge;

  if (!isLocked) {
    btn.addEventListener('click', () => {
      STATE.curLvl = phaseNum;
      /* Game reference injected at init via Screens.setGame(game) */
      fadeGo(() => { showScr(null); Screens._game.loadLevel(phaseNum); });
    });
  }
  return btn;
}

/* ── Story screen ── */
export function buildStory() {
  const wrap = $(IDS.STORY_WRAP);
  wrap.innerHTML = '';
  const lang = curLang();
  const stor = T('stor');
  const title = document.createElement('div');
  title.className  = 'sttitle';
  title.textContent= T('storTitle');
  wrap.appendChild(title);
  stor.forEach(item => {
    if (item.t) { const d = document.createElement('div'); d.className = 'stchap'; d.textContent = item.t; wrap.appendChild(d); }
    if (item.p) { const d = document.createElement('div'); d.className = 'stpara'; d.innerHTML   = item.p; wrap.appendChild(d); }
    if (item.q) { const d = document.createElement('div'); d.className = 'stquote';d.textContent = item.q; wrap.appendChild(d); }
    if (item.t || item.p || item.q) { const hr = document.createElement('hr'); hr.className = 'stdivider'; wrap.appendChild(hr); }
  });
  const sb = $(IDS.BTN_STORY_BACK);
  if (sb) sb.textContent = T('enterGrid');
  const sb2 = $(IDS.BTN_STORY_BACK2);
  if (sb2) sb2.textContent = T('back');
}

/* ── World banner ── */
export function showWorldBanner(w, lang) {
  const meta = {
    1: { name:'GENESIS',      sub:'The Awakening',          col:'#00c8e0', icon:'◈', mechanic:'' },
    2: { name:'THE VOID',     sub:'Drain Vortexes Ahead',   col:'#c040ff', icon:'⊗', mechanic:'Vortexes drain your tentacles. Route wisely.' },
    3: { name:'NEXUS PRIME',  sub:'Relays & Pulsars',       col:'#ff9020', icon:'⚡', mechanic:'Capture Relays for flow bonus. Pulsars broadcast energy.' },
  };
  const m = meta[w]; if (!m) return;
  const pt = lang === 'pt';
  const sub2 = pt
    ? (w===2 ? 'Vórtices drenam seus tentáculos. Planeje rotas.' : w===3 ? 'Capture Retransmissores. Pulsares emitem energia.' : 'O Despertar')
    : m.mechanic;
  let ban = $(IDS.WORLD_BANNER);
  if (!ban) { ban = document.createElement('div'); ban.id = IDS.WORLD_BANNER; document.body.appendChild(ban); }
  ban.innerHTML = `<div class="wb-inner" style="border-color:${m.col}22">
    <div class="wb-icon" style="color:${m.col}">${m.icon}</div>
    <div class="wb-world" style="color:${m.col}">WORLD ${w}</div>
    <div class="wb-name" style="color:${m.col}">${m.name}</div>
    <div class="wb-sub">${pt ? (['O Despertar','Vórtices de Drenagem','Retransmissores e Pulsares'][w-1]) : m.sub}</div>
    ${sub2 ? '<div class="wb-mech">' + sub2 + '</div>' : ''}
  </div>`;
  ban.className = 'wb-show';
  setTimeout(() => { ban.className = 'wb-hide'; }, 4000);
}

/* ── Result / end-level screen ── */
export function endLevel(win, game) {
  const cfg = game.cfg;
  const sc  = win ? game.calcScore() : 0;
  const lid = cfg.id;

  if (win && lid >= 1) {
    STATE.completed = Math.max(STATE.completed, lid);
    if (sc != null && (STATE.scores[lid] === null || sc > STATE.scores[lid])) STATE.scores[lid] = sc;
    STATE.save();
    if ([10, 21, 32].includes(lid)) setTimeout(() => SFX.worldUnlock(), 600);
  }

  if (win) { SFX.win(); setTimeout(() => Music.playMenu(), 1500); }
  else     { SFX.lose(); setTimeout(() => Music.playMenu(), 1200); }

  setTimeout(() => {
    const rtitle = $(IDS.RTITLE);
    rtitle.textContent = win ? T('phaseClear') : T('annihilated');
    rtitle.className   = 'rt ' + (win ? 'win' : 'lose');

    const nextName = STATE.curLvl < LEVELS.length - 1 ? LEVELS[STATE.curLvl + 1].name : '';
    $(IDS.RSUB).textContent = win
      ? cfg.name + ' — ' + T('phaseOf', cfg.id, LEVELS.length - 1) + ' ' +
        (STATE.curLvl < LEVELS.length - 1 ? T('nextPhase', nextName) : T('allComplete'))
      : cfg.name + ' — ' + T('eliminated', cfg.id, 30);

    /* Score display */
    const rsc = $(IDS.RSCORE);
    if (rsc && win && sc != null && !cfg.tut) {
      rsc.style.display = 'block';
      const prev      = STATE.scores[lid];
      const isPB      = prev === sc;
      const par2      = cfg.par || 120;
      const tSec      = Math.floor(game.scoreTime);
      const parDiff   = tSec - par2;
      const parLabel  = parDiff <= 0
        ? '<span style="color:#00ff9d">' + parDiff + 's vs par</span>'
        : '<span style="color:#ff7090">+' + parDiff + 's vs par</span>';
      const starCount2 = starsFor(sc);
      rsc.innerHTML =
        '<div class="sstar" id="_rstars">' + [0,1,2].map(j => '<span id="_rs' + j + '" class="s">&#9733;</span>').join('') + '</div>' +
        '<div class="snum" id="_rscnum" style="opacity:0;transition:opacity 0.4s">' + sc + '</div>' +
        '<div id="_rscpar" style="font-size:8px;letter-spacing:2px;color:#4a5e72;margin-top:3px;opacity:0;transition:opacity 0.4s">' + parLabel + '</div>' +
        '<div id="_rscpb" style="font-size:7px;letter-spacing:1px;color:#4a5e72;margin-top:2px;opacity:0;transition:opacity 0.4s">' +
          (isPB ? '&#9650; BEST' : prev != null ? 'BEST: ' + prev : '') + '</div>';
      for (let j = 0; j < 3; j++) {
        setTimeout(() => {
          const el = document.getElementById('_rs' + j); if (!el) return;
          if (j < starCount2) {
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
    } else if (rsc) rsc.style.display = 'none';

    const par = cfg.par || 120;
    const t2  = Math.floor(game.scoreTime);
    const underPar = t2 <= par;
    const parStr = (underPar ? '<span style="color:#00ff9d">' : '<span style="color:#ff3d5a">') + t2 + 's</span>';
    const parMark= (underPar
      ? '<span style="color:#00ff9d">-' + (par - t2) + 's ▲</span>'
      : '<span style="color:#ff7090">+' + (t2 - par) + 's ▼</span>') +
      ' (par ' + par + 's)';

    $(IDS.RINFO).innerHTML =
      '<div class="lr"><div class="ll">' + T('phase')  + '</div><div class="lv">' + cfg.id + '/10</div></div>' +
      '<div class="lr"><div class="ll">' + T('time')   + '</div><div class="lv">' + parStr + ' ' + parMark + '</div></div>' +
      '<div class="lr"><div class="ll">' + T('wasted') + '</div><div class="lv">' + (game.wastedTents || 0) + ' link(s) <span style="font-size:7px;color:#4a5e72">(-' + (game.wastedTents || 0) * 25 + 'p)</span></div></div>' +
      '<div class="lr"><div class="ll">' + T('frenzies')+ '</div><div class="lv">' + (game.frenzyCount || 0) + 'x <span style="font-size:7px;color:#f5c518">(+' + Math.min(90, (game.frenzyCount || 0) * 30) + 'p)</span></div></div>' +
      '<div class="lr"><div class="ll">' + T('enemies') + '</div><div class="lv">' + cfg.ai + ' eliminated</div></div>';

    const btnRN = $(IDS.BTN_RN);
    if (btnRN) btnRN.style.display = (win && STATE.curLvl < LEVELS.length - 1) ? '' : 'none';

    const tutbox = $(IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'none';
    const hsc = $(IDS.HSCORE);
    if (hsc) hsc.style.display = 'none';

    showScr('result');
    const dc = $(IDS.DC); if (dc) dc.classList.remove('on');

    $(IDS.BTN_RL).textContent = T('phases');
    $(IDS.BTN_RR).textContent = T('retry');
    if (win && STATE.curLvl < LEVELS.length - 1 && btnRN) btnRN.textContent = T('next');
  }, 500);
}

/* ── Settings UI ── */
export function refreshSettingsUI() {
  ['w2','w3','debug','sound','music','highGraphics'].forEach(k => {
    const id  = 'tog' + k.charAt(0).toUpperCase() + k.slice(1);
    const btn = $(id);
    if (!btn) return;
    btn.textContent = STATE.settings[k] ? 'ON' : 'OFF';
    btn.classList.toggle('on', STATE.settings[k]);
  });
  const themeBtn = $('togTheme');
  if (themeBtn) {
    const t = STATE.settings.theme || 'DARK';
    themeBtn.textContent = t;
    themeBtn.classList.toggle('on', t === 'LIGHT');
  }
}

export function updateDebugInfo() {
  const el = $(IDS.DEBUG_INFO_TEXT); if (!el) return;
  el.innerHTML = [
    'completed: ' + STATE.completed,
    'curLvl: '    + STATE.curLvl,
    'LEVELS: '    + LEVELS.length,
    'Scores: '    + STATE.scores.filter(s => s !== null).length + ' saved',
    'settings: '  + JSON.stringify(STATE.settings),
  ].join('<br>');
}

/* ── Credits screen ── */
export function buildCredits() {
  const wrap = $(IDS.CRED_WRAP);
  if (!wrap) return;
  const pt = curLang() === 'pt';

  const sections = [
    {
      title: pt ? 'DESENVOLVEDOR' : 'DEVELOPER',
      items: [
        { label: pt ? 'Design & Engenharia' : 'Design & Engineering', value: 'Jonis Alves Demamann' },
        { label: 'E-mail', value: 'jonis@outlook.com' },
      ],
    },
    {
      title: pt ? 'TECNOLOGIAS' : 'TECH STACK',
      items: [
        { label: pt ? 'Motor' : 'Engine',    value: 'HTML5 Canvas 2D' },
        { label: pt ? 'Áudio' : 'Audio',     value: 'Web Audio API' },
        { label: pt ? 'Gráficos' : 'Render', value: 'Vanilla JS ES Modules' },
        { label: pt ? 'Persistência' : 'Save', value: 'localStorage' },
      ],
    },
    {
      title: pt ? 'ARQUITETURA' : 'ARCHITECTURE',
      items: [
        { label: pt ? 'Padrão' : 'Pattern',  value: pt ? 'Entidade / Renderizador' : 'Entity / Renderer split' },
        { label: pt ? 'Eventos' : 'Events',  value: 'EventBus (pub/sub)' },
        { label: pt ? 'Pool' : 'Pool',       value: 'OrbPool (300 orbs)' },
        { label: 'i18n',                      value: pt ? 'PT-BR / EN-US' : 'PT-BR / EN-US' },
      ],
    },
    {
      title: pt ? 'MUNDOS' : 'WORLDS',
      items: [
        { label: 'W1', value: pt ? 'Gênesis — O Despertar' : 'Genesis — The Awakening' },
        { label: 'W2', value: pt ? 'O Vazio — Vórtices de Drenagem' : 'The Void — Drain Vortexes' },
        { label: 'W3', value: pt ? 'Nexo Prime — Retransmissores & Pulsares' : 'Nexus Prime — Relays & Pulsars' },
      ],
    },
  ];

  let html = '<div class="cred-title">' + T('creditsTitle') + '</div>';

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
