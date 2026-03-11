/* ================================================================
   Auto-retract system

   Retracts isolated hostile lanes after sustained starvation. Allied
   support lines are intentionally ignored.
   ================================================================ */

import { bus } from '../../core/EventBus.js';
import { areHostileOwners } from '../OwnerTeams.js';

export class AutoRetractSystem {
  static update(game) {
    const nodes = game.nodes;
    const tentacles = game.tents;
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (!node.autoRetract) continue;
      node.autoRetract = false;
      let killedAny = false;
      for (let tentacleIndex = 0; tentacleIndex < tentacles.length; tentacleIndex += 1) {
        const tentacle = tentacles[tentacleIndex];
        if (tentacle.alive && !tentacle.reversed && tentacle.source === node && areHostileOwners(tentacle.target.owner, node.owner)) {
          tentacle.kill();
          killedAny = true;
        }
      }
      if (node.owner === 1 && killedAny) {
        bus.emit('autoretract', node);
      }
    }
  }
}
