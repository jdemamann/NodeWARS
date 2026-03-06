/* ================================================================
   NODE WARS v3 — HUD

   Updates the fixed top-bar DOM elements.  Uses a dirty flag so
   the DOM is only touched when values actually change — avoids
   querySelector overhead at 60 fps.
   ================================================================ */

import { IDS } from './IDS.js';
import { T }   from '../i18n.js';

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
  }

  update(game) {
    /* Node counts */
    const sp = game.nodes.filter(n => n.owner === 1).length;
    const sn = game.nodes.filter(n => n.owner === 0).length;
    const se = game.nodes.filter(n => n.owner === 2).length;

    if (sp !== this._sp) { this._sp = sp; const el = $(IDS.SP); if (el) el.textContent = sp; }
    if (sn !== this._sn) { this._sn = sn; const el = $(IDS.SN); if (el) el.textContent = sn; }
    if (se !== this._se) { this._se = se; const el = $(IDS.SE); if (el) el.textContent = se; }

    /* Label translations */
    const yo = document.querySelector('.hst.hp .lb');
    if (yo) yo.textContent = T('you');
    const no = document.querySelector('.hst.hn .lb');
    if (no) no.textContent = T('neutral');
    const eo = document.querySelector('.hst.he .lb');
    if (eo) eo.textContent = T('enemy');

    /* Par timer */
    if (game.cfg && !game.cfg.tut && game.cfg.par) {
      const t2  = Math.floor(game.scoreTime);
      const par = game.cfg.par;
      const diff= t2 - par;
      const txt = diff <= 0 ? 'PAR ' + (-diff) + 's ▲' : 'PAR +' + diff + 's ▼';
      if (txt !== this._par) {
        this._par = txt;
        const el  = $(IDS.HPAR);
        if (el) {
          el.textContent = txt;
          el.style.color = diff <= -10 ? '#00ff9d' : diff <= 0 ? '#00e5ff' : diff < 20 ? '#f5c518' : '#ff7090';
        }
      }
    } else {
      const el = $(IDS.HPAR);
      if (el && this._par !== '') { this._par = ''; el.textContent = ''; }
    }

    /* Live score */
    const hsc = $(IDS.HSCORE);
    if (hsc && game.cfg && !game.cfg.tut && !game.done) {
      const sc   = game.calcScore();
      const st   = game._utils.starsFor(sc);
      const sTxt = ['★','☆','☆'].map((_, i) => i < st ? '★' : '☆').join('') + ' ' + sc;
      if (sTxt !== this._sc) {
        this._sc          = sTxt;
        hsc.style.display = '';
        hsc.textContent   = sTxt;
      }
    } else if (hsc && hsc.style.display !== 'none') {
      this._sc          = '';
      hsc.style.display = 'none';
    }

    /* Level label */
    if (game.cfg) {
      const cfg = game.cfg;
      const wLabel = cfg.w > 0 ? ' W' + cfg.w : '';
      const lvlTxt = cfg.tut ? T('tutorial') : ('LVL ' + cfg.id + wLabel);
      if (lvlTxt !== this._lvl) {
        this._lvl = lvlTxt;
        const el  = $(IDS.HLVL);
        if (el) el.textContent = lvlTxt;
      }
      if (cfg.name !== this._name) {
        this._name = cfg.name;
        const el   = $(IDS.HLN);
        if (el) el.textContent = cfg.name;
      }
    }
  }

  /* Called once when a level loads, or language changes */
  setLevel(cfg) {
    this._sp = this._sn = this._se = -1;
    this._par = this._sc = this._lvl = this._name = '';

    const hpause = $(IDS.HPAUSE);
    if (hpause) hpause.style.display = cfg.tut ? 'none' : 'inline-flex';
  }

  setHints() {
    const hh = $(IDS.HHINTS);
    if (!hh) return;
    const lang  = document.documentElement.lang || 'en';
    const hints = lang === 'pt'
      ? [['CLIQUE','selecionar → enviar'],['RE-CLIQUE NO NÓ','recolher todos'],['CLIQUE NO ALVO LIGADO','inverter fluxo'],['ARRASTAR DIR.','cortar links']]
      : [['CLICK','select → link'],['RE-CLICK NODE','retract all'],['CLICK LINKED TARGET','reverse flow'],['R-DRAG','cut links']];
    hh.innerHTML = hints.map(([b, t2]) => '<span><b>' + b + '</b> ' + t2 + '</span>').join('');
  }
}
