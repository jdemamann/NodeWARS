/* ================================================================
   Owner team helpers

   Centralises alliance and hostility rules between owners. Gameplay,
   AI, and rendering should all go through this module when they need
   to know whether two owners cooperate or fight.
   ================================================================ */

export function getOwnerTeamId(ownerId) {
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
