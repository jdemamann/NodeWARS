/* ================================================================
   TentacleWars neutral capture

   Owns the mode-specific neutral contest bookkeeping for TentacleWars.
   This keeps the sandbox capture race separate from the shared NodeWARS
   coalition helpers while preserving future hostility parameterization.
   ================================================================ */

import { areAlliedOwners } from '../systems/OwnerTeams.js';

const TW_CONTESTING_OWNERS = [1, 2, 3];

/*
 * Read one owner's current TentacleWars neutral-capture progress.
 */
export function getTentacleWarsNeutralCaptureProgress(node, owner) {
  return node?.contest?.[owner] || 0;
}

/*
 * Replace one owner's TentacleWars neutral-capture progress without
 * disturbing the rest of the live contest state.
 */
export function setTentacleWarsNeutralCaptureProgress(node, owner, amount) {
  if (!node.contest) node.contest = {};
  node.contest[owner] = Math.max(0, amount || 0);
}

/*
 * TentacleWars neutral capture stacks allied pressure directly when the mode
 * hostility settings consider those owners allied.
 */
export function getTentacleWarsNeutralCaptureScore(node, owner) {
  if (!node?.contest) return 0;

  return TW_CONTESTING_OWNERS
    .filter(contestingOwner => areAlliedOwners(contestingOwner, owner))
    .reduce((sum, contestingOwner) => sum + (node.contest[contestingOwner] || 0), 0);
}

/*
 * Keep ownership identity on the strongest allied contributor when allied
 * pressure is combined toward the same neutral node.
 */
export function getTentacleWarsNeutralCaptureOwner(node, owner) {
  const alliedEntries = TW_CONTESTING_OWNERS
    .map(contestingOwner => ({
      owner: contestingOwner,
      score: node?.contest?.[contestingOwner] || 0,
    }))
    .filter(entry => entry.score > 0 && areAlliedOwners(entry.owner, owner));

  if (!alliedEntries.length) return owner;

  alliedEntries.sort((leftEntry, rightEntry) => {
    if (rightEntry.score !== leftEntry.score) return rightEntry.score - leftEntry.score;
    if (leftEntry.owner === owner) return -1;
    if (rightEntry.owner === owner) return 1;
    return leftEntry.owner - rightEntry.owner;
  });
  return alliedEntries[0].owner;
}
