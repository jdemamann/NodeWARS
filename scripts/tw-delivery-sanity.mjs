import assert from 'node:assert/strict';
import {
  applyTwEnemyAttack,
  applyTwFriendlyDelivery,
  applyTwNeutralCapture,
  markNodeUnderAttack,
} from '../src/tentaclewars/TwDelivery.js';

function makeTarget(overrides = {}) {
  return {
    energy: 20,
    maxE: 30,
    owner: 0,
    contest: null,
    cFlash: 0,
    pendingExcessFeed: 0,
    inFlow: 0,
    captureThreshold: 5,
    ...overrides,
  };
}

function makeChannel(overrides = {}) {
  return {
    game: { tents: [], fogDirty: false },
    ...overrides,
  };
}

function testFriendlyDeliveryCapsAtMaxEnergy() {
  const target = makeTarget({ owner: 1, energy: 25 });
  const delivered = applyTwFriendlyDelivery(target, 10);
  assert.equal(target.energy, 30);
  assert.equal(delivered, 10);
}

function testFriendlyDeliveryRoutesOverflowToPendingExcessFeed() {
  const target = makeTarget({ owner: 1, energy: 29, pendingExcessFeed: 2 });
  applyTwFriendlyDelivery(target, 4);
  assert.equal(target.energy, 30);
  assert.equal(target.pendingExcessFeed, 5);
  assert.equal(target.inFlow, 4);
}

function testNeutralCaptureAdvancesProgressAndFlash() {
  const channel = makeChannel();
  const source = { owner: 1 };
  const target = makeTarget({ owner: 0, contest: { 1: 1 }, cFlash: 0 });
  const delivered = applyTwNeutralCapture(channel, target, source, 2);
  assert.equal(delivered, 2);
  assert.equal(target.contest[1], 3);
  assert.ok(target.cFlash >= 0.35);
}

function testNeutralCaptureTriggersCaptureWhenThresholdReached() {
  const channel = makeChannel();
  const source = { owner: 1 };
  const target = makeTarget({ owner: 0, contest: { 1: 4 }, captureThreshold: 5, energy: 10, maxE: 30 });
  applyTwNeutralCapture(channel, target, source, 2);
  // Threshold met (contest[1]=6 >= 5): ownership transitions through TwOwnership
  assert.equal(target.owner, 1);
}

function testEnemyAttackSubtractsEnergy() {
  const channel = makeChannel();
  const source = { owner: 1 };
  const target = makeTarget({ owner: 2, energy: 9 });
  const delivered = applyTwEnemyAttack(channel, target, source, 3);
  assert.equal(delivered, 3);
  assert.equal(target.energy, 6);
}

function testMarkNodeUnderAttackSetsFlag() {
  const target = makeTarget({ underAttack: 0 });
  markNodeUnderAttack(target);
  assert.equal(target.underAttack, 1);
}

const tests = [
  testFriendlyDeliveryCapsAtMaxEnergy,
  testFriendlyDeliveryRoutesOverflowToPendingExcessFeed,
  testNeutralCaptureAdvancesProgressAndFlash,
  testNeutralCaptureTriggersCaptureWhenThresholdReached,
  testEnemyAttackSubtractsEnergy,
  testMarkNodeUnderAttackSetsFlag,
];

let passed = 0;
for (const test of tests) {
  test();
  passed += 1;
}

console.log(`${passed}/${tests.length} TwDelivery sanity checks passed`);
