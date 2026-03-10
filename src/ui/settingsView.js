import { DOM_IDS } from './DomIds.js';

function $(id) { return document.getElementById(id); }

export function applySettingsToggleState(state) {
  ['w2', 'w3', 'debug', 'sound', 'music', 'showFps'].forEach(key => {
    const id = 'tog' + key.charAt(0).toUpperCase() + key.slice(1);
    const button = $(id);
    if (!button) return;
    const isEnabled = key === 'w2'
      ? state.isWorldUnlocked(2)
      : key === 'w3'
        ? state.isWorldUnlocked(3)
        : !!state.settings[key];
    button.textContent = isEnabled ? 'ON' : 'OFF';
    button.classList.toggle('on', isEnabled);
  });

  const graphicsButton = $('togGraphicsMode');
  if (graphicsButton) {
    const mode = state.settings.graphicsMode === 'high' ? 'HIGH' : 'LOW';
    graphicsButton.textContent = mode;
    graphicsButton.classList.toggle('on', mode === 'HIGH');
  }

  const themeButton = $('togTheme');
  if (themeButton) {
    const theme = state.settings.theme || 'AURORA';
    themeButton.textContent = theme;
    themeButton.classList.toggle('on', theme !== 'GLACIER');
  }
}

export function applyDebugSettingsVisibility(debugEnabled) {
  const debugResetRow = $(DOM_IDS.DEBUG_RESET_ROW);
  if (debugResetRow) debugResetRow.style.display = debugEnabled ? '' : 'none';
  const debugCopyRow = $(DOM_IDS.DEBUG_COPY_ROW);
  if (debugCopyRow) debugCopyRow.style.display = debugEnabled ? '' : 'none';
  const debugEndingRow = $(DOM_IDS.DEBUG_ENDING_ROW);
  if (debugEndingRow) debugEndingRow.style.display = debugEnabled ? '' : 'none';
  const debugPanel = $(DOM_IDS.DEBUG_INFO_PANEL);
  if (debugPanel) debugPanel.style.display = debugEnabled ? '' : 'none';
}
