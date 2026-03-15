/* ================================================================
   TentacleWars campaign fixtures

   Provides the authored TentacleWars campaign slice currently present
   in the repo so loader, sanity, and progression checks can run
   against the real World 1 + World 2 packs.
   ================================================================ */

import { TW_WORLD_1_LEVELS } from './levels/TwWorld1.js';
import { TW_WORLD_2_LEVELS } from './levels/TwWorld2.js';
import { TW_WORLD_3_LEVELS } from './levels/TwWorld3.js';
import { TW_WORLD_4_LEVELS } from './levels/TwWorld4.js';

export const TW_CAMPAIGN_FIXTURE_LEVELS = Object.freeze([
  ...TW_WORLD_1_LEVELS,
  ...TW_WORLD_2_LEVELS,
  ...TW_WORLD_3_LEVELS,
  ...TW_WORLD_4_LEVELS,
]);

/* Resolves one authored TentacleWars level by its stable campaign id. */
export function getTentacleWarsCampaignLevelById(levelId) {
  if (typeof levelId !== 'string') return null;
  const normalizedLevelId = levelId.trim().toUpperCase();
  return TW_CAMPAIGN_FIXTURE_LEVELS.find(level => level.id === normalizedLevelId) || null;
}

/* Derives the phase-1 silver threshold from the progression spec. */
export function getTentacleWarsSilverPar(par) {
  return Math.ceil(par * 1.35);
}
