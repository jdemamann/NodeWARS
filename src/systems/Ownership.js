/* ================================================================
   Ownership transitions

   Canonical ownership change helpers. Captured nodes always drop their
   old outgoing commitments, while incoming pressure continues to
   resolve naturally on the next simulation tick.
   ================================================================ */

import { bus } from '../core/EventBus.js';
import { isPlayerEnemyOwner } from './OwnerTeams.js';

/* Retract or collapse outgoing commitments rooted at the captured node. */
export function retractInvalidTentaclesAfterOwnershipChange(game, node, newOwner, {
  suppressRefundOnOutgoingTentacles = false,
} = {}) {
  if (!game) return;
  let releasedOutgoingEnergy = 0;

  /* Ownership changes do not inherit the old owner's outgoing commitments.
     Any tentacle whose effective source was the captured node must collapse,
     even if the target is now allied with the new owner. Incoming lanes from
     other nodes stay alive and are re-evaluated naturally by tentacle combat
     on the next update tick. */
  game.tents
    .filter(tent => tent.alive && tent.effectiveSourceNode === node)
    .forEach(tent => {
      if (suppressRefundOnOutgoingTentacles) {
        releasedOutgoingEnergy += tent.getCommittedPayloadForOwnershipCleanup?.() || 0;
        tent.collapseForOwnershipLoss?.();
        return;
      }
      tent.kill();
    });

  return releasedOutgoingEnergy;
}

/* Apply the capture flip and then clean up outgoing commitments from the old owner. */
export function applyOwnershipChange({
  game,
  node,
  newOwner,
  startingEnergy,
  previousOwner,
  wasNeutralCapture = false,
  attackerOwner = null,
  suppressOutgoingTentacleRefunds = false,
}) {
  node.owner = newOwner;
  node.regen = 0;
  node.energy = startingEnergy;
  node.cFlash = 1;
  node.contest = null;
  node.shieldFlash = 0;
  node.syncLevelFromEnergy?.();

  if (game) game.fogDirty = true;

  bus.emit('node:owner_change', node, previousOwner);

  if (wasNeutralCapture) {
    bus.emit('node:capture', node);
  } else {
    if (isPlayerEnemyOwner(attackerOwner) && previousOwner === 1) bus.emit('cell:lost', node);
    if (attackerOwner === 1 && isPlayerEnemyOwner(previousOwner)) bus.emit('cell:killed_enemy', node);
  }

  retractInvalidTentaclesAfterOwnershipChange(game, node, newOwner, {
    suppressRefundOnOutgoingTentacles: suppressOutgoingTentacleRefunds,
  });
}
