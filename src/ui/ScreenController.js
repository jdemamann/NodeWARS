/* ================================================================
   Screen controller

   Owns menu/screen composition, transitions, and notification cards.
   Depends on state, localization, audio, and the small view-builder
   helpers under src/ui.
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
import { buildCampaignEndingMarkup } from './campaignEndingView.js';
import { buildStoryMarkup } from './storyScreenView.js';
import { buildCreditsMarkup } from './creditsView.js';
import { buildTwCampaignEndingMarkup } from './twCampaignEndingView.js';
import { buildTwWorldCardsMarkup, buildTwWorldSummaryMarkup } from './twWorldSelectView.js';
import { buildTwLevelCardsMarkup, buildTwLevelMetaMarkup } from './twLevelSelectView.js';
import { applyDebugSettingsVisibility, applySettingsToggleState } from './settingsView.js';
import { buildTentacleWarsDebugMetrics } from '../tentaclewars/TwDebugMetrics.js';
import { TW_CAMPAIGN_FIXTURE_LEVELS, getTentacleWarsCampaignLevelById } from '../tentaclewars/TwCampaignFixtures.js';

function $(id) { return document.getElementById(id); }

/* ── Screen keys → DOM IDs ── */
const SCR = {
  menu:     DOM_IDS.SCREEN_MENU,
  levels:   DOM_IDS.SCREEN_LEVELS,
  twWorlds: DOM_IDS.SCREEN_TW_WORLDS,
  twLevels: DOM_IDS.SCREEN_TW_LEVELS,
  twEnding: DOM_IDS.SCREEN_TW_ENDING,
  story:    DOM_IDS.SCREEN_STORY,
  result:   DOM_IDS.SCREEN_RESULT,
  ending:   DOM_IDS.SCREEN_ENDING,
  pause:    DOM_IDS.SCREEN_PAUSE,
  settings: DOM_IDS.SCREEN_SETTINGS,
  credits:  DOM_IDS.SCREEN_CREDITS,
};

/* Active world tab in the level-select screen */
let _activeWorldTab = STATE.getActiveWorldTab();
let _activeTwWorldTab = STATE.getTentacleWarsActiveWorldTab();

/* Parse TW ids locally so UI helpers can derive world/phase without new deps. */
function parseTentacleWarsLevelId(levelId) {
  const match = typeof levelId === 'string' ? levelId.match(/^W(\d+)-(\d+)$/) : null;
  if (!match) return null;
  return { world: Number(match[1]), phase: Number(match[2]) };
}

/* Fixture order is canonical for next-phase routing inside the TW shell. */
function getNextTentacleWarsLevel(levelId) {
  const currentIndex = TW_CAMPAIGN_FIXTURE_LEVELS.findIndex(level => level.id === levelId);
  if (currentIndex < 0) return null;
  return TW_CAMPAIGN_FIXTURE_LEVELS[currentIndex + 1] || null;
}

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
let _notificationSeq = 0;
const _notificationRecent = new Map();
const _notificationPriority = {
  warning: 4,
  objective: 3,
  music: 2,
  status: 2,
  debug: 1,
};

function pruneNotificationStack(notificationStack) {
  const cards = Array.from(notificationStack.children);
  while (cards.length > 3) {
    const card = cards.shift();
    card?.remove();
  }
}

export function showNotification({
  kind = 'status',
  kicker = '',
  title = '',
  body = '',
  meta = '',
  icon = '•',
  durationMs = 3200,
  dedupeKey = '',
  dedupeMs = null,
} = {}) {
  // Notifications are the lightweight bottom-right channel for music changes,
  // debug info, and contextual gameplay guidance.
  const notificationStack = $(DOM_IDS.NOTIFICATIONS);
  if (!notificationStack) return;

  const priority = _notificationPriority[kind] || 0;
  const dedupeWindowMs = dedupeMs ?? Math.min(Math.max(durationMs, 800), 4500);
  const now = performance?.now?.() ?? Date.now();
  if (dedupeKey) {
    const lastSeenAt = _notificationRecent.get(dedupeKey) || -Infinity;
    if (now - lastSeenAt < dedupeWindowMs) return;
    _notificationRecent.set(dedupeKey, now);
  }

  const activeCards = Array.from(notificationStack.children);
  const highestActivePriority = activeCards.reduce((highest, card) => {
    const cardPriority = Number(card.dataset.priority || 0);
    return Math.max(highest, cardPriority);
  }, 0);

  if (highestActivePriority > priority && priority <= 2) return;
  if (priority >= 3) {
    activeCards
      .filter(card => Number(card.dataset.priority || 0) < priority)
      .forEach(card => card.remove());
  }

  const notificationCard = document.createElement('div');
  const notificationId = `notif-${++_notificationSeq}`;
  notificationCard.id = notificationId;
  notificationCard.className = `notif-card kind-${kind}`;
  notificationCard.dataset.priority = String(priority);
  if (dedupeKey) notificationCard.dataset.dedupeKey = dedupeKey;
  notificationCard.innerHTML =
    '<div class="notif-inner">' +
      `<div class="notif-icon">${icon}</div>` +
      '<div class="notif-copy">' +
        (kicker ? `<div class="notif-kicker">${kicker}</div>` : '') +
        (title ? `<div class="notif-title">${title}</div>` : '') +
        (body ? `<div class="notif-body">${body}</div>` : '') +
        (meta ? `<div class="notif-meta">${meta}</div>` : '') +
      '</div>' +
    '</div>';

  notificationStack.appendChild(notificationCard);
  pruneNotificationStack(notificationStack);

  const queueVisualMount = globalThis.requestAnimationFrame || (callback => window.setTimeout(callback, 0));
  queueVisualMount(() => notificationCard.classList.add('on'));

  const dismiss = () => {
    notificationCard.classList.remove('on');
    window.setTimeout(() => notificationCard.remove(), 260);
  };

  window.setTimeout(dismiss, durationMs);
}

export function showToast(msg) {
  if (_toastTmr) clearTimeout(_toastTmr);
  showNotification({
    kind: 'status',
    icon: '◈',
    body: msg,
    durationMs: 2800,
    dedupeKey: `toast:${msg}`,
  });
  _toastTmr = setTimeout(() => {}, 2800);
}

/* ── Level-select: world tabs + grid ── */
export function syncWorldTab() {
  // Keep the world tab anchored to the current phase while respecting unlock
  // rules and tutorial-as-optional onboarding.
  const currentLevelConfig = LEVELS.find(levelConfig => levelConfig.id === STATE.curLvl);
  if (!currentLevelConfig) return;
  const currentWorldId = currentLevelConfig.worldId || 1;
  _activeWorldTab = currentWorldId === 0 ? 1 : currentWorldId;
  if (_activeWorldTab === 2 && !STATE.isWorldUnlocked(2)) _activeWorldTab = 1;
  if (_activeWorldTab === 3 && !STATE.isWorldUnlocked(3)) _activeWorldTab = 1;
  STATE.setActiveWorldTab(_activeWorldTab);
}

export function buildWorldTabs() {
  // Tabs are built from effective unlock state, not raw settings flags, so UI
  // stays aligned with progression and debug overrides.
  const tabs = $(DOM_IDS.WORLD_TABS);
  const grid = $(DOM_IDS.LGRID);
  if (!tabs || !grid) return;

  const lang = curLang();
  const worldMetaById = getLevelSelectWorldMeta(lang);

  const w2ok = STATE.isWorldUnlocked(2);
  const w3ok = STATE.isWorldUnlocked(3);

  tabs.innerHTML = '';
  [1,2,3].forEach(w => {
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
  // Grid cards are derived from effective progression state, then decorated by
  // authored world metadata and stored score/star results.
  const levelGridElement = $(DOM_IDS.LGRID);
  levelGridElement.innerHTML = '';

  const levelsForWorld = LEVELS.filter(levelConfig =>
    levelConfig.worldId === worldFilter ||
    (worldFilter === 1 && levelConfig.tutorialWorldId === 1),
  );
  const worldAccent = getLevelGridWorldAccent(worldFilter);
  const w2ok= STATE.isWorldUnlocked(2);
  const w3ok= STATE.isWorldUnlocked(3);

  levelsForWorld.forEach(levelConfig => {
    const phaseNum   = levelConfig.id;
    const worldId    = levelConfig.worldId || 1;
    const isDone     = phaseNum <= STATE.completed;
    const worldLocked= (worldId === 2 && !w2ok) || (worldId === 3 && !w3ok);
    const isUnlocked = STATE.isLevelUnlocked(levelConfig);
    const isNext     = isUnlocked && !isDone;
    const isLocked   = !isUnlocked;
    const levelButton = _makeLvBtn(levelConfig, phaseNum, worldAccent.col, isLocked, isDone, isNext, worldLocked, levelConfig.isTutorial);
    levelGridElement.appendChild(levelButton);
  });
}

/*
 * Build the TW world shell from canonical unlock state so the separate
 * campaign never duplicates progression logic inside the UI layer.
 */
export function showTwWorldSelect() {
  STATE.setGameMode('tentaclewars');
  const worldGridElement = $(DOM_IDS.TW_WORLD_GRID);
  const worldSummaryElement = $(DOM_IDS.TW_WORLD_SUMMARY);
  if (!worldGridElement || !worldSummaryElement) return;

  const currentLevelId = STATE.getTentacleWarsCurrentLevel();
  const parsedCurrentLevel = parseTentacleWarsLevelId(currentLevelId);
  _activeTwWorldTab = parsedCurrentLevel?.world || STATE.getTentacleWarsActiveWorldTab() || 1;
  STATE.setTentacleWarsActiveWorldTab(_activeTwWorldTab);

  const worldCards = [1, 2, 3, 4].map(worldId => ({
    worldId,
    unlocked: STATE.isTentacleWarsWorldUnlocked(worldId),
    isCurrent: worldId === _activeTwWorldTab,
    currentLevelLabel: currentLevelId,
    phaseRangeLabel: `W${worldId}-01 → W${worldId}-20`,
  }));

  worldSummaryElement.textContent = buildTwWorldSummaryMarkup(
    currentLevelId,
    worldCards.filter(worldCard => worldCard.unlocked).length,
  );
  worldGridElement.innerHTML = buildTwWorldCardsMarkup(worldCards);
  worldGridElement.querySelectorAll('[data-tw-world]').forEach(button => {
    button.addEventListener('click', () => {
      const worldId = Number(button.getAttribute('data-tw-world'));
      if (!STATE.isTentacleWarsWorldUnlocked(worldId)) return;
      fadeGo(() => showTwLevelSelect(worldId));
    });
  });

  showScr('twWorlds');
}

/*
 * Render one TW world worth of authored phases and wire each unlocked card
 * straight into the existing authored-level loader.
 */
export function showTwLevelSelect(worldId = _activeTwWorldTab) {
  STATE.setGameMode('tentaclewars');
  _activeTwWorldTab = Number.isInteger(worldId) ? worldId : 1;
  STATE.setTentacleWarsActiveWorldTab(_activeTwWorldTab);

  const titleElement = $(DOM_IDS.TW_LEVEL_TITLE);
  const metaElement = $(DOM_IDS.TW_LEVEL_META);
  const levelGridElement = $(DOM_IDS.TW_LEVEL_GRID);
  if (!titleElement || !metaElement || !levelGridElement) return;

  const currentLevelId = STATE.getTentacleWarsCurrentLevel();
  const levelsForWorld = TW_CAMPAIGN_FIXTURE_LEVELS.filter(level => level.world === _activeTwWorldTab);
  const levelCards = levelsForWorld.map(level => ({
    id: level.id,
    shortId: String(level.phase || parseTentacleWarsLevelId(level.id)?.phase || 0).padStart(2, '0'),
    energyCap: level.energyCap || level.nodeEnergyCap || 0,
    par: level.par || 0,
    stars: STATE.getTentacleWarsStars(level.id) || 0,
    locked: !STATE.isTentacleWarsLevelUnlocked(level.id),
    isCurrent: level.id === currentLevelId,
    isNext: level.id === currentLevelId && STATE.isTentacleWarsLevelUnlocked(level.id),
  }));

  titleElement.textContent = `WORLD ${_activeTwWorldTab}`;
  metaElement.textContent = buildTwLevelMetaMarkup(_activeTwWorldTab, currentLevelId);
  levelGridElement.innerHTML = buildTwLevelCardsMarkup(levelCards);
  levelGridElement.querySelectorAll('[data-tw-level]').forEach(button => {
    button.addEventListener('click', () => {
      const levelId = button.getAttribute('data-tw-level');
      if (!STATE.isTentacleWarsLevelUnlocked(levelId)) return;
      const levelData = getTentacleWarsCampaignLevelById(levelId);
      if (!levelData || !Screens._game) return;
      STATE.setTentacleWarsCurrentLevel(levelId);
      fadeGo(() => {
        showScr(null);
        Screens._game.loadTentacleWarsCampaignLevel(levelData);
      });
    });
  });

  showScr('twLevels');
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
  wrap.innerHTML = buildStoryMarkup(T);
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
    STATE.recordLevelWin(levelId);
    if (score != null && (STATE.scores[levelId] === null || score > STATE.scores[levelId])) STATE.scores[levelId] = score;
    STATE.save();
    if ([10, 21, 32].includes(levelId)) setTimeout(() => SFX.worldUnlock(), 600);
  } else if (!win) {
    STATE.recordLevelLoss(levelId);
  }

  if (win) {
    SFX.win();
    if (levelId !== 32) setTimeout(() => Music.playMenu(), 1500);
  } else {
    SFX.lose();
    setTimeout(() => Music.playMenu(), 1200);
  }

  setTimeout(() => {
    if (win && levelId === 32) {
      showCampaignEnding(game);
      return;
    }

    const rtitle = $(DOM_IDS.RTITLE);
    rtitle.textContent = win ? T('phaseClear') : T('annihilated');
    rtitle.className   = 'rt ' + (win ? 'win' : 'lose');

    const nextLevelConfig = STATE.getNextLevelConfig();
    const nextName = nextLevelConfig?.name || '';
    $(DOM_IDS.RSUB).textContent = win
      ? levelConfig.name + ' — ' + T('phaseOf', levelConfig.id, LEVELS.length - 1) + ' ' +
        (nextLevelConfig ? T('nextPhase', nextName) : T('allComplete'))
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
    if (btnRN) btnRN.style.display = (win && nextLevelConfig) ? '' : 'none';

    const tutbox = $(DOM_IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'none';
    const scoreHudElement = $(DOM_IDS.HSCORE);
    if (scoreHudElement) scoreHudElement.style.display = 'none';

    showScr('result');
    const dc = $(DOM_IDS.DC); if (dc) dc.classList.remove('on');

    $(DOM_IDS.BTN_RL).textContent = T('phases');
    $(DOM_IDS.BTN_RR).textContent = T('retry');
    if (win && nextLevelConfig && btnRN) btnRN.textContent = T('next');
  }, 500);
}

/*
 * Keep TW campaign completion on the shared result shell while storing stars,
 * fail streaks, and next-level pointer through the separate TW namespace.
 */
export function endTentacleWarsLevel(win, game) {
  const levelConfig = game.cfg;
  const levelId = levelConfig?.twLevelId || levelConfig?.id;
  const nextLevel = getNextTentacleWarsLevel(levelId);

  if (win) {
    STATE.recordTentacleWarsLevelWin(levelId, game.scoreTime, levelConfig?.par);
    SFX.win();
    if (levelId !== 'W4-20') setTimeout(() => Music.playMenu(), 1500);
  } else {
    STATE.recordTentacleWarsLevelLoss(levelId);
    SFX.lose();
    setTimeout(() => Music.playMenu(), 1200);
  }

  setTimeout(() => {
    if (win && levelId === 'W4-20') {
      showTwCampaignEnding();
      return;
    }

    const resultTitleElement = $(DOM_IDS.RTITLE);
    const resultSubtitleElement = $(DOM_IDS.RSUB);
    const scoreElement = $(DOM_IDS.RSCORE);
    const infoElement = $(DOM_IDS.RINFO);
    const nextButton = $(DOM_IDS.BTN_RN);

    if (resultTitleElement) {
      resultTitleElement.textContent = win ? T('phaseClear') : T('annihilated');
      resultTitleElement.className = 'rt ' + (win ? 'win' : 'lose');
    }
    if (resultSubtitleElement) {
      resultSubtitleElement.textContent = win
        ? `${levelId} — ${nextLevel ? T('nextPhase', nextLevel.id) : T('allComplete')}`
        : `${levelId} — ${T('retry')}`;
    }
    if (scoreElement) {
      scoreElement.style.display = 'none';
      scoreElement.innerHTML = '';
    }
    if (infoElement) {
      infoElement.innerHTML = buildResultInfoMarkup(levelConfig, game, T, 80);
    }
    if (nextButton) nextButton.style.display = win && nextLevel ? '' : 'none';

    const tutbox = $(DOM_IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'none';
    const scoreHudElement = $(DOM_IDS.HSCORE);
    if (scoreHudElement) scoreHudElement.style.display = 'none';
    const quickTipElement = $(DOM_IDS.DC);
    if (quickTipElement) quickTipElement.classList.remove('on');

    showScr('result');
    const phasesButton = $(DOM_IDS.BTN_RL);
    const retryButton = $(DOM_IDS.BTN_RR);
    if (phasesButton) phasesButton.textContent = 'MUNDOS';
    if (retryButton) retryButton.textContent = T('retry');
    if (win && nextLevel && nextButton) nextButton.textContent = 'PRÓXIMA FASE';
  }, 500);
}

export function showCampaignEnding(game, { debugPreview = false } = {}) {
  Music.playEnding();
  const endingModel = buildCampaignEndingMarkup(game, T, curLang(), { debugPreview });
  const titleElement = $(DOM_IDS.ENDING_TITLE);
  const subtitleElement = $(DOM_IDS.ENDING_SUB);
  const bodyElement = $(DOM_IDS.ENDING_BODY);
  const statsElement = $(DOM_IDS.ENDING_STATS);
  const quoteElement = $(DOM_IDS.ENDING_QUOTE);

  if (titleElement) titleElement.textContent = endingModel.title;
  if (subtitleElement) subtitleElement.textContent = endingModel.subtitle;
  if (bodyElement) bodyElement.innerHTML = endingModel.bodyMarkup;
  if (statsElement) statsElement.innerHTML = endingModel.statsMarkup;
  if (quoteElement) quoteElement.textContent = endingModel.quote;

  const tutbox = $(DOM_IDS.TUTBOX);
  if (tutbox) tutbox.style.display = 'none';
  const scoreHudElement = $(DOM_IDS.HSCORE);
  if (scoreHudElement) scoreHudElement.style.display = 'none';
  const quickTipElement = $(DOM_IDS.DC);
  if (quickTipElement) quickTipElement.classList.remove('on');

  showScr('ending');
}

/*
 * The dedicated TW ending is still a stub, so route back to the TW campaign
 * shell after surfacing a clear runtime marker for future implementation.
 */
export function showTwCampaignEnding() {
  const endingModel = buildTwCampaignEndingMarkup();
  const titleElement = $(DOM_IDS.TW_ENDING_TITLE);
  const subtitleElement = $(DOM_IDS.TW_ENDING_SUB);
  const metaElement = $(DOM_IDS.TW_ENDING_META);

  if (titleElement) titleElement.textContent = endingModel.title;
  if (subtitleElement) subtitleElement.textContent = endingModel.subtitle;
  if (metaElement) metaElement.textContent = endingModel.meta;

  const tutbox = $(DOM_IDS.TUTBOX);
  if (tutbox) tutbox.style.display = 'none';
  const scoreHudElement = $(DOM_IDS.HSCORE);
  if (scoreHudElement) scoreHudElement.style.display = 'none';
  const quickTipElement = $(DOM_IDS.DC);
  if (quickTipElement) quickTipElement.classList.remove('on');

  Music.playMenu();
  showScr('twEnding');
}

/* ── Settings UI ── */
export function refreshSettingsUI() {
  applySettingsToggleState(STATE);
  applyDebugSettingsVisibility(STATE.settings.debug);

  const currentTrackLabel = $(DOM_IDS.MUSIC_TRACK_LABEL);
  if (currentTrackLabel) {
    const trackInfo = Music.currentPreviewTrackInfo() || Music.pausedTrackInfo();
    currentTrackLabel.textContent = trackInfo
      ? `${T(trackInfo.titleKey)} · ${Music.currentPreviewTrackPosition()}/${Music.trackCount()}`
      : T('setMusicCurrentIdle');
  }

  const toggleButton = $(DOM_IDS.BTN_MUSIC_TOGGLE);
  if (toggleButton) toggleButton.textContent = Music.isPlaying() ? T('setMusicPause') : T('setMusicPlay');
}

export function updateDebugInfo() {
  const el = $(DOM_IDS.DEBUG_INFO_TEXT); if (!el) return;
  const game = Screens._game;
  const renderStats = game?.renderStats;
  const twDebugMetrics = buildTentacleWarsDebugMetrics(game);
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
      ...(twDebugMetrics ? [
        `tw_packets: lanes ${twDebugMetrics.packetLaneCount} queued ${twDebugMetrics.queuedPacketCount} acc ${twDebugMetrics.packetAccumulatorUnits.toFixed(2)}`,
        `tw_overflow: ready_nodes ${twDebugMetrics.overflowReadyNodeCount}`,
        `tw_capture: contested ${twDebugMetrics.contestedNeutralNodeCount} pressure ${twDebugMetrics.contestedCapturePressure.toFixed(2)} threshold ${twDebugMetrics.leadingNeutralCaptureThreshold}`,
      ] : []),
    ] : []),
  ].join('<br>');
}

/* ── Credits screen ── */
export function buildCredits() {
  const wrap = $(DOM_IDS.CRED_WRAP);
  if (!wrap) return;
  wrap.innerHTML = buildCreditsMarkup(T, curLang() === 'pt');
}

/* ── Back-reference to game instance (injected from main.js) ── */
export const Screens = {
  _game: null,
  setGame(g) { this._game = g; },
};
