import assert from 'node:assert/strict';
import { TentState } from '../src/config/gameConfig.js';
import {
  advanceLifecycle,
  beginBurst,
  collapseCommittedPayload,
  drainSourceEnergy,
  getCommittedPayload,
  partialRefund,
  retract,
  transfer,
} from '../src/tentaclewars/TwChannel.js';
import { commitOwnershipTransfer } from '../src/tentaclewars/TwNodeOps.js';

function makeChannel(overrides = {}) {
  const source = { energy: 50, id: 1, owner: 1, simulationMode: 'tentaclewars' };
  const target = { energy: 50, id: 2, maxE: 100, owner: 2, simulationMode: 'tentaclewars' };
  return {
    state: TentState.ACTIVE,
    paidCost: 10,
    energyInPipe: 5,
    _burstPayload: 0,
    startT: 0,
    reachT: 1,
    clashT: null,
    clashVisualT: null,
    clashApproachActive: false,
    clashPartner: null,
    source,
    target,
    reversed: false,
    get effectiveSourceNode() {
      return this.reversed ? this.target : this.source;
    },
    get effectiveTargetNode() {
      return this.reversed ? this.source : this.target;
    },
    get alive() {
      return this.state !== TentState.DEAD;
    },
    ...overrides,
  };
}

function testRetractRefundsCommittedPayload() {
  const channel = makeChannel();
  retract(channel);
  assert.equal(channel.source.energy, 65);
  assert.equal(channel.state, TentState.RETRACTING);
  assert.equal(channel.paidCost, 0);
  assert.equal(channel.energyInPipe, 0);
}

function testRetractAdvancesClashPartner() {
  const partner = makeChannel({ state: TentState.ACTIVE, reachT: 0.2 });
  const channel = makeChannel({ clashPartner: partner, clashT: 0.4, reachT: 0.6 });
  partner.clashPartner = channel;
  retract(channel);
  assert.equal(channel.clashPartner, null);
  assert.equal(partner.clashPartner, null);
  assert.equal(partner.state, TentState.ADVANCING);
  assert.equal(partner.reachT, 1 - 0.6);
}

function testCollapseCommittedPayloadDestroysWithoutRefund() {
  const channel = makeChannel();
  collapseCommittedPayload(channel);
  assert.equal(channel.source.energy, 50);
  assert.equal(channel.state, TentState.RETRACTING);
  assert.equal(channel.paidCost, 0);
}

function testCollapseCommittedPayloadClearsClashPartner() {
  const partner = makeChannel({ state: TentState.ACTIVE, reachT: 0.2 });
  const channel = makeChannel({ clashPartner: partner, clashT: 0.3, reachT: 0.8 });
  partner.clashPartner = channel;
  collapseCommittedPayload(channel);
  assert.equal(channel.clashPartner, null);
  assert.equal(partner.clashPartner, null);
  assert.equal(partner.state, TentState.ADVANCING);
  assert.equal(partner.reachT, 1 - 0.3);
}

function testGetCommittedPayloadUsesBurstPayload() {
  const channel = makeChannel({ state: TentState.BURSTING, _burstPayload: 7, paidCost: 10, energyInPipe: 5 });
  assert.equal(getCommittedPayload(channel), 7);
}

function testGetCommittedPayloadUsesPipeAndCost() {
  const channel = makeChannel({ state: TentState.ACTIVE, paidCost: 9, energyInPipe: 6 });
  assert.equal(getCommittedPayload(channel), 15);
}

function testDrainSourceEnergyOnlyTouchesSource() {
  const channel = makeChannel();
  drainSourceEnergy(channel, 8);
  assert.equal(channel.source.energy, 42);
  assert.equal(channel.paidCost, 10);
  assert.equal(channel.energyInPipe, 5);
}

function testPartialRefundOnlyCreditsSource() {
  const channel = makeChannel();
  partialRefund(channel, 4);
  assert.equal(channel.source.energy, 54);
  assert.equal(channel.state, TentState.ACTIVE);
}

function testBeginBurstSetsBurstState() {
  const channel = makeChannel();
  beginBurst(channel, 13, 0.25);
  assert.equal(channel.state, TentState.BURSTING);
  assert.equal(channel._burstPayload, 13);
  assert.equal(channel.startT, 0.25);
}

function testTransferMovesEnergyBetweenNodes() {
  const channel = makeChannel();
  transfer(channel, 6);
  assert.equal(channel.source.energy, 44);
  assert.equal(channel.target.energy, 56);
}

function testAdvanceLifecyclePromotesGrowingToActive() {
  const channel = makeChannel({
    state: TentState.GROWING,
    reachT: 0.99,
    buildCost: 10,
    paidCost: 9.9,
    distance: 10,
    source: { energy: 10, id: 1 },
  });
  advanceLifecycle(channel, 1);
  assert.equal(channel.state, TentState.ACTIVE);
  assert.equal(channel.pipeAge, 0);
}

function testAdvanceLifecyclePromotesRetractingToDead() {
  const channel = makeChannel({
    state: TentState.RETRACTING,
    reachT: 0.01,
    distance: 10,
  });
  advanceLifecycle(channel, 1);
  assert.equal(channel.state, TentState.DEAD);
}

function testAdvanceLifecyclePromotesAdvancingToActive() {
  const channel = makeChannel({
    state: TentState.ADVANCING,
    reachT: 0.99,
    distance: 10,
    travelDuration: 3,
  });
  advanceLifecycle(channel, 1);
  assert.equal(channel.state, TentState.ACTIVE);
  assert.equal(channel.pipeAge, 3);
}

function testAdvanceLifecyclePromotesBurstingToDead() {
  const channel = makeChannel({
    state: TentState.BURSTING,
    startT: 0.99,
    distance: 10,
    _burstPayload: 8,
  });
  channel.effectiveTargetNode.owner = 1;
  advanceLifecycle(channel, 1);
  assert.equal(channel.state, TentState.DEAD);
  assert.equal(channel.effectiveTargetNode.energy, 58);
}

function testAdvanceLifecycleDeadIsNoOp() {
  const channel = makeChannel({
    state: TentState.DEAD,
    age: 2,
  });
  advanceLifecycle(channel, 1);
  assert.equal(channel.age, 2);
}

function testCommitOwnershipTransfer() {
  const node = {
    owner: 2,
    energy: 80,
    regen: 5,
    contest: { 1: 10 },
    syncLevelFromEnergy() {
      this._synced = true;
    },
  };
  commitOwnershipTransfer(node, 1, 10);
  assert.equal(node.owner, 1);
  assert.equal(node.energy, 10);
  assert.equal(node.regen, 0);
  assert.equal(node.contest, null);
  assert.equal(node._synced, true);
}

const tests = [
  testRetractRefundsCommittedPayload,
  testRetractAdvancesClashPartner,
  testCollapseCommittedPayloadDestroysWithoutRefund,
  testCollapseCommittedPayloadClearsClashPartner,
  testGetCommittedPayloadUsesBurstPayload,
  testGetCommittedPayloadUsesPipeAndCost,
  testDrainSourceEnergyOnlyTouchesSource,
  testPartialRefundOnlyCreditsSource,
  testBeginBurstSetsBurstState,
  testTransferMovesEnergyBetweenNodes,
  testAdvanceLifecyclePromotesGrowingToActive,
  testAdvanceLifecyclePromotesRetractingToDead,
  testAdvanceLifecyclePromotesAdvancingToActive,
  testAdvanceLifecyclePromotesBurstingToDead,
  testAdvanceLifecycleDeadIsNoOp,
  testCommitOwnershipTransfer,
];

let passed = 0;
for (const test of tests) {
  test();
  passed += 1;
}

console.log(`${passed}/${tests.length} TwChannel sanity checks passed`);
