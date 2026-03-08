/* ================================================================
   NODE WARS v3 — GameState
   Single source of truth for persistent/cross-cutting state.
   Replaces the scattered globals: completed, curLvl, scores,
   curLang, and SETTINGS.
   ================================================================ */

import { store } from './storage.js';

class GameState {
  constructor() {
    this.completed   = 0;      // highest campaign phase id beaten
    this.curLvl      = 1;      // current level index into LEVELS[]
    this.scores      = Array(33).fill(null); // best score per level id (1-32)
    this.curLang     = 'pt';
    this.settings    = {
      w2:           false,
      w3:           false,
      debug:        false,
      sound:        true,
      music:        true,
      fontId:       'orbitron',
      textZoom:     1.0,
      highGraphics: false,
      theme:        'DARK',
    };
    this._activeWorldTab = 1;  // ui state for level select screen
  }

  save() {
    try {
      store.set('nw_completed', this.completed);
      store.set('nw_scores',    JSON.stringify(this.scores));
      store.set('nw_lang',      this.curLang);
      store.set('nw_settings',  JSON.stringify(this.settings));
    } catch (e) {}
  }

  load() {
    try {
      const c = parseInt(store.get('nw_completed'));
      if (c >= 0 && c <= 32) this.completed = c;

      const lang = store.get('nw_lang');
      if (lang === 'en' || lang === 'pt') this.curLang = lang;

      const s = JSON.parse(store.get('nw_scores') || '[]');
      if (Array.isArray(s)) s.forEach((v, i) => {
        if (i >= 1 && i <= 32 && v != null) this.scores[i] = v;
      });

      const st = JSON.parse(store.get('nw_settings') || '{}');
      Object.assign(this.settings, st);
    } catch (e) {}
  }

  saveSettings() {
    store.set('nw_settings', JSON.stringify(this.settings));
  }

  loadSettings() { /* merged into load() */ }

  saveLang(lang) {
    this.curLang = lang;
    store.set('nw_lang', lang);
  }

  resetProgress() {
    this.completed = 0;
    this.scores = Array(33).fill(null);
    this.save();
  }
}

/** Singleton — import STATE everywhere instead of using global vars. */
export const STATE = new GameState();
