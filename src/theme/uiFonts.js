import { STATE } from '../core/GameState.js';

const FONT_STACKS = Object.freeze({
  orbitron: {
    ui: '"NW Orbitron", "Orbitron", system-ui, sans-serif',
    copy: '"NW Orbitron", "Orbitron", "NW Exo 2", "Exo 2", system-ui, sans-serif',
  },
  techno: {
    ui: '"NW Tech Mono", "Share Tech Mono", "Courier New", monospace',
    copy: '"NW Tech Mono", "Share Tech Mono", "NW Exo 2", "Exo 2", monospace',
  },
  rajdhani: {
    ui: '"NW Rajdhani", "Rajdhani", "NW Orbitron", "Orbitron", sans-serif',
    copy: '"NW Rajdhani", "Rajdhani", "NW Exo 2", "Exo 2", system-ui, sans-serif',
  },
  exo2: {
    ui: '"NW Exo 2", "Exo 2", "NW Orbitron", "Orbitron", sans-serif',
    copy: '"NW Exo 2", "Exo 2", "NW Rajdhani", "Rajdhani", system-ui, sans-serif',
  },
});

function getSelectedFontId(fontId = STATE.settings.fontId) {
  return Object.hasOwn(FONT_STACKS, fontId) ? fontId : 'exo2';
}

export function getUiFontStacks(fontId = STATE.settings.fontId) {
  return FONT_STACKS[getSelectedFontId(fontId)];
}

export function getCanvasDisplayFont(sizePx, weight = 'bold', fontId = STATE.settings.fontId) {
  return `${weight} ${sizePx}px ${getUiFontStacks(fontId).ui}`;
}

export function getCanvasCopyFont(sizePx, weight = 'normal', fontId = STATE.settings.fontId) {
  return `${weight} ${sizePx}px ${getUiFontStacks(fontId).copy}`;
}
