import assert from 'node:assert/strict';
import { TentState } from '../src/config/gameConfig.js';
import {
  advanceTwClash,
  advanceTwCutRetraction,
  applyTwSliceCut,
} from '../src/tentaclewars/TwCombat.js';

function makeChannel(overrides = {}) {
  const source = {
    energy: 50,
    id: 1,
    owner: 1,
    outCount: 1,
    excessFeed: 0,
    simulationMode: 'tentaclewars',
    tentFeedPerSec: 5,
  };
  const target = {
    energy: 50,
    maxE: 100,
    id: 2,
    owner: 2,
    simulationMode: 'tentaclewars',
  };
  return {
    state: TentState.ACTIVE,
    paidCost: 10,
    energyInPipe: 5,
    _burstPayload: 0,
    reachT: 1,
    startT: 0,
    clashT: null,
    clashVisualT: null,
    clashApproachActive: false,
    clashPartner: null,
    clashSpark: 0,
    packetAccumulatorUnits: 0,
    packetTravelQueue: [],
    travelDurationValue: 0.5,
    distanceValue: 200,
    pipeCapacity: 10,
    pipeAge: 0,
    flowRate: 0,
    maxBandwidth: 5,
    twCutRetraction: null,
    source,
    target,
    reversed: false,
    get effectiveSourceNode() { return this.reversed ? this.target : this.source; },
    get effectiveTargetNode() { return this.reversed ? this.source : this.target; },
    get travelDuration() { return this.travelDurationValue; },
    get distance() { return this.distanceValue; },
    game: { time: 0, tents: [] },
    ...overrides,
  };
}

function testApplyTwSliceCutSetsRetraction() {
  const channel = makeChannel({ paidCost: 10, energyInPipe: 5 });
  applyTwSliceCut(channel, 0.5, 15);
  assert.equal(channel.state, TentState.RETRACTING);
  assert.ok(channel.twCutRetraction !== null);
  assert.ok(channel.twCutRetraction.sourceShare > 0);
  assert.ok(channel.twCutRetraction.targetShare > 0);
}

function testApplyTwSliceCutClearsClashPartner() {
  const channel = makeChannel();
  const partner = makeChannel();
  channel.clashPartner = partner;
  partner.clashPartner = channel;
  applyTwSliceCut(channel, 0.5, 10);
  assert.equal(channel.clashPartner, null);
  assert.equal(partner.clashPartner, null);
}

function testAdvanceTwCutRetractionRefundsSource() {
  const channel = makeChannel({
    state: TentState.RETRACTING,
    reachT: 0.5,
    twCutRetraction: {
      cutRatio: 0.5, sourceShare: 10, targetShare: 5,
      sourceReleased: 0, targetReleased: 0,
      sourceFront: 0.5, targetFront: 0.5,
      initialSourceSpan: 0.5, initialTargetSpan: 0.5,
    },
  });
  const before = channel.effectiveSourceNode.energy;
  advanceTwCutRetraction(channel, 0.1);
  assert.ok(channel.effectiveSourceNode.energy > before);
}

function testAdvanceTwCutRetractionFinishes() {
  const channel = makeChannel({
    state: TentState.RETRACTING,
    reachT: 0.001,
    twCutRetraction: {
      cutRatio: 0.5, sourceShare: 0.001, targetShare: 0.001,
      sourceReleased: 0.0009, targetReleased: 0.0009,
      sourceFront: 0.0001, targetFront: 0.9999,
      initialSourceSpan: 0.5, initialTargetSpan: 0.5,
    },
  });
  advanceTwCutRetraction(channel, 0.5);
  assert.equal(channel.state, TentState.DEAD);
  assert.equal(channel.twCutRetraction, null);
}

function testAdvanceTwClashHandlesMissingPartner() {
  const channel = makeChannel({ clashPartner: null });
  advanceTwClash(channel, 0.1);
}

function testAdvanceTwClashUpdatesFlowRate() {
  const partner = makeChannel({
    source: {
      energy: 50, id: 2, owner: 2, outCount: 1, excessFeed: 0,
      simulationMode: 'tentaclewars', tentFeedPerSec: 5,
    },
  });
  const channel = makeChannel();
  channel.clashPartner = partner;
  partner.clashPartner = channel;
  advanceTwClash(channel, 0.1);
  assert.ok(Number.isFinite(channel.flowRate));
}

const tests = [
  testApplyTwSliceCutSetsRetraction,
  testApplyTwSliceCutClearsClashPartner,
  testAdvanceTwCutRetractionRefundsSource,
  testAdvanceTwCutRetractionFinishes,
  testAdvanceTwClashHandlesMissingPartner,
  testAdvanceTwClashUpdatesFlowRate,
];

let passed = 0;
for (const test of tests) {
  test();
  passed += 1;
}

console.log(`${passed}/${tests.length} TwCombat sanity checks passed`);
