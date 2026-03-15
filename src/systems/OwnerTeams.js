/* ================================================================
   Owner team helpers

   Centralises alliance and hostility rules between owners. Gameplay,
   AI, and rendering should all go through this module when they need
   to know whether two owners cooperate or fight.
   ================================================================ */

import { STATE } from '../core/GameState.js';
import { TW_BALANCE } from '../tentaclewars/TwBalance.js';

/*
 * NodeWARS keeps red and purple as one coalition. TentacleWars mode can
 * switch that relationship through its own balance surface without forking
 * every caller that asks whether two owners are allied or hostile.
 */
function getActiveEnemyRelationMode() {
  if (STATE.getGameMode() !== 'tentaclewars') return 'coalition';
  return TW_BALANCE.ENEMY_RELATION_MODE || 'all_hostile';
}

export function getOwnerTeamId(ownerId) {
  if (getActiveEnemyRelationMode() === 'all_hostile') {
    if (ownerId === 1 || ownerId === 2 || ownerId === 3) return ownerId;
    return 0;
  }
  if (ownerId === 1) return 1;
  if (ownerId === 2 || ownerId === 3) return 2;
  return 0;
}

export function areAlliedOwners(leftOwnerId, rightOwnerId) {
  if (leftOwnerId === 0 || rightOwnerId === 0) return false;
  return getOwnerTeamId(leftOwnerId) === getOwnerTeamId(rightOwnerId);
}

export function areHostileOwners(leftOwnerId, rightOwnerId) {
  if (leftOwnerId === 0 || rightOwnerId === 0) return false;
  return !areAlliedOwners(leftOwnerId, rightOwnerId);
}

export function isPlayerEnemyOwner(ownerId) {
  return areHostileOwners(1, ownerId);
}
