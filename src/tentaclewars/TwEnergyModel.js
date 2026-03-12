/* ================================================================
   TentacleWars energy model

   Implements the TentacleWars overflow helpers. The mode only starts
   overflow at full cap, and the current fidelity target duplicates the
   full overflow value across each active outgoing lane.
   ================================================================ */

import { TW_BALANCE } from './TwBalance.js';

/*
 * Overflow only begins once the source cell is truly saturated, unless a
 * future tuning profile explicitly disables that requirement.
 */
export function canTentacleWarsOverflow(cellEnergy, maxEnergy, balance = TW_BALANCE) {
  if (!balance.OVERFLOW_REQUIRES_FULL_CAP) return true;

  const safeCellEnergy = Number.isFinite(cellEnergy) ? Math.max(0, cellEnergy) : 0;
  const safeMaxEnergy = Number.isFinite(maxEnergy) ? Math.max(0, maxEnergy) : 0;
  return safeCellEnergy >= safeMaxEnergy;
}

/*
 * Distribute incoming overflow energy across active outgoing lanes. The
 * current TentacleWars target broadcasts the full overflow value into
 * every active outgoing lane and drops it entirely when no lane exists.
 */
export function distributeTentacleWarsOverflow(
  overflowEnergy,
  outgoingLaneCount,
  balance = TW_BALANCE,
) {
  const safeOverflowEnergy = Number.isFinite(overflowEnergy) ? Math.max(0, overflowEnergy) : 0;
  const safeOutgoingLaneCount = Number.isFinite(outgoingLaneCount) ? Math.max(0, Math.floor(outgoingLaneCount)) : 0;

  if (safeOutgoingLaneCount <= 0 || safeOverflowEnergy <= 0) {
    return {
      laneOverflowShares: [],
      lostOverflowEnergy: safeOverflowEnergy,
      totalDistributedEnergy: 0,
    };
  }

  switch (balance.OVERFLOW_MODE) {
    case 'broadcast_full':
      return {
        laneOverflowShares: Array.from({ length: safeOutgoingLaneCount }, () => safeOverflowEnergy),
        lostOverflowEnergy: 0,
        totalDistributedEnergy: safeOverflowEnergy * safeOutgoingLaneCount,
      };
    case 'split_equal':
    default: {
      const overflowSharePerLane = safeOverflowEnergy / safeOutgoingLaneCount;
      return {
        laneOverflowShares: Array.from({ length: safeOutgoingLaneCount }, () => overflowSharePerLane),
        lostOverflowEnergy: 0,
        totalDistributedEnergy: safeOverflowEnergy,
      };
    }
  }
}
