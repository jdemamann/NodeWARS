import assert from 'node:assert/strict';

import {
  TW_GRADE_NAMES,
  buildTentacleWarsGradeTable,
  computeTentacleWarsGradeFromEnergy,
  getTentacleWarsMaxTentacleSlots,
  getTentacleWarsPacketRateForGrade,
} from '../src/tentaclewars/TwGradeTable.js';

function testTentacleWarsGradeTable() {
  const gradeTable = buildTentacleWarsGradeTable();
  const slotCaps = gradeTable.map(entry => entry.maxTentacleSlots);

  assert.equal(TW_GRADE_NAMES.length, 6, 'TentacleWars should expose six grades including Dominator');
  assert.equal(gradeTable[0].ascendThreshold, 15, 'Grade 1 ascend threshold should stay at fifteen');
  assert.equal(gradeTable[5].ascendThreshold, 180, 'Dominator ascend threshold should stay at one-hundred-eighty');
  assert.equal(gradeTable[5].descendThreshold, 160, 'Dominator descend threshold should stay at one-hundred-sixty');
  assert.equal(getTentacleWarsPacketRateForGrade(5), 6, 'Dominator should emit double the grade-five packet rate');
  assert.deepEqual(slotCaps, [1, 2, 2, 2, 3, 3], 'TentacleWars should freeze the authoritative slot table by grade');
  assert.equal(getTentacleWarsMaxTentacleSlots(0), 1, 'Spore should allow one outgoing tentacle');
  assert.equal(getTentacleWarsMaxTentacleSlots(1), 2, 'Embryo should allow two outgoing tentacles');
  assert.equal(getTentacleWarsMaxTentacleSlots(4), 3, 'Solar should allow three outgoing tentacles');
}

function testTentacleWarsGradeHysteresis() {
  assert.equal(computeTentacleWarsGradeFromEnergy(14), 0, 'Energy below fifteen should remain in the lowest grade');
  assert.equal(computeTentacleWarsGradeFromEnergy(15), 0, 'Energy at fifteen should stay in the first TentacleWars grade');
  assert.equal(computeTentacleWarsGradeFromEnergy(40), 1, 'Energy at forty should ascend into the second TentacleWars grade');
  assert.equal(computeTentacleWarsGradeFromEnergy(180), 5, 'Energy at one-hundred-eighty should ascend into Dominator');
  assert.equal(computeTentacleWarsGradeFromEnergy(159, 5), 4, 'Dominator should descend once energy drops below one-hundred-sixty');
  assert.equal(computeTentacleWarsGradeFromEnergy(31, 2), 1, 'Grade hysteresis should step down only as far as the descend thresholds require');
}

function run(testName, testFn) {
  testFn();
  console.log(`PASS ${testName}`);
}

run('TentacleWars grade table stays canonical', testTentacleWarsGradeTable);
run('TentacleWars grade hysteresis stays canonical', testTentacleWarsGradeHysteresis);

console.log('\n2/2 TentacleWars grade sanity checks passed');
