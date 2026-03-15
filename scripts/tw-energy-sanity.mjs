import assert from 'node:assert/strict';

import { advanceTentacleWarsLaneRuntime } from '../src/tentaclewars/TwPacketFlow.js';
import { computeTentacleWarsRefundValue } from '../src/tentaclewars/TwTentacleEconomy.js';
import {
  applyTentacleWarsNeutralCaptureProgress,
  computeTentacleWarsNeutralCaptureCost,
  resolveTentacleWarsHostileCapture,
  resolveTentacleWarsNeutralCapture,
} from '../src/tentaclewars/TwCaptureRules.js';
import {
  canTentacleWarsOverflow,
  distributeTentacleWarsOverflow,
} from '../src/tentaclewars/TwEnergyModel.js';

function testTentacleWarsOverflowRule() {
  assert.equal(canTentacleWarsOverflow(159, 160), false, 'Overflow should wait for full cap');
  assert.equal(canTentacleWarsOverflow(160, 160), true, 'Overflow should begin at full cap');

  const overflowStep = distributeTentacleWarsOverflow(4, 3);
  assert.deepEqual(overflowStep.laneOverflowShares, [4, 4, 4], 'Overflow should broadcast the full value to every outgoing lane');
  assert.equal(overflowStep.totalDistributedEnergy, 12, 'Overflow broadcast should duplicate value across outgoing lanes');

  const droppedOverflow = distributeTentacleWarsOverflow(4, 0);
  assert.equal(droppedOverflow.lostOverflowEnergy, 4, 'Overflow should be lost when no outgoing lane exists');
}

function testTentacleWarsCaptureAndRefundRule() {
  assert.equal(computeTentacleWarsNeutralCaptureCost(18), 8, 'Neutral capture cost should stay at forty percent with ceil rounding');
  assert.equal(applyTentacleWarsNeutralCaptureProgress(5, 4), 9, 'Neutral capture pressure should stack directly');

  const exactNeutralCapture = resolveTentacleWarsNeutralCapture(4, 4, 10);
  assert.equal(exactNeutralCapture.nextEnergy, 10, 'Exact-threshold neutral capture should keep the neutral energy pool');

  const hostileCapture = resolveTentacleWarsHostileCapture(3, 5);
  assert.equal(hostileCapture.nextEnergy, 18, 'Hostile capture should reset to ten and add offensive plus released outgoing carryover');

  assert.equal(computeTentacleWarsRefundValue(7.5, 4), 11.5, 'TentacleWars retract should refund build energy plus in-transit payload');
}

function testTentacleWarsPacketRuntime() {
  const laneStep = advanceTentacleWarsLaneRuntime({
    accumulatorUnits: 0.75,
    throughputPerSecond: 1.5,
    deltaSeconds: 1,
    sourceAvailableEnergy: 10,
    queuedPacketTravelTimes: [0.1],
    travelDurationSeconds: 0.5,
  });

  assert.equal(laneStep.emittedPacketCount, 2, 'Packet runtime should emit whole packets when enough throughput credit exists');
  assert.equal(laneStep.deliveredPacketCount, 1, 'Packet runtime should deliver expired in-flight packets');
  assert.equal(laneStep.nextQueuedPacketTravelTimes.length, 2, 'Packet runtime should keep newly emitted packets in transit');
}

function run(testName, testFn) {
  testFn();
  console.log(`PASS ${testName}`);
}

run('TentacleWars overflow rule stays canonical', testTentacleWarsOverflowRule);
run('TentacleWars capture and refund rules stay canonical', testTentacleWarsCaptureAndRefundRule);
run('TentacleWars packet runtime stays deterministic', testTentacleWarsPacketRuntime);

console.log('\n3/3 TentacleWars energy sanity checks passed');
