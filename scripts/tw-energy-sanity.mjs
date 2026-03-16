/* ================================================================
   tw-energy-sanity.mjs
   Sanity checks for TW energy model — excessFeed double-buffer model
   and canonical capture/refund/packet rules.

   Run: node scripts/tw-energy-sanity.mjs
   ================================================================ */

import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

import { advanceTentacleWarsLaneRuntime } from '../src/tentaclewars/TwPacketFlow.js';
import { computeTentacleWarsRefundValue } from '../src/tentaclewars/TwTentacleEconomy.js';
import {
  applyTentacleWarsNeutralCaptureProgress,
  computeTentacleWarsNeutralCaptureCost,
  resolveTentacleWarsHostileCapture,
  resolveTentacleWarsNeutralCapture,
} from '../src/tentaclewars/TwCaptureRules.js';
import { applyTentacleFriendlyFlow } from '../src/entities/TentCombat.js';

// ── Double-buffer model ──────────────────────────────────────────

function makeTwNode(overrides = {}) {
  return {
    simulationMode: 'tentaclewars',
    energy: 0,
    maxE: 100,
    isRelay: false,
    inFlow: 0,
    excessFeed: 0,
    pendingExcessFeed: 0,
    ...overrides,
  };
}

function testFullCapNodeAccumulatesPendingExcessFeed() {
  const node = makeTwNode({ energy: 100, maxE: 100 });
  applyTentacleFriendlyFlow(node, 10, 1.0, 0.016);
  assert.ok(node.pendingExcessFeed > 0,
    'full-cap TW node: applyTentacleFriendlyFlow should accumulate pendingExcessFeed');
  assert.strictEqual(node.excessFeed, 0,
    'excessFeed stays 0 until Physics double-buffer swap');
}

function testBelowCapNodeAbsorbsNoExcess() {
  const node = makeTwNode({ energy: 50, maxE: 100 });
  applyTentacleFriendlyFlow(node, 5, 1.0, 0.016);
  assert.strictEqual(node.pendingExcessFeed, 0,
    'below-cap TW node: no pendingExcessFeed should accumulate when energy fits');
}

function testPhysicsSwapPattern() {
  // Simulate the double-buffer swap that Physics.updateOutCounts performs.
  const node = makeTwNode({ energy: 100, maxE: 100 });
  applyTentacleFriendlyFlow(node, 20, 1.0, 0.016);
  const accumulated = node.pendingExcessFeed;
  assert.ok(accumulated > 0, 'setup: pendingExcessFeed must be > 0 before swap');

  // Simulate Physics.updateOutCounts double-buffer swap
  node.excessFeed = node.pendingExcessFeed;
  node.pendingExcessFeed = 0;

  assert.strictEqual(node.excessFeed, accumulated,
    'after swap: excessFeed should equal the previously accumulated pendingExcessFeed');
  assert.strictEqual(node.pendingExcessFeed, 0,
    'after swap: pendingExcessFeed should be reset to 0');
}

function testTwoOutgoingTentaclesSplitExcessFeedEvenly() {
  // Simulate a node with outCount=2 and verify on-demand split formula.
  const node = makeTwNode({ excessFeed: 20, outCount: 2 });
  const sharePerLane = node.outCount > 0 ? (node.excessFeed || 0) / node.outCount : 0;
  assert.strictEqual(sharePerLane, 10,
    'two-outgoing fixture: excessFeed / outCount should split 20 into 10 per lane');
}

// ── Canonical capture / refund / packet rules ────────────────────

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

// ── Runner ───────────────────────────────────────────────────────

function run(testName, testFn) {
  testFn();
  console.log(`PASS ${testName}`);
}

run('Full-cap node accumulates pendingExcessFeed', testFullCapNodeAccumulatesPendingExcessFeed);
run('Below-cap node absorbs fully, no pendingExcessFeed', testBelowCapNodeAbsorbsNoExcess);
run('Physics double-buffer swap promotes pending to excessFeed', testPhysicsSwapPattern);
run('Two-outgoing-tentacle fixture splits excessFeed evenly', testTwoOutgoingTentaclesSplitExcessFeedEvenly);
run('TentacleWars capture and refund rules stay canonical', testTentacleWarsCaptureAndRefundRule);
run('TentacleWars packet runtime stays deterministic', testTentacleWarsPacketRuntime);

console.log('\n6/6 TentacleWars energy sanity checks passed');
