/* ================================================================
   Tent local rules

   Small pure helpers used by Tent.js for cut classification and
   growing-state collision detection.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import { areAlliedOwners } from '../systems/OwnerTeams.js';

export function classifyTentacleCut(cutRatio, cutRules) {
  return {
    isKamikaze: cutRatio !== undefined && cutRatio < cutRules.BURST_MAX_RATIO,
    isRefund: cutRatio === undefined || cutRatio > cutRules.REFUND_MIN_RATIO,
    isMiddle:
      cutRatio !== undefined &&
      cutRatio >= cutRules.BURST_MAX_RATIO &&
      cutRatio <= cutRules.REFUND_MIN_RATIO,
  };
}

export function resolveGrowingTentacleCollision(tentacle, tents) {
  // Detect the first hostile mirrored growth pair and promote both lanes into
  // the active clash state once their combined reach covers the lane.
  for (let i = 0; i < tents.length; i++) {
    const opposingTentacle = tents[i];
    if (opposingTentacle === tentacle || opposingTentacle.state !== TentState.GROWING) continue;
    if (opposingTentacle.source !== tentacle.target || opposingTentacle.target !== tentacle.source) continue;
    if (areAlliedOwners(opposingTentacle.effectiveSourceNode.owner, tentacle.effectiveSourceNode.owner)) continue;
    if (tentacle.reachT + opposingTentacle.reachT < 1.0) continue;

    opposingTentacle.reachT = 1.0 - tentacle.reachT;
    tentacle.state = TentState.ACTIVE;
    opposingTentacle.state = TentState.ACTIVE;
    tentacle.clashT = tentacle.reachT;
    opposingTentacle.clashT = opposingTentacle.reachT;
    tentacle.pipeAge = tentacle.reachT * tentacle.travelDuration;
    opposingTentacle.pipeAge = opposingTentacle.reachT * opposingTentacle.travelDuration;
    tentacle.clashPartner = opposingTentacle;
    opposingTentacle.clashPartner = tentacle;
    /* In TentacleWars, animate the visual clash front from the collision point
       toward the midpoint so the "meeting" moment is visible rather than
       snapping instantly to 0.5. */
    if (tentacle.effectiveSourceNode?.simulationMode === 'tentaclewars') {
      tentacle.initializeFreshClashVisual(tentacle.reachT);
      opposingTentacle.initializeFreshClashVisual(opposingTentacle.reachT);
    }
    return true;
  }

  return false;
}
