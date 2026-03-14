/* ================================================================
   TentacleWars campaign fixtures

   Provides the bootstrap sanity pack that mixes the authored World 1
   prototype subset with a narrow future-world anchor so campaign
   ordering and purple-intro checks can run before all worlds exist.
   ================================================================ */

import { TW_WORLD_1_LEVELS } from './levels/TwWorld1.js';

export const TW_CAMPAIGN_FIXTURE_LEVELS = Object.freeze([
  ...TW_WORLD_1_LEVELS,
  Object.freeze({
    id: 'W2-01',
    world: 2,
    phase: 1,
    energyCap: 120,
    cells: [
      { id: 'p1', owner: 'player', initialEnergy: 14, x: 0.14, y: 0.50 },
      { id: 'r1', owner: 'red', initialEnergy: 24, x: 0.54, y: 0.28 },
      { id: 'r2', owner: 'red', initialEnergy: 24, x: 0.54, y: 0.72 },
      { id: 'u1', owner: 'purple', initialEnergy: 32, x: 0.82, y: 0.50 },
    ],
    obstacles: [],
    winCondition: 'all_hostiles_converted',
    par: 80,
    introMechanicTags: ['purple-intro'],
  }),
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
