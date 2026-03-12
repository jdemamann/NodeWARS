/* ================================================================
   TentacleWars grade table

   Owns grade thresholds, hysteresis, and per-grade packet throughput
   for the TentacleWars mode. This module is pure so tests can lock the
   fidelity table down before the sandbox simulation is wired in.
   ================================================================ */

import { clamp } from '../math/simulationMath.js';
import { TW_BALANCE } from './TwBalance.js';

export const TW_GRADE_NAMES = ['spore', 'embryo', 'pulsar', 'gamma', 'solar', 'dominator'];

/*
 * Resolve the highest grade index allowed by the configured threshold
 * table. Grade zero remains the fallback even below the first ascend
 * threshold, matching the original game's lowest-form behavior.
 */
export function computeTentacleWarsGradeFromEnergy(energy, previousGrade = null, balance = TW_BALANCE) {
  const { GRADE_ASCEND_THRESHOLDS, GRADE_DESCEND_THRESHOLDS } = balance;
  const highestGradeIndex = GRADE_ASCEND_THRESHOLDS.length - 1;
  const clampedPreviousGrade = previousGrade == null ? null : clamp(previousGrade, 0, highestGradeIndex);

  if (clampedPreviousGrade == null) {
    let gradeIndex = 0;
    for (let candidateIndex = 1; candidateIndex <= highestGradeIndex; candidateIndex += 1) {
      if (energy >= GRADE_ASCEND_THRESHOLDS[candidateIndex]) gradeIndex = candidateIndex;
    }
    return gradeIndex;
  }

  let gradeIndex = clampedPreviousGrade;
  while (gradeIndex < highestGradeIndex && energy >= GRADE_ASCEND_THRESHOLDS[gradeIndex + 1]) {
    gradeIndex += 1;
  }
  while (gradeIndex > 0 && energy < GRADE_DESCEND_THRESHOLDS[gradeIndex]) {
    gradeIndex -= 1;
  }
  return gradeIndex;
}

/*
 * Map a resolved grade index to packet throughput. Dominator reuses the
 * last non-Dominator rate and scales it by a dedicated multiplier so the
 * top grade can be tuned independently without redefining the whole table.
 */
export function getTentacleWarsPacketRateForGrade(gradeIndex, balance = TW_BALANCE) {
  const highestGradeIndex = TW_GRADE_NAMES.length - 1;
  const clampedGradeIndex = clamp(gradeIndex, 0, highestGradeIndex);
  const highestBaseGradeIndex = balance.GRADE_PACKET_RATE_PER_SEC.length - 1;

  if (clampedGradeIndex >= highestGradeIndex) {
    return balance.GRADE_PACKET_RATE_PER_SEC[highestBaseGradeIndex] * balance.DOMINATOR_PACKET_MULT;
  }
  return balance.GRADE_PACKET_RATE_PER_SEC[Math.min(clampedGradeIndex, highestBaseGradeIndex)];
}

/*
 * TentacleWars supports up to three simultaneous outgoing tentacles per cell
 * in the current fidelity target, independent of the NodeWARS slot table.
 */
export function getTentacleWarsMaxTentacleSlots(balance = TW_BALANCE) {
  return balance.MAX_TENTACLE_SLOTS || 3;
}

/*
 * Expose a normalized table object for render, debug, and UI surfaces
 * that need one source of truth for names, thresholds, and throughput.
 */
export function buildTentacleWarsGradeTable(balance = TW_BALANCE) {
  return TW_GRADE_NAMES.map((gradeName, gradeIndex) => ({
    gradeName,
    gradeIndex,
    ascendThreshold: balance.GRADE_ASCEND_THRESHOLDS[gradeIndex],
    descendThreshold: balance.GRADE_DESCEND_THRESHOLDS[gradeIndex],
    packetRatePerSecond: getTentacleWarsPacketRateForGrade(gradeIndex, balance),
  }));
}
