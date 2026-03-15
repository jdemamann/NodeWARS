/* ================================================================
   TentacleWars presentation helpers

   Owns mode-specific UI wording for grade and slot surfaces so the
   sandbox does not leak NodeWARS progression semantics into cards.
   ================================================================ */

import { buildTentacleWarsGradeTable } from './TwGradeTable.js';

const TW_GRADE_TABLE = buildTentacleWarsGradeTable();

/* Normalize TentacleWars labels into stable UI display case. */
function toDisplayCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* Resolve the human-facing TentacleWars grade label for cards and debug UI. */
export function getTentacleWarsGradeDisplayName(gradeIndex) {
  const gradeEntry = TW_GRADE_TABLE[Math.max(0, Math.min(gradeIndex, TW_GRADE_TABLE.length - 1))];
  return toDisplayCase(gradeEntry.gradeName);
}

/* Expose the current grade thresholds so cards can describe the live band. */
export function getTentacleWarsGradeDisplayThresholds(gradeIndex) {
  const gradeEntry = TW_GRADE_TABLE[Math.max(0, Math.min(gradeIndex, TW_GRADE_TABLE.length - 1))];
  return {
    ascendThreshold: gradeEntry.ascendThreshold,
    descendThreshold: gradeEntry.descendThreshold,
  };
}

/* Return the full grade presentation payload for TentacleWars cards and HUD. */
export function getTentacleWarsGradePresentation(gradeIndex) {
  const gradeEntry = TW_GRADE_TABLE[Math.max(0, Math.min(gradeIndex, TW_GRADE_TABLE.length - 1))];
  return {
    displayName: toDisplayCase(gradeEntry.gradeName),
    ascendThreshold: gradeEntry.ascendThreshold,
    descendThreshold: gradeEntry.descendThreshold,
    packetRatePerSecond: gradeEntry.packetRatePerSecond,
    maxTentacleSlots: gradeEntry.maxTentacleSlots,
  };
}

/* Present slot availability using TentacleWars semantics: remaining capacity first. */
export function getTentacleWarsSlotAvailability(node, activeOutgoingTentacles) {
  const totalSlots = node?.maxSlots || 0;
  const usedSlots = Math.max(0, activeOutgoingTentacles || 0);
  return {
    totalSlots,
    usedSlots,
    availableSlots: Math.max(0, totalSlots - usedSlots),
  };
}
