/* ================================================================
   TentacleWars sandbox end-state rules

   Encapsulates the prototype win/lose conditions so the TentacleWars
   branch can validate its own loop without reusing campaign result
   progression or authored-level assumptions.
   ================================================================ */

import { areHostileOwners } from '../systems/OwnerTeams.js';

/*
 * The first TentacleWars sandbox uses a simple end condition:
 * - win when no hostile real nodes remain
 * - lose when the player has no real nodes left
 * Relays are excluded so prototype flow stays aligned with cell control.
 */
export function computeTentacleWarsSandboxOutcome(nodes) {
  const realNodes = nodes.filter(node => !node.isRelay);
  const playerNodeCount = realNodes.filter(node => node.owner === 1).length;
  const hostileNodeCount = realNodes.filter(node => areHostileOwners(node.owner, 1)).length;

  if (hostileNodeCount === 0) return 'win';
  if (playerNodeCount === 0) return 'lose';
  return null;
}
