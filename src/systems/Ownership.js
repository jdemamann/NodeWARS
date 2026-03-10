import { bus } from '../core/EventBus.js';
import { areAlliedOwners, isPlayerEnemyOwner } from './OwnerTeams.js';

export function retractInvalidTentaclesAfterOwnershipChange(game, node, newOwner) {
  if (!game) return;

  game.tents
    .filter(tent => tent.alive && tent.effectiveSourceNode === node && !areAlliedOwners(tent.effectiveTargetNode.owner, newOwner))
    .forEach(tent => tent.kill());

  game.tents
    .filter(tent => tent.alive && tent.effectiveTargetNode === node && !areAlliedOwners(tent.effectiveSourceNode.owner, newOwner))
    .forEach(tent => tent.kill());
}

export function applyOwnershipChange({
  game,
  node,
  newOwner,
  startingEnergy,
  previousOwner,
  wasNeutralCapture = false,
  attackerOwner = null,
}) {
  node.owner = newOwner;
  node.regen = 0;
  node.energy = startingEnergy;
  node.cFlash = 1;
  node.contest = null;
  node.shieldFlash = 0;

  if (game) game.fogDirty = true;

  bus.emit('node:owner_change', node, previousOwner);

  if (wasNeutralCapture) {
    bus.emit('node:capture', node);
  } else {
    if (isPlayerEnemyOwner(attackerOwner) && previousOwner === 1) bus.emit('cell:lost', node);
    if (attackerOwner === 1 && isPlayerEnemyOwner(previousOwner)) bus.emit('cell:killed_enemy', node);
  }

  retractInvalidTentaclesAfterOwnershipChange(game, node, newOwner);
}
