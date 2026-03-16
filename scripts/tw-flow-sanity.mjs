import assert from 'node:assert/strict';
import { GAME_BALANCE } from '../src/config/gameConfig.js';
import {
  advanceTwFlow,
  applyTwPayloadToTarget,
  clearFlowState,
  getRelayFlowMultiplier,
} from '../src/tentaclewars/TwFlow.js';

function makeChannel(overrides = {}) {
  const source = {
    energy: 50,
    id: 1,
    owner: 1,
    outCount: 1,
    excessFeed: 0,
    simulationMode: 'tentaclewars',
  };
  const target = { energy: 20, maxE: 100, id: 2, owner: 2 };
  return {
    state: 'ACTIVE',
    maxBandwidth: 5,
    packetAccumulatorUnits: 0,
    packetTravelQueue: [],
    travelDurationValue: 0.5,
    energyInPipe: 0,
    pipeAge: 0,
    flowRate: 0,
    source,
    target,
    reversed: false,
    get effectiveSourceNode() { return this.reversed ? this.target : this.source; },
    get effectiveTargetNode() { return this.reversed ? this.source : this.target; },
    get travelDuration() { return this.travelDurationValue; },
    ...overrides,
  };
}

function testRelayMultiplierForNormalNode() {
  assert.equal(getRelayFlowMultiplier({ isRelay: false, owner: 1, inFog: false }), 1);
}

function testRelayMultiplierForOwnedRelay() {
  assert.equal(getRelayFlowMultiplier({ isRelay: true, owner: 1, inFog: false }), GAME_BALANCE.RELAY_FLOW_MULT);
}

function testRelayMultiplierForFoggedRelay() {
  assert.equal(getRelayFlowMultiplier({ isRelay: true, owner: 1, inFog: true }), 1);
}

function testApplyPayloadToAlliedTarget() {
  const channel = makeChannel();
  channel.effectiveTargetNode.owner = 1;
  applyTwPayloadToTarget(channel, channel.effectiveTargetNode, channel.effectiveSourceNode, 5);
  assert.ok(channel.effectiveTargetNode.energy > 20);
}

function testAdvanceTwFlowShowsActivity() {
  const channel = makeChannel({ packetAccumulatorUnits: 10 });
  channel.effectiveSourceNode.energy = 50;
  advanceTwFlow(channel, 0.1);
  const activity = channel.effectiveSourceNode.energy < 50 || channel.packetTravelQueue.length > 0;
  assert.ok(activity, 'channel advanced');
}

function testClearFlowStateClearsPipeFields() {
  const channel = makeChannel({
    energyInPipe: 5,
    pipeAge: 0.3,
    packetAccumulatorUnits: 2,
    packetTravelQueue: [0.1, 0.2],
  });
  clearFlowState(channel);
  assert.equal(channel.energyInPipe, 0);
  assert.equal(channel.pipeAge, 0);
  assert.equal(channel.packetAccumulatorUnits, 0);
  assert.equal(channel.packetTravelQueue.length, 0);
}

function testAdvanceTwFlowUpdatesFlowRate() {
  const channel = makeChannel({
    packetAccumulatorUnits: 0,
    packetTravelQueue: [0],
  });
  channel.effectiveTargetNode.owner = 1;
  advanceTwFlow(channel, 0.1);
  assert.ok(channel.flowRate > 0, 'flowRate updated');
}

const tests = [
  testRelayMultiplierForNormalNode,
  testRelayMultiplierForOwnedRelay,
  testRelayMultiplierForFoggedRelay,
  testApplyPayloadToAlliedTarget,
  testAdvanceTwFlowShowsActivity,
  testClearFlowStateClearsPipeFields,
  testAdvanceTwFlowUpdatesFlowRate,
];

let passed = 0;
for (const test of tests) {
  test();
  passed += 1;
}

console.log(`${passed}/${tests.length} TwFlow sanity checks passed`);
