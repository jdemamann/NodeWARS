/* ================================================================
   TentacleWars campaign preview helpers

   Centralises debug-time preview routing for authored TentacleWars
   campaign levels before the dedicated TW campaign shell exists.
   ================================================================ */

import { STATE } from '../core/GameState.js';
import { TW_CAMPAIGN_FIXTURE_LEVELS } from './TwCampaignFixtures.js';

const TW_LEVEL_ID_RE = /^W([1-4])-(0[1-9]|1\d|20)$/;

/* Normalizes a TW authored level id so preview routing stays strict and stable. */
function normalizeTentacleWarsPreviewLevelId(levelId) {
  if (typeof levelId !== 'string') return null;
  const normalizedLevelId = levelId.trim().toUpperCase();
  return TW_LEVEL_ID_RE.test(normalizedLevelId) ? normalizedLevelId : null;
}

/* Keeps world preview routing on the fixed 4-world campaign skeleton. */
function normalizeTentacleWarsPreviewWorldId(worldId) {
  const numericWorldId = Number(worldId);
  if (!Number.isInteger(numericWorldId) || numericWorldId < 1 || numericWorldId > 4) return null;
  return numericWorldId;
}

/* Sorts fixture levels deterministically so preview entry selection stays stable. */
function compareTentacleWarsFixtureLevels(leftLevel, rightLevel) {
  if (leftLevel.world !== rightLevel.world) return leftLevel.world - rightLevel.world;
  return leftLevel.phase - rightLevel.phase;
}

/* Parses runtime-only TW preview flags from the browser query string. */
export function parseTentacleWarsPreviewFlags(search = '') {
  const params = new URLSearchParams(search);
  return {
    twDebug: params.get('tw-debug') === '1',
    twAutostart: params.get('tw-autostart') === '1',
    twMode: params.get('tw-mode'),
    twLevelId: normalizeTentacleWarsPreviewLevelId(params.get('tw-level')),
    twWorld: normalizeTentacleWarsPreviewWorldId(params.get('tw-world')),
  };
}

/* Finds one schema-valid preview level by stable authored id. */
export function getTentacleWarsPreviewLevelById(levelId, levels = TW_CAMPAIGN_FIXTURE_LEVELS) {
  const normalizedLevelId = normalizeTentacleWarsPreviewLevelId(levelId);
  if (!normalizedLevelId) return null;
  return levels.find(level => level.id === normalizedLevelId) || null;
}

/* Finds the first preview-entry level for a given TW world. */
export function getTentacleWarsPreviewWorldEntryLevel(worldId, levels = TW_CAMPAIGN_FIXTURE_LEVELS) {
  const normalizedWorldId = normalizeTentacleWarsPreviewWorldId(worldId);
  if (!normalizedWorldId) return null;
  const levelsForWorld = levels
    .filter(level => level.world === normalizedWorldId)
    .sort(compareTentacleWarsFixtureLevels);
  return levelsForWorld[0] || null;
}

/* Lists the currently available preview fixtures for runtime tooling. */
export function listTentacleWarsPreviewLevelIds(levels = TW_CAMPAIGN_FIXTURE_LEVELS) {
  return levels
    .slice()
    .sort(compareTentacleWarsFixtureLevels)
    .map(level => level.id);
}

/* Applies debug-time TW world exposure without leaking into NW unlock state. */
export function applyTentacleWarsPreviewWorldJump(worldId, state = STATE) {
  const normalizedWorldId = normalizeTentacleWarsPreviewWorldId(worldId);
  if (!normalizedWorldId || !state.settings.debug) return null;

  state.settings.twW2 = normalizedWorldId >= 2 ? true : null;
  state.settings.twW3 = normalizedWorldId >= 3 ? true : null;
  state.settings.twW4 = normalizedWorldId >= 4 ? true : null;
  state.setTentacleWarsActiveWorldTab(normalizedWorldId);

  const worldEntryLevel = getTentacleWarsPreviewWorldEntryLevel(normalizedWorldId);
  if (worldEntryLevel) {
    state.setTentacleWarsCurrentLevel(worldEntryLevel.id);
  }

  state.saveSettings();
  return worldEntryLevel?.id || null;
}
