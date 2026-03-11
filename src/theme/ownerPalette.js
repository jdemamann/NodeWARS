/* ================================================================
   Owner palette helpers

   Shared palette lookups for gameplay rendering and UI panels. This
   keeps owner colors canonical across the project.
   ================================================================ */

import { CP, CE, CE3 } from '../config/gameConfig.js';

export function ownerColor(owner, level, neutralColor = '#7a8fa0') {
  const idx = Math.max(0, Math.min(level | 0, CP.length - 1));
  if (owner === 1) return CP[idx];
  if (owner === 2) return CE[idx];
  if (owner === 3) return CE3[idx];
  return neutralColor;
}

export function ownerPanelTheme(owner) {
  if (owner === 1) {
    return {
      bg: 'rgba(8,22,42,0.94)',
      border: 'rgba(0,180,220,0.45)',
    };
  }
  if (owner === 2) {
    return {
      bg: 'rgba(40,10,18,0.94)',
      border: 'rgba(220,40,60,0.45)',
    };
  }
  if (owner === 3) {
    return {
      bg: 'rgba(28,10,42,0.94)',
      border: 'rgba(192,64,255,0.45)',
    };
  }
  return {
    bg: 'rgba(30,40,55,0.94)',
    border: 'rgba(120,150,175,0.45)',
  };
}

export function ownerRelayCoreColor(owner) {
  if (owner === 1) return 'rgba(0,229,255,0.55)';
  if (owner === 2) return 'rgba(255,40,80,0.45)';
  if (owner === 3) return 'rgba(192,64,255,0.45)';
  return 'rgba(60,255,180,0.25)';
}
