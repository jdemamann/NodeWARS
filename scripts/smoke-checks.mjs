import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const load = rel => import(path.join(ROOT, rel));

// ── TW clash test helpers ────────────────────────────────────────────────────

async function makeTwFixtures({ energyA = 50, energyB = 50, maxE = 60 } = {}) {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { Physics } = await load('src/systems/Physics.js');

  const sourceA = new GameNode(0, 0, 0, energyA, 1);
  const sourceB = new GameNode(1, 100, 0, energyB, 2);
  sourceA.maxE = maxE;
  sourceB.maxE = maxE;
  sourceA.simulationMode = 'tentaclewars';
  sourceB.simulationMode = 'tentaclewars';

  // _isCanonicalClashDriver uses this.source.id < this.target.id (original fields,
  // NOT effectiveSourceNode.id). With sourceA.id=0 < sourceB.id=1, tentA is canonical.
  // Neither tentacle has reversed=true in this fixture; reversed tentacles are out of scope.
  const tentA = new Tent(sourceA, sourceB, 0);
  const tentB = new Tent(sourceB, sourceA, 0);
  tentA.state = TentState.ACTIVE;
  tentB.state = TentState.ACTIVE;
  tentA.clashPartner = tentB;
  tentB.clashPartner = tentA;
  tentA.clashT = 0.5;
  tentB.clashT = 0.5;
  tentA.reachT = 1;
  tentB.reachT = 1;

  const game = { nodes: [sourceA, sourceB], tents: [tentA, tentB], _frame: 0, fogDirty: false };
  tentA.game = game;
  tentB.game = game;

  Physics.updateOutCounts(game);

  return { sourceA, sourceB, tentA, tentB, TentState };
}

async function testTwClashDamageAppliesToLosingNode() {
  const { sourceA, sourceB, tentA, tentB } = await makeTwFixtures({ energyA: 50, energyB: 50 });

  // Give sourceA an overflow boost so tentA wins
  sourceA.excessFeed = 5;

  const energyBefore = sourceB.energy;

  tentB._updateClashState(0.1); // non-canonical: Block A only
  tentA._updateClashState(0.1); // canonical: Block A + Block B

  // sourceB should have lost energy (net damage from A's advantage)
  assert.ok(
    sourceB.energy < energyBefore,
    `TW clash should drain losing source: expected < ${energyBefore}, got ${sourceB.energy}`,
  );
}

async function testTwClashThresholdTriggersRetractAndAdvance() {
  // Sub-case A: sourceB pre-starts below TW_RETRACT_CRITICAL_ENERGY (9 < 10).
  {
    const { sourceA, sourceB, tentA, tentB, TentState } = await makeTwFixtures({
      energyA: 50,
      energyB: 9, // starts below threshold
      maxE: 60,
    });

    sourceA.excessFeed = 10;

    tentB._updateClashState(0.1);
    tentA._updateClashState(0.1);

    assert.equal(tentB.state, TentState.RETRACTING,
      '[A] losing tentacle should auto-retract when source starts below TW_RETRACT_CRITICAL_ENERGY');
    assert.equal(tentA.state, TentState.ADVANCING,
      '[A] winning tentacle should auto-advance after enemy retracts');
    assert.equal(tentA.clashPartner, null, '[A] winning tentacle clash pair should be cleared');
    assert.equal(tentB.clashPartner, null, '[A] losing tentacle clash pair should be cleared');
    assert.equal(tentB.clashT, null, '[A] losing tentacle clashT should be nulled in step 3b');
  }

  // Sub-case B: sourceB starts at 12, large overflow crosses threshold from above.
  {
    const { sourceA, sourceB, tentA, tentB, TentState } = await makeTwFixtures({
      energyA: 50,
      energyB: 12,
      maxE: 60,
    });

    sourceA.excessFeed = 50;

    tentB._updateClashState(0.1);
    tentA._updateClashState(0.1);

    assert.ok(sourceB.energy < 10,
      '[B] sourceB energy should be below TW_RETRACT_CRITICAL_ENERGY after large overflow damage');
    assert.equal(tentB.state, TentState.RETRACTING,
      '[B] losing tentacle should auto-retract when damage crosses the critical threshold');
    assert.equal(tentA.state, TentState.ADVANCING,
      '[B] winning tentacle should auto-advance after crossing-the-threshold retract');
  }
}

async function testTwClashBidirectionalDamage() {
  // Canonical driver (tentA, source.id=0) is the WEAKER side.
  // tentB has large overflow → higher pressure → damage should flow to sourceA.
  const { tentA, tentB, sourceA, sourceB, TentState } = await makeTwFixtures({ energyA: 8, energyB: 50 });
  sourceB.excessFeed = 10; // opposing side has overflow advantage

  tentB._updateClashState(0.1); // non-canonical: Block A only
  tentA._updateClashState(0.1); // canonical: Block A + Block B

  assert.equal(tentA.state, TentState.RETRACTING,
    'canonical tentacle should retract when it is the weaker side');
  assert.equal(tentB.state, TentState.ADVANCING,
    'non-canonical tentacle should advance when it is the stronger side');
  assert.equal(tentA.clashT, null, 'losing tentacle clashT should be null after retract');
  assert.equal(tentB.clashT, null, 'winning tentacle clashT should be null after advance');
}

async function testTwClashFlowRateStaysAliveOnBothSides() {
  const { tentA, tentB } = await makeTwFixtures({ energyA: 50, energyB: 50 });

  tentA.flowRate = 0;
  tentB.flowRate = 0;

  tentB._updateClashState(0.1); // Block A runs for non-canonical
  tentA._updateClashState(0.1); // Block A + Block B for canonical

  assert.ok(tentA.flowRate > 0, 'canonical tentacle flowRate should be positive during TW clash');
  assert.ok(tentB.flowRate > 0, 'non-canonical tentacle flowRate should be positive during TW clash');
}

async function testTwClashPacketQueueFedDuringClash() {
  const { tentA, tentB } = await makeTwFixtures({ energyA: 50, energyB: 50 });
  tentA.packetTravelQueue = [];
  tentB.packetTravelQueue = [];

  // Run several ticks so the accumulator has time to emit at least one packet
  for (let i = 0; i < 10; i++) {
    tentB._updateClashState(0.1);
    tentA._updateClashState(0.1);
  }

  assert.ok(tentA.packetTravelQueue.length > 0,
    'canonical tentacle packetTravelQueue should be fed during TW clash');
  assert.ok(tentB.packetTravelQueue.length > 0,
    'non-canonical tentacle packetTravelQueue should be fed during TW clash');
}

async function listJsFiles(dir) {
  const entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsFiles(relativePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(relativePath);
  }

  return files;
}

async function testRelayNoFreeEnergy() {
  const { NodeType, TentState } = await load('src/config/gameConfig.js');
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { Physics } = await load('src/systems/Physics.js');

  const relay = new GameNode(0, 0, 0, 0, 1, NodeType.RELAY);
  const target = new GameNode(1, 100, 0, 30, 1);
  relay.maxE = 100;
  target.maxE = 100;
  relay.energy = 0;

  const tent = new Tent(relay, target, 0);
  const game = { nodes: [relay, target], tents: [tent], _frame: 0, fogDirty: false };
  tent.game = game;
  tent.state = TentState.ACTIVE;
  tent.reachT = 1;
  tent.pipeAge = tent.travelDuration;

  Physics.updateOutCounts(game);
  const beforeTarget = target.energy;

  tent.update(0.5);

  assert.equal(relay.tentFeedPerSec, 0, 'relay without upstream budget should have zero outgoing feed');
  assert.equal(target.energy, beforeTarget, 'relay should not deliver energy without upstream budget');
  assert.equal(relay.energy, 0, 'relay should not manufacture stored energy during output');
}

async function testProgrammaticRetractRefundsPayload() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const source = new GameNode(0, 0, 0, 50, 1);
  const target = new GameNode(1, 100, 0, 20, 2);
  source.maxE = 200;
  target.maxE = 200;

  const tent = new Tent(source, target, 40);
  tent.state = TentState.ACTIVE;
  tent.paidCost = 40;
  tent.energyInPipe = 10;

  const beforeEnergy = source.energy;
  tent.kill();

  assert.equal(source.energy, beforeEnergy + 50, 'programmatic retract should refund build cost and in-transit payload without clipping the refund');
  assert.equal(tent.state, TentState.RETRACTING, 'programmatic retract should remain a visual retract');
  assert.equal(tent.paidCost, 0, 'programmatic retract should clear refunded build payload from the tentacle');
  assert.equal(tent.energyInPipe, 0, 'programmatic retract should clear refunded in-transit energy from the tentacle');
}

async function testSliceCutRulesStayCanonical() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const source = new GameNode(0, 0, 0, 30, 1);
  const target = new GameNode(1, 100, 0, 20, 0);
  source.maxE = 200;
  target.maxE = 200;
  target.captureThreshold = 999;

  const refundTent = new Tent(source, target, 20);
  refundTent.state = TentState.ACTIVE;
  refundTent.paidCost = 20;
  refundTent.energyInPipe = 10;
  const sourceBeforeRefund = source.energy;
  refundTent.kill(0.8);
  assert.equal(source.energy, sourceBeforeRefund + 30, 'near-target cut should refund the full payload to the source');
  assert.equal(refundTent.state, TentState.RETRACTING, 'near-target cut should visually retract');

  const splitSource = new GameNode(2, 0, 0, 25, 1);
  const splitTarget = new GameNode(3, 100, 0, 20, 0);
  splitSource.maxE = 200;
  splitTarget.maxE = 200;
  splitTarget.captureThreshold = 999;
  const splitTent = new Tent(splitSource, splitTarget, 20);
  splitTent.state = TentState.ACTIVE;
  splitTent.paidCost = 20;
  splitTent.energyInPipe = 10;
  splitTent.kill(0.5);
  assert.equal(splitSource.energy, 40, 'middle cut should return the source share immediately');
  assert.equal(splitTarget.contest[1], 15, 'middle cut should apply the remaining payload to the target immediately');
  assert.equal(splitTent.state, TentState.RETRACTING, 'middle cut should retract the remaining body');

  const burstSource = new GameNode(4, 0, 0, 25, 1);
  const burstTarget = new GameNode(5, 100, 0, 20, 2);
  burstSource.maxE = 200;
  burstTarget.maxE = 200;
  const burstTent = new Tent(burstSource, burstTarget, 20);
  burstTent.state = TentState.ACTIVE;
  burstTent.paidCost = 20;
  burstTent.energyInPipe = 10;
  const burstSourceBefore = burstSource.energy;
  burstTent.kill(0.2);
  assert.equal(burstSource.energy, burstSourceBefore, 'near-source burst should not refund energy immediately');
  assert.equal(burstTent.state, TentState.BURSTING, 'near-source cut should enter the burst state');
  assert.equal(burstTent._burstPayload, 30, 'near-source burst should preserve the full payload for delayed impact');
}

async function testMiddleCutReleasesClashInsteadOfDestroyingPartner() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const a = new GameNode(0, 0, 0, 40, 1);
  const b = new GameNode(1, 100, 0, 40, 2);
  a.maxE = 200;
  b.maxE = 200;

  const leftTent = new Tent(a, b, 20);
  const rightTent = new Tent(b, a, 20);
  leftTent.state = TentState.ACTIVE;
  rightTent.state = TentState.ACTIVE;
  leftTent.clashPartner = rightTent;
  rightTent.clashPartner = leftTent;
  leftTent.clashT = 0.4;
  rightTent.clashT = 0.6;
  leftTent.reachT = 1;
  rightTent.reachT = 1;
  leftTent.paidCost = 10;
  leftTent.energyInPipe = 6;

  leftTent.kill(0.5);

  assert.equal(leftTent.state, TentState.RETRACTING, 'middle cut should retract the cut tentacle');
  assert.equal(rightTent.state, TentState.ADVANCING, 'middle cut during clash should release the opposing tentacle to advance');
  assert.equal(rightTent.clashPartner, null, 'released clash partner should no longer be linked');
}

async function testBuildCostTuningStaysPlayable() {
  const { BUILD_RULES } = await load('src/config/gameConfig.js');
  const { computeBuildCost } = await load('src/math/simulationMath.js');

  assert.equal(BUILD_RULES.BASE_COST, 3, 'tentacle base build cost should stay on the lower tuned value');
  assert.equal(BUILD_RULES.COST_PER_PIXEL, 0.028, 'tentacle per-pixel build cost should stay on the lower tuned value');
  assert.ok(computeBuildCost(180) < 9, 'base build cost at 180px should stay below the old punitive threshold');
  assert.ok(computeBuildCost(260) < 11, 'base build cost at 260px should stay within a playable early-game range before level surcharges');
}

async function testGrowingTentacleRetractRefundsFullPaidCost() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const source = new GameNode(0, 0, 0, 99, 1);
  const target = new GameNode(1, 120, 0, 20, 0);
  source.maxE = 100;
  target.maxE = 100;

  const tent = new Tent(source, target, 40);
  tent.state = TentState.GROWING;
  tent.paidCost = 12;
  tent.reachT = 0.3;

  tent.kill();

  assert.equal(source.energy, 111, 'cancelling a growing tentacle should refund the full paid construction cost to the root node');
  assert.equal(tent.state, TentState.RETRACTING, 'cancelled growing tentacles should still visually retract');
}

async function testStableNodeLevelHysteresisPreventsCapThrash() {
  const { GameNode } = await load('src/entities/GameNode.js');

  const node = new GameNode(0, 0, 0, 200, 1);
  node.maxE = 200;
  node.syncLevelFromEnergy();
  assert.equal(node.level, 4, 'node should reach the max attainable level at a 200 energy cap');

  node.energy = 199;
  node.update(0);
  assert.equal(node.level, 4, 'node should not immediately demote after a tiny dip below the capped threshold');

  node.energy = 196;
  node.update(0);
  assert.equal(node.level, 4, 'node should hold its level until the hysteresis boundary is crossed');

  node.energy = 195.9;
  node.update(0);
  assert.equal(node.level, 3, 'node should demote once it falls below the hysteresis boundary');
}

async function testReversedRetractRefundsEffectiveSource() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const originalSource = new GameNode(0, 0, 0, 30, 1);
  const originalTarget = new GameNode(1, 120, 0, 40, 1);
  originalSource.maxE = 200;
  originalTarget.maxE = 200;

  const tent = new Tent(originalSource, originalTarget, 20);
  tent.state = TentState.ACTIVE;
  tent.reversed = true;
  tent.paidCost = 15;
  tent.energyInPipe = 5;

  tent.kill();

  assert.equal(originalSource.energy, 30, 'reversed retract should not refund the original source node');
  assert.equal(originalTarget.energy, 60, 'reversed retract should refund the effective source node');
}

async function testMiddleCutConservesPayloadAcrossRefundAndImpact() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const source = new GameNode(0, 0, 0, 20, 1);
  const target = new GameNode(1, 100, 0, 15, 2);
  source.maxE = 200;
  target.maxE = 200;

  const tent = new Tent(source, target, 20);
  tent.state = TentState.ACTIVE;
  tent.paidCost = 20;
  tent.energyInPipe = 10;

  tent.kill(0.5);

  assert.equal(source.energy, 35, 'middle cut should refund the exact source-side share');
  assert.equal(target.energy, 0, 'middle cut should deliver the exact target-side share to the enemy node');
}

async function testTentacleWarsImmediatePayloadUsesModeSpecificCaptureRules() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { computeTentacleWarsNeutralCaptureCost } = await load('src/tentaclewars/TwCaptureRules.js');

  const splitSource = new GameNode(0, 0, 0, 20, 1);
  const splitTarget = new GameNode(1, 100, 0, 18, 0);
  splitSource.maxE = 200;
  splitTarget.maxE = 200;
  splitSource.simulationMode = 'tentaclewars';
  splitTarget.simulationMode = 'tentaclewars';
  splitTarget.captureThreshold = computeTentacleWarsNeutralCaptureCost(splitTarget.energy);

  const splitTent = new Tent(splitSource, splitTarget, 20);
  splitTent.state = TentState.ACTIVE;
  splitTent.paidCost = 20;
  splitTent.energyInPipe = 10;

  splitTent.kill(0.5);

  assert.equal(splitTarget.owner, 0, 'TentacleWars middle cut should not flip a neutral before the retraction payout reaches it');
  splitTent.update(0.1);
  assert.ok((splitTarget.contest?.[1] || 0) > 0, 'TentacleWars middle cut should start feeding neutral capture progress during retraction');
  for (let step = 0; step < 20 && splitTent.state !== TentState.DEAD; step += 1) splitTent.update(0.1);
  assert.equal(splitTarget.owner, 1, 'TentacleWars middle cut should be able to flip a neutral through acquisition-cost progress by the end');
  assert.equal(splitTarget.energy, 25, 'TentacleWars middle cut should keep the neutral energy pool and add excess carryover on takeover');

  const cutSource = new GameNode(2, 0, 0, 25, 1);
  const cutTarget = new GameNode(3, 100, 0, 8, 2);
  const cutOutgoingTarget = new GameNode(4, 200, 0, 12, 2);
  cutSource.maxE = 200;
  cutTarget.maxE = 200;
  cutOutgoingTarget.maxE = 200;
  cutSource.simulationMode = 'tentaclewars';
  cutTarget.simulationMode = 'tentaclewars';
  cutOutgoingTarget.simulationMode = 'tentaclewars';

  const cutTent = new Tent(cutSource, cutTarget, 20);
  cutTent.state = TentState.ACTIVE;
  cutTent.paidCost = 20;
  cutTent.energyInPipe = 10;
  const outgoingTent = new Tent(cutTarget, cutOutgoingTarget, 12);
  outgoingTent.state = TentState.ACTIVE;
  outgoingTent.paidCost = 7;
  outgoingTent.energyInPipe = 5;
  cutTent.game = { tents: [cutTent, outgoingTent] };
  outgoingTent.game = cutTent.game;
  cutTent.kill(0.2);

  assert.equal(cutTent.state, TentState.RETRACTING, 'TentacleWars source-side cuts should resolve immediately instead of entering the NodeWARS burst state');
  assert.equal(cutTarget.owner, 2, 'TentacleWars source-side cuts should not resolve hostile takeover before the target-side payout reaches the node');
  assert.equal(cutSource.energy, 25, 'TentacleWars source-side cuts should not refund the source-side share instantly');
  cutTent.update(0.1);
  assert.ok(cutTarget.energy < 8, 'TentacleWars source-side cuts should start damaging the hostile node during retraction');
  assert.ok(cutSource.energy > 25, 'TentacleWars source-side cuts should restore source energy during retraction');
  for (let step = 0; step < 20 && cutTent.state !== TentState.DEAD; step += 1) cutTent.update(0.1);
  assert.equal(cutTarget.owner, 1, 'TentacleWars source-side cut payload should resolve hostile takeover through the mode-specific path');
  assert.equal(cutTarget.energy, 38, 'TentacleWars source-side cuts should apply only the target-side geometric share plus released outgoing lane energy');
  assert.equal(cutSource.energy, 31, 'TentacleWars source-side cuts should refund the source-side geometric share by the end');
  assert.equal(outgoingTent.paidCost, 0, 'TentacleWars hostile cleanup should consume outgoing lane payload instead of refunding it');
  assert.equal(outgoingTent.state, TentState.RETRACTING, 'TentacleWars hostile cleanup should still collapse the captured node outgoing lanes visually');
}

async function testTentacleWarsCutUsesContinuousGeometry() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const nearSourceNode = new GameNode(0, 0, 0, 25, 1);
  const nearSourceTarget = new GameNode(1, 100, 0, 50, 2);
  nearSourceNode.maxE = 200;
  nearSourceTarget.maxE = 200;
  nearSourceNode.simulationMode = 'tentaclewars';
  nearSourceTarget.simulationMode = 'tentaclewars';

  const nearSourceTent = new Tent(nearSourceNode, nearSourceTarget, 20);
  nearSourceTent.state = TentState.ACTIVE;
  nearSourceTent.paidCost = 20;
  nearSourceTent.energyInPipe = 10;
  nearSourceTent.kill(0.2);

  assert.equal(nearSourceTent.state, TentState.RETRACTING, 'TentacleWars cuts should retract immediately after resolving the geometric split');
  assert.equal(nearSourceTent._burstPayload, 0, 'TentacleWars cuts should not enter the shared burst payload path');
  assert.equal(nearSourceNode.energy, 25, 'TentacleWars near-source cuts should not refund the full source-side share instantly');
  assert.equal(nearSourceTarget.energy, 50, 'TentacleWars near-source cuts should not deliver the target-side share instantly');
  nearSourceTent.update(0.1);
  assert.ok(nearSourceNode.energy > 25, 'TentacleWars near-source cuts should refund source energy progressively during retraction');
  assert.ok(nearSourceTarget.energy < 50, 'TentacleWars near-source cuts should start damaging the target during retraction');
  for (let step = 0; step < 20 && nearSourceTent.state !== TentState.DEAD; step += 1) nearSourceTent.update(0.1);
  assert.equal(nearSourceNode.energy, 31, 'TentacleWars near-source cuts should refund only the source-side geometric share by the end');
  assert.equal(nearSourceTarget.energy, 26, 'TentacleWars near-source cuts should conserve the delivered target-side share by the end');

  const nearTargetNode = new GameNode(2, 0, 0, 25, 1);
  const nearTargetEnemy = new GameNode(3, 100, 0, 50, 2);
  nearTargetNode.maxE = 200;
  nearTargetEnemy.maxE = 200;
  nearTargetNode.simulationMode = 'tentaclewars';
  nearTargetEnemy.simulationMode = 'tentaclewars';

  const nearTargetTent = new Tent(nearTargetNode, nearTargetEnemy, 20);
  nearTargetTent.state = TentState.ACTIVE;
  nearTargetTent.paidCost = 20;
  nearTargetTent.energyInPipe = 10;
  nearTargetTent.kill(0.8);

  assert.equal(nearTargetTent.state, TentState.RETRACTING, 'TentacleWars near-target cuts should still retract immediately');
  assert.equal(nearTargetNode.energy, 25, 'TentacleWars near-target cuts should not return the larger source-side share instantly');
  assert.equal(nearTargetEnemy.energy, 50, 'TentacleWars near-target cuts should not land the target-side share instantly');
  nearTargetTent.update(0.1);
  assert.ok(nearTargetNode.energy > 25, 'TentacleWars near-target cuts should restore source energy progressively during retraction');
  assert.ok(nearTargetEnemy.energy < 50, 'TentacleWars near-target cuts should still send some energy forward during retraction');
  for (let step = 0; step < 20 && nearTargetTent.state !== TentState.DEAD; step += 1) nearTargetTent.update(0.1);
  assert.equal(nearTargetNode.energy, 49, 'TentacleWars near-target cuts should return the larger source-side share without becoming a full refund zone');
  assert.equal(nearTargetEnemy.energy, 44, 'TentacleWars near-target cuts should still send the remaining target-side share forward');
}

async function testTentacleWarsNeutralCapturePathStaysModeOwned() {
  const tentCombatSource = await fs.readFile(path.join(ROOT, 'src/entities/TentCombat.js'), 'utf8');

  assert.match(tentCombatSource, /from '\.\.\/tentaclewars\/TwNeutralCapture\.js'/, 'TentacleWars neutral capture should route through a mode-owned helper module');
  assert.match(tentCombatSource, /getTentacleWarsNeutralCaptureScore/, 'TentacleWars neutral capture should use mode-specific capture score helpers');
}

async function testImmediateActivationTracksPaidCostCorrectly() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { computeDistance } = await load('src/math/simulationMath.js');

  const source = new GameNode(0, 0, 0, 80, 1);
  const target = new GameNode(1, 120, 0, 20, 2);
  const distance = computeDistance(source.x, source.y, target.x, target.y);
  const totalBuildCost = 40;
  const tent = new Tent(source, target, totalBuildCost);
  const beforeEnergy = source.energy;

  tent.activateImmediate();

  assert.equal(tent.paidCost, totalBuildCost, 'instant clash activation should commit the full build cost');
  assert.equal(beforeEnergy - source.energy, totalBuildCost, 'instant clash activation should debit the same total build cost shown by normal move validation');
  assert.ok(tent.paidCost >= distance * 0, 'instant clash activation should keep a normal full-cost economic commitment');
}

async function testGrowingTentacleCannotAdvanceWithoutBudget() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');

  const source = new GameNode(0, 0, 0, 1, 1);
  const target = new GameNode(1, 300, 0, 20, 0);
  source.maxE = 200;
  target.maxE = 200;

  const tent = new Tent(source, target, 100);
  tent.game = { tents: [tent], _frame: 0 };

  tent.update(1);

  assert.ok(tent.paidCost <= 1.000001, 'growing tentacle should not mark more build cost as paid than the source actually had');
  assert.ok(tent.reachT <= 0.011, 'growing tentacle should not advance materially without available build budget');
}

async function testUnderAttackStillAllowsReducedOutput() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { computeNodeTentacleFeedRate } = await load('src/systems/EnergyBudget.js');

  const node = new GameNode(0, 0, 0, 80, 1);
  node.outCount = 2;
  node.underAttack = 0.6;

  assert.ok(computeNodeTentacleFeedRate(node) > 0, 'nodes under attack should keep a reduced outgoing budget instead of hard-stalling');
}

async function testVortexDrainsEffectiveSourceOnReversedTentacles() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { WorldSystems } = await load('src/systems/WorldSystems.js');

  const originalSource = new GameNode(0, 0, 0, 50, 1);
  const originalTarget = new GameNode(1, 100, 0, 50, 1);
  const tent = new Tent(originalSource, originalTarget, 0);
  tent.state = TentState.ACTIVE;
  tent.reachT = 1;
  tent.pipeAge = tent.travelDuration;
  tent.reversed = true;
  tent.game = { _frame: 0 };

  const game = {
    time: 0,
    hazards: [{ x: 50, y: 0, r: 80, phase: 0, drainRate: 10, _drainCd: 999, _warn: 0 }],
    tents: [tent],
  };

  const beforeOriginalSource = originalSource.energy;
  const beforeOriginalTarget = originalTarget.energy;
  WorldSystems.updateVortex(game, 0.5);

  assert.equal(originalSource.energy, beforeOriginalSource, 'reversed vortex drain should not debit the original source node');
  assert.ok(originalTarget.energy < beforeOriginalTarget, 'reversed vortex drain should debit the effective source node');
}

async function testPulsarInjectsEnergyIntoOwnedNodes() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { WorldSystems } = await load('src/systems/WorldSystems.js');

  const ownedNode = new GameNode(0, 20, 0, 20, 1);
  ownedNode.maxE = 100;
  const neutralNode = new GameNode(1, 25, 0, 20, 0);
  neutralNode.maxE = 100;

  const game = {
    nodes: [ownedNode, neutralNode],
    pulsars: [{ x: 0, y: 0, r: 100, timer: 0, interval: 4.5, strength: 22, pulse: 0, phase: 0, chargeTimer: 0, charging: false, isSuper: false }],
  };

  WorldSystems.updatePulsar(game, 0.1);

  assert.ok(ownedNode.energy > 20, 'pulsar should inject energy into owned nodes in range');
  assert.equal(neutralNode.energy, 20, 'pulsar should not inject energy into neutral nodes');
}

async function testAutoRetractKillsOutgoingEnemyTentacles() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { WorldSystems } = await load('src/systems/WorldSystems.js');

  const source = new GameNode(0, 0, 0, 10, 1);
  const target = new GameNode(1, 100, 0, 20, 2);
  const tent = new Tent(source, target, 0);
  tent.state = TentState.ACTIVE;
  tent.reachT = 1;
  tent.pipeAge = tent.travelDuration;
  source.autoRetract = true;

  const game = {
    nodes: [source, target],
    tents: [tent],
  };

  WorldSystems.updateAutoRetract(game);

  assert.equal(source.autoRetract, false, 'auto-retract flag should be consumed');
  assert.equal(tent.state, TentState.RETRACTING, 'auto-retract should programmatically retract outgoing enemy tentacles');
}

async function testFixedCampaignLayoutsCoverAllLevels() {
  const { LEVELS } = await load('src/config/gameConfig.js');
  const { getFixedCampaignLayout } = await load('src/levels/FixedCampaignLayouts.js');

  for (const level of LEVELS) {
    const layout = getFixedCampaignLayout(level.id, 1000, 700);
    assert.ok(layout, `level ${level.id} should have a fixed campaign layout`);
    assert.equal(layout.nodes.length, level.nodes, `level ${level.id} fixed layout should match configured node count`);
    if ((level.ai3 || 0) > 0) {
      const purpleNodeCount = layout.nodes.filter(node => node.owner === 3).length;
      assert.ok(purpleNodeCount > 0, `level ${level.id} should include at least one purple starting node when ai3 is enabled`);
    }
  }
}

async function testOwner3PaletteSelection() {
  const { CE3 } = await load('src/config/gameConfig.js');
  const { ownerColor, ownerPanelTheme, ownerRelayCoreColor } = await load('src/theme/ownerPalette.js');

  assert.equal(ownerColor(3, 2), CE3[2], 'ownerColor should map owner 3 to the purple palette');
  assert.match(ownerPanelTheme(3).border, /192,64,255/, 'owner 3 UI theme should use purple border tones');
  assert.match(ownerRelayCoreColor(3), /192,64,255/, 'owner 3 relay core should use purple tones');
}

async function testAIRelayTargeting() {
  const { NodeType } = await load('src/config/gameConfig.js');
  const { GameNode } = await load('src/entities/GameNode.js');
  const { AI } = await load('src/systems/AI.js');

  const src = new GameNode(0, 0, 0, 90, 2);
  const relay = new GameNode(1, 90, 0, 0, 0, NodeType.RELAY);
  src.maxE = 120;
  relay.captureThreshold = 20;

  const game = { nodes: [src, relay], tents: [], aiDefensive: 0 };
  const ai = new AI(game, { aiThinkIntervalSeconds: 1, distanceCostMultiplier: 0.01, id: 23 }, 2);

  ai._think();

  assert.ok(game.tents.some(t => t.target === relay), 'AI should be able to select a relay target');
}

async function testAIRelayOriginsCanBeUsedWhenBudgeted() {
  const { NodeType } = await load('src/config/gameConfig.js');
  const { GameNode } = await load('src/entities/GameNode.js');
  const { AI } = await load('src/systems/AI.js');

  const relay = new GameNode(0, 0, 0, 40, 2, NodeType.RELAY);
  relay.relayFeedBudget = 12;
  relay.tentFeedPerSec = 12;
  relay.maxE = 120;

  const target = new GameNode(1, 80, 0, 15, 0);
  target.maxE = 120;

  const game = { nodes: [relay, target], tents: [], aiDefensive: 0 };
  const ai = new AI(game, { aiThinkIntervalSeconds: 1, distanceCostMultiplier: 0.01, id: 24 }, 2);

  ai._think();

  assert.ok(game.tents.some(t => t.source === relay && t.target === target), 'AI should be able to launch a tentacle from an owned relay with real buffered budget');
}

async function testAiQualityWaveImprovesSupportAndKillConfirm() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { AI } = await load('src/systems/AI.js');
  const { buildMoveScore } = await load('src/systems/AIScoring.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { GAMEPLAY_RULES } = await load('src/config/gameConfig.js');

  const sourceNode = new GameNode(0, 0, 0, 80, 2);
  const alliedNode = new GameNode(1, 90, 0, 16, 3);
  const healthyPlayerNode = new GameNode(2, 110, 0, 48, 1);
  const weakPlayerNode = new GameNode(3, 110, 0, 10, 1);
  sourceNode.maxE = alliedNode.maxE = healthyPlayerNode.maxE = weakPlayerNode.maxE = 100;
  alliedNode.underAttack = 0.4;
  weakPlayerNode.underAttack = 0.35;
  weakPlayerNode.outCount = 2;

  const personality = { expansionBonus: 0, attackBonus: 20, siegeBonus: 0, defensiveDampener: 0.5, energyThreshold: 22 };
  const game = { nodes: [sourceNode, alliedNode, healthyPlayerNode, weakPlayerNode], tents: [], aiDefensive: 0 };
  const ai = new AI(game, { aiThinkIntervalSeconds: 1, distanceCostMultiplier: 0.01, id: 30 }, 2);

  const buildScore = targetNode => buildMoveScore({
    game,
    owner: ai.owner,
    sourceNode,
    targetNode,
    proximityScore: 2,
    isDefensive: false,
    personality,
    totalBuildCost: 8,
    aiRules: GAMEPLAY_RULES.ai,
    tentState: TentState,
  });

  const supportScore = buildScore(alliedNode);
  const healthyPlayerScore = buildScore(healthyPlayerNode);
  const weakPlayerScore = buildScore(weakPlayerNode);

  assert.ok(supportScore >= 80, 'AI should strongly support allied nodes that are already under player pressure');
  assert.ok(weakPlayerScore > healthyPlayerScore, 'AI should prioritize weaker overextended player nodes as kill-confirm targets');
}

async function testAiAvoidsLowValueOvercommit() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { AI } = await load('src/systems/AI.js');
  const { buildMoveScore } = await load('src/systems/AIScoring.js');
  const { GAMEPLAY_RULES } = await load('src/config/gameConfig.js');

  const sourceA = new GameNode(0, 0, 0, 70, 2);
  const sourceB = new GameNode(1, 20, 0, 70, 2);
  const sourceC = new GameNode(2, 40, 0, 70, 2);
  const neutralNode = new GameNode(3, 100, 0, 18, 0);
  sourceA.maxE = sourceB.maxE = sourceC.maxE = neutralNode.maxE = 100;
  neutralNode.captureThreshold = 20;
  neutralNode.contest = { 2: 11 };

  const laneA = new Tent(sourceA, neutralNode, 0);
  laneA.state = TentState.ACTIVE;
  const laneB = new Tent(sourceB, neutralNode, 0);
  laneB.state = TentState.ACTIVE;

  const personality = { expansionBonus: 22, attackBonus: 0, siegeBonus: 0, defensiveDampener: 0.5, energyThreshold: 22 };
  const coveredGame = { nodes: [sourceA, sourceB, sourceC, neutralNode], tents: [laneA, laneB], aiDefensive: 0 };
  const uncoveredGame = { nodes: [sourceA, sourceB, sourceC, neutralNode], tents: [], aiDefensive: 0 };
  const coveredAi = new AI(coveredGame, { aiThinkIntervalSeconds: 1, distanceCostMultiplier: 0.01, id: 24 }, 2);
  const uncoveredAi = new AI(uncoveredGame, { aiThinkIntervalSeconds: 1, distanceCostMultiplier: 0.01, id: 24 }, 2);

  const buildScore = (aiInstance, game) => buildMoveScore({
    game,
    owner: aiInstance.owner,
    sourceNode: sourceC,
    targetNode: neutralNode,
    proximityScore: 2,
    isDefensive: false,
    personality,
    totalBuildCost: 8,
    aiRules: GAMEPLAY_RULES.ai,
    tentState: TentState,
  });
  const coveredScore = buildScore(coveredAi, coveredGame);
  const uncoveredScore = buildScore(uncoveredAi, uncoveredGame);
  assert.ok(coveredScore < uncoveredScore, 'AI should penalize piling extra low-value lanes onto a neutral already covered by allied pressure');
}

async function testSharedBurstEntryPoint() {
  const { TentState } = await load('src/config/gameConfig.js');
  const { AI } = await load('src/systems/AI.js');

  const ai = new AI(
    { nodes: [], tents: [], aiDefensive: 0 },
    { aiThinkIntervalSeconds: 1, distanceCostMultiplier: 0.01, id: 23 },
    3,
  );
  let cutRatio = null;
  const fakeTent = {
    alive: true,
    state: TentState.ACTIVE,
    effectiveSourceNode: { owner: 3, isRelay: false },
    effectiveTargetNode: { owner: 1, energy: 10, maxE: 20, underAttack: 0.3, outCount: 3 },
    energyInPipe: 8,
    distance: 220,
    applySliceCut(ratio) { cutRatio = ratio; },
  };

  ai._checkStrategicCuts({ tents: [fakeTent] });
  assert.equal(cutRatio, 0.15, 'purple AI should invoke the canonical slice helper at the source-side burst cut ratio');

  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const sliceSource = await fs.readFile(path.join(ROOT, 'src/input/SliceCutting.js'), 'utf8');
  const sliceEffectsSource = await fs.readFile(path.join(ROOT, 'src/input/PlayerSliceEffects.js'), 'utf8');
  const aiSource = await fs.readFile(path.join(ROOT, 'src/systems/AI.js'), 'utf8');
  assert.match(gameSource, /_applyPlayerSliceCut\(sliceCut\)/, 'player path should route slice hits through the canonical game-side slice applicator');
  assert.match(gameSource, /applyPlayerSliceCut\(sliceCut,\s*\{/, 'player game-side applicator should delegate to the shared slice-effects helper');
  assert.match(sliceEffectsSource, /sliceCut\.tentacle\.applySliceCut\(sliceCut\.effectiveCutRatio\)/, 'shared player slice-effects helper should call the canonical slice helper');
  assert.match(sliceSource, /scanPlayerSliceCuts/, 'slice scan helper should own slice hit detection');
  assert.match(aiSource, /this\._checkStrategicCuts\(this\.game\);/, 'AI should check strategic cuts outside the think-interval early return');
}

async function testOwnershipAndContestCanonicalization() {
  const tentSource = await fs.readFile(path.join(ROOT, 'src/entities/Tent.js'), 'utf8');
  const ownershipSource = await fs.readFile(path.join(ROOT, 'src/systems/Ownership.js'), 'utf8');

  assert.match(tentSource, /applyOwnershipChange\(/, 'tent resolution should use the canonical ownership helper');
  assert.doesNotMatch(tentSource, /const rival\s*=\s*s\.owner === 1 \? 2 : 1/, 'contest cancellation should no longer hard-code a single rival owner');
  assert.match(ownershipSource, /retractInvalidTentaclesAfterOwnershipChange/, 'ownership helper should centralize invalid-link cleanup');
}

async function testRelayPlayerInteractionPaths() {
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const inputBindingSource = await fs.readFile(path.join(ROOT, 'src/input/GameInputBinding.js'), 'utf8');
  const uiSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');

  assert.doesNotMatch(gameSource, /!n\.isRelay && vdSq\(e\.offsetX - camX/, 'mouse hover path should not exclude relay nodes');
  assert.doesNotMatch(gameSource, /!n\.isRelay && vdSq\(\s*tx - camX/, 'touch long-press path should not exclude relay nodes');
  assert.doesNotMatch(uiSource, /if \(n\.isRelay\)\s*\{\s*game\.hoverNode = null/, 'relay info panel should no longer discard relay hover state');
  assert.match(gameSource, /appendSlicePoint/, 'slice path update should import the appendSlicePoint helper');
  assert.match(gameSource, /_beginMouseDragCandidate/, 'game should expose drag-to-connect input handlers');
  assert.match(inputBindingSource, /_endMouseDrag/, 'mouse input binding should route left-button drag release through drag-to-connect');
}

async function testNeutralCaptureVisualUsesRealThresholds() {
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const uiSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');

  assert.match(nodeRendererSource, /const captureThreshold = Math\.max\(1, n\.captureThreshold \|\| EMBRYO\)/, 'neutral capture ring should use the node capture threshold');
  assert.match(nodeRendererSource, /getDisplayContestEntries\(n\)/, 'neutral capture ring should use the coalition-aware contest helper');
  assert.match(nodeRendererSource, /getContestContributorOwners\(leadingEntry\)/, 'neutral capture ring should be able to show mixed coalition contributors');
  assert.match(uiSource, /contest_leader/, 'neutral info panel should expose the current capture leader');
  assert.match(uiSource, /getContestContributorOwners\(leadingContest\)/, 'neutral info panel should show the coalition contributors behind a summed capture');
}

async function testTutorialCopyMatchesCurrentControlsAndRules() {
  const i18nSource = await fs.readFile(path.join(ROOT, 'src/localization/i18n.js'), 'utf8');
  const tutorialSource = await fs.readFile(path.join(ROOT, 'src/systems/Tutorial.js'), 'utf8');

  assert.doesNotMatch(i18nSource, /recover most of the build cost/, 'english tutorial should not promise retract refunds');
  assert.doesNotMatch(i18nSource, /maior parte do custo de construção/, 'portuguese tutorial should not promise retract refunds');
  assert.doesNotMatch(i18nSource, /full \(250 energy\)/, 'english tutorial should not describe the removed fixed overflow threshold');
  assert.doesNotMatch(i18nSource, /250 de energia/, 'portuguese tutorial should not describe the removed fixed overflow threshold');
  assert.match(i18nSource, /drag from your cell and release on it/, 'english tutorial should teach drag-release tentacle creation');
  assert.match(i18nSource, /arraste da sua célula e solte sobre ela/, 'portuguese tutorial should teach drag-release tentacle creation');
  assert.match(i18nSource, /tutorialStepsWorld1/, 'tutorial copy should be grouped by explicit world keys');
  assert.match(i18nSource, /tutorialNext:/, 'tutorial copy should expose the localized next-button label');
  assert.match(i18nSource, /tutorialWorld1Label:/, 'tutorial copy should expose the localized World 1 tutorial label');
  assert.match(i18nSource, /tutorialWorld2Label:/, 'tutorial copy should expose the localized World 2 tutorial label');
  assert.match(i18nSource, /tutorialWorld3Label:/, 'tutorial copy should expose the localized World 3 tutorial label');
  assert.match(i18nSource, /export function getTutorialSteps\(/, 'i18n should expose an explicit tutorial step helper');
  assert.match(tutorialSource, /getTutorialSteps\(STATE\.curLang, tutorialWorldId\)/, 'tutorial flow should consume the explicit tutorial helper');
  assert.match(tutorialSource, /T\('tutorialNext'\)/, 'tutorial UI should use the localized next-button label');
  assert.match(tutorialSource, /T\('tutorialWorld' \+ tw \+ 'Label'\)/, 'tutorial badge should use localized world labels');
}

async function testVisualPolishPathsStayPresent() {
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const hazardRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/HazardRenderer.js'), 'utf8');
  const tutorialSource = await fs.readFile(path.join(ROOT, 'src/systems/Tutorial.js'), 'utf8');
  const tentRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/TentRenderer.js'), 'utf8');

  assert.match(nodeRendererSource, /'FLOW \+'/, 'relay nodes should advertise their flow-amplifier role');
  assert.match(nodeRendererSource, /fillText\('REVEAL'/, 'owned signal nodes should advertise their reveal role');
  assert.match(nodeRendererSource, /fillText\('CRIT'/, 'critical combat warning should exist for collapsing friendly nodes');
  assert.match(nodeRendererSource, /const nucleusGradient = ctx\.createRadialGradient/, 'nodes should use a layered nucleus gradient');
  assert.match(hazardRendererSource, /fillText\(charge > 0 \? 'CHARGING' : \(pulse > 0\.05 \? 'BURST' : 'READY'\)/, 'pulsars should expose readiness state text');
  assert.match(tutorialSource, /cx: 'drag'/, 'tutorial ghost should demonstrate drag-release actions');
  assert.match(tutorialSource, /cutTentacle/, 'tutorial ghost should support explicit cut-path guidance');
  assert.match(tentRendererSource, /Outer membrane gives the tentacle a more organic silhouette/, 'tentacles should have an outer membrane layer');
  assert.match(tentRendererSource, /Animated flow pulses make active tentacles feel pressurised instead of static/, 'tentacles should have animated flow pulses');
}

async function testGraphicsProfilesAreExplicitAndBackwardCompatible() {
  const gameStateSource = await fs.readFile(path.join(ROOT, 'src/core/GameState.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const screensSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const settingsViewSource = await fs.readFile(path.join(ROOT, 'src/ui/settingsView.js'), 'utf8');
  const indexSource = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const tentRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/TentRenderer.js'), 'utf8');
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const bgRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/BGRenderer.js'), 'utf8');
  const hazardRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/HazardRenderer.js'), 'utf8');
  const orbSource = await fs.readFile(path.join(ROOT, 'src/entities/Orb.js'), 'utf8');

  assert.match(gameStateSource, /graphicsMode: 'low'/, 'settings should persist an explicit graphics profile');
  assert.match(gameStateSource, /_normalizeGraphicsSettings\(/, 'game state should normalize old and new graphics settings');
  assert.match(mainSource, /cycleGraphicsMode\(/, 'main settings flow should cycle between explicit graphics profiles');
  assert.match(screensSource + settingsViewSource, /togGraphicsMode/, 'settings UI should expose the graphics mode toggle');
  assert.match(indexSource, /id="togGraphicsMode"/, 'settings HTML should use the explicit graphics mode button');
  assert.match(tentRendererSource, /const highGraphics = STATE\.settings\.graphicsMode === 'high'/, 'tent renderer should branch on the explicit graphics profile');
  assert.match(nodeRendererSource, /const highGraphics = STATE\.settings\.graphicsMode === 'high'/, 'node renderer should branch on the explicit graphics profile');
  assert.match(bgRendererSource, /const highGraphics = STATE\.settings\.graphicsMode === 'high'/, 'background renderer should branch on the explicit graphics profile');
  assert.match(hazardRendererSource, /const highGraphics = STATE\.settings\.graphicsMode === 'high'/, 'hazard renderer should branch on the explicit graphics profile');
  assert.match(orbSource, /const highGraphics = STATE\.settings\.graphicsMode === 'high'/, 'orb rendering should branch on the explicit graphics profile');
}

async function testHudAndPhaseFeedbackStayAligned() {
  const rendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/Renderer.js'), 'utf8');
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');
  const hudSource = await fs.readFile(path.join(ROOT, 'src/ui/HUD.js'), 'utf8');
  const resultScreenViewSource = await fs.readFile(path.join(ROOT, 'src/ui/resultScreenView.js'), 'utf8');

  assert.doesNotMatch(rendererSource, /UIRenderer\.drawPhaseStatus\(context, game, canvasWidth, canvasHeight\)/, 'renderer should not draw the always-on phase status overlay');
  assert.match(uiRendererSource, /static drawPhaseStatus\(ctx, game, W, H\)/, 'UI renderer should expose the phase status overlay');
  assert.match(hudSource, /node => node\.owner !== 0 && node\.owner !== 1/, 'HUD enemy count should include all hostile owners');
  assert.match(hudSource, /hintsElement\.style\.display = 'none'/, 'HUD should keep the always-on control hint strip hidden');
  assert.match(resultScreenViewSource, /levelConfig\.enemyCount \+ \(levelConfig\.purpleEnemyCount \|\| 0\)/, 'result screen should count both red and purple enemies');
}

async function testNeutralContestDoesNotArtificiallyStall() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');

  const targetNode = new GameNode(0, 100, 0, 28, 0);
  targetNode.captureThreshold = 88;
  targetNode.maxE = 88;
  targetNode.contest = { 1: 24, 2: 21 };

  const playerSource = new GameNode(1, 0, 0, 60, 1);
  const playerTent = new Tent(playerSource, targetNode, 0);

  playerTent._cancelRivalContestProgress(targetNode, 1, 9);

  assert.equal(targetNode.contest[1], 24, 'attacking owner progress should not be canceled by its own neutral contest pressure');
  assert.ok(targetNode.contest[2] < 21, 'rival neutral contest progress should be reduced when the attacker keeps pushing');
}

async function testCanvasFeedbackEventsStayPresent() {
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const rendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/Renderer.js'), 'utf8');
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');

  assert.match(gameSource, /visualEvents = \[\]/, 'game should maintain a transient visual event queue');
  assert.match(gameSource, /_bindVisualFeedbackEvents\(/, 'game should bind visual feedback events from the bus');
  assert.match(gameSource, /phaseOutcome = 'win'/, 'game should mark a win outcome before the result screen');
  assert.match(gameSource, /phaseOutcome = 'lose'/, 'game should mark a loss outcome before the result screen');
  assert.match(rendererSource, /drawVisualEvents\(context, game\)/, 'renderer should draw transient capture and structure feedback');
  assert.match(rendererSource, /drawPhaseOutcome\(context, game, canvasWidth, canvasHeight\)/, 'renderer should draw the pre-result phase outcome overlay');
  assert.match(uiRendererSource, /static drawVisualEvents\(ctx, game\)/, 'UI renderer should expose transient visual event rendering');
  assert.match(uiRendererSource, /static drawPhaseOutcome\(ctx, game, W, H\)/, 'UI renderer should expose phase outcome rendering');
}

async function testMenuAndDisplayControlsStayPresent() {
  const indexSource = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const screensSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const settingsViewSource = await fs.readFile(path.join(ROOT, 'src/ui/settingsView.js'), 'utf8');
  const gameStateSource = await fs.readFile(path.join(ROOT, 'src/core/GameState.js'), 'utf8');
  const hudSource = await fs.readFile(path.join(ROOT, 'src/ui/HUD.js'), 'utf8');
  const cssSource = await fs.readFile(path.join(ROOT, 'styles/main.css'), 'utf8');
  const i18nSource = await fs.readFile(path.join(ROOT, 'src/localization/i18n.js'), 'utf8');

  assert.match(indexSource, /hero-logo/, 'main menu should include the custom logo structure');
  assert.match(indexSource, /id="togShowFps"/, 'settings should expose the FPS toggle');
  assert.match(indexSource, /id="btnCopyDebug"/, 'settings should expose the debug snapshot action');
  assert.match(indexSource, /id="btnViewEnding"/, 'settings should expose the campaign-ending preview action in debug mode');
  assert.match(indexSource, /id="worldUnlockGroup"/, 'settings should wrap manual world unlock controls in a dedicated group');
  assert.match(indexSource, /id="modeGroup"/, 'settings should expose a dedicated TentacleWars mode group');
  assert.match(indexSource, /id="btnModeCycle"/, 'settings should expose a TentacleWars mode selector control');
  assert.match(settingsViewSource, /WORLD_UNLOCK_GROUP/, 'settings debug visibility should manage the world unlock group explicitly');
  assert.match(settingsViewSource, /MODE_GROUP/, 'settings debug visibility should manage the TentacleWars mode group explicitly');
  assert.match(settingsViewSource, /world unlock toggles are a debug-only escape hatch/i, 'settings should document manual world unlock controls as a debug-only escape hatch');
  assert.match(indexSource, /id="hfps"/, 'HUD should expose the FPS label');
  assert.match(mainSource, /cycleTheme\(/, 'main settings flow should cycle themed UI variants');
  assert.match(mainSource, /buildDebugSnapshot\(/, 'main settings flow should build a debug snapshot');
  assert.match(mainSource, /async function copyTextToClipboard\(text\)/, 'menu actions should use a dedicated clipboard helper for copy operations');
  assert.match(mainSource, /document\.execCommand\('copy'\)/, 'clipboard copy should keep a legacy fallback path for local-file and webview contexts');
  assert.match(mainSource, /BTN_COPY_DEBUG\)\?\.addEventListener\('click', async \(\) => \{[\s\S]*copyTextToClipboard\(snapshot\)/, 'debug snapshot button should route through the robust clipboard helper');
  assert.match(screensSource, /showFps/, 'settings UI refresh should include the FPS toggle');
  assert.match(gameStateSource, /showFps:\s+false/, 'game state should persist the FPS toggle');
  assert.match(gameStateSource, /fontId:\s+'exo2'/, 'default font should favor the more legible preset');
  assert.match(hudSource, /Math\.round\(game\.fps\)/, 'HUD should render the current FPS when enabled');
  assert.match(cssSource, /html\[data-theme="AURORA"\]/, 'stylesheet should define the Aurora theme');
  assert.match(cssSource, /html\[data-theme="SOLAR"\]/, 'stylesheet should define the Solar theme');
  assert.match(cssSource, /html\[data-theme="GLACIER"\]/, 'stylesheet should define the Glacier theme');
  assert.match(i18nSource, /setShowFps/, 'i18n should include the FPS setting labels');
  assert.match(i18nSource, /setGameMode/, 'i18n should include the TentacleWars mode labels');
  assert.match(i18nSource, /setCopyDebug/, 'i18n should include the debug snapshot labels');
  assert.match(i18nSource, /setViewEnding/, 'i18n should include the debug ending-preview labels');
}

async function testTentacleWarsModeSkeletonStaysWired() {
  const gameStateSource = await fs.readFile(path.join(ROOT, 'src/core/GameState.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const runtimeSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwModeRuntime.js'), 'utf8');

  assert.match(gameStateSource, /gameMode:\s+'nodewars'/, 'game state should default to the stable NodeWARS mode');
  assert.match(gameStateSource, /VALID_GAME_MODES = new Set\(\['nodewars', 'tentaclewars'\]\)/, 'game state should explicitly validate both supported mode ids');
  assert.match(gameStateSource, /setGameMode\(modeId\)/, 'game state should expose a canonical game-mode setter');
  assert.match(gameSource, /this\.twMode\s+=\s+new TwModeRuntime\(this\)/, 'game runtime should own a dedicated TentacleWars mode boundary');
  assert.match(gameSource, /enterSelectedMode\(\)/, 'game runtime should expose a mode-aware entry method');
  assert.match(mainSource, /STATE\.getGameMode\(\) === 'tentaclewars'/, 'main menu play flow should branch on the selected game mode');
  assert.match(runtimeSource, /enterSandboxPrototype\(\)/, 'TentacleWars runtime should expose a dedicated sandbox entry point');
}

async function testTentacleWarsGradeTableCore() {
  const { TW_BALANCE } = await load('src/tentaclewars/TwBalance.js');
  const {
    TW_GRADE_NAMES,
    buildTentacleWarsGradeTable,
    computeTentacleWarsGradeFromEnergy,
    getTentacleWarsPacketRateForGrade,
  } = await load('src/tentaclewars/TwGradeTable.js');

  assert.deepEqual(TW_GRADE_NAMES, ['spore', 'embryo', 'pulsar', 'gamma', 'solar', 'dominator'], 'TentacleWars should expose the six agreed grade names');
  assert.deepEqual(TW_BALANCE.GRADE_ASCEND_THRESHOLDS, [15, 40, 80, 120, 160, 180], 'TentacleWars ascend thresholds should stay anchored to the agreed fidelity table');
  assert.deepEqual(TW_BALANCE.GRADE_DESCEND_THRESHOLDS, [5, 30, 60, 100, 140, 160], 'TentacleWars descend thresholds should stay anchored to the agreed fidelity table');
  assert.equal(computeTentacleWarsGradeFromEnergy(14), 0, 'energy below the first threshold should stay in the base TentacleWars grade');
  assert.equal(computeTentacleWarsGradeFromEnergy(40), 1, 'crossing the second threshold should promote to the embryo grade');
  assert.equal(computeTentacleWarsGradeFromEnergy(180), 5, 'crossing the final threshold should promote to Dominator');
  assert.equal(computeTentacleWarsGradeFromEnergy(159, 5), 4, 'Dominator should demote once it drops below its descend threshold');
  assert.equal(computeTentacleWarsGradeFromEnergy(160, 5), 5, 'Dominator should keep its grade at the descend boundary');
  assert.equal(getTentacleWarsPacketRateForGrade(0), 1.0, 'base TentacleWars grade should emit one packet per second');
  assert.equal(getTentacleWarsPacketRateForGrade(4), 3.0, 'solar grade should emit at the agreed packet rate');
  assert.equal(getTentacleWarsPacketRateForGrade(5), 6.0, 'Dominator should double the Solar packet rate');

  const gradeTable = buildTentacleWarsGradeTable();
  assert.equal(gradeTable.length, 6, 'TentacleWars grade table should expose all six grades');
  assert.equal(gradeTable[5].packetRatePerSecond, 6.0, 'normalized TentacleWars grade table should expose the Dominator doubled packet rate');
}

async function testTentacleWarsPacketAccumulatorCore() {
  const {
    advanceTentacleWarsPacketAccumulator,
    advanceTentacleWarsPacketAccumulators,
    advanceTentacleWarsLaneRuntime,
  } = await load('src/tentaclewars/TwPacketFlow.js');

  const firstStep = advanceTentacleWarsPacketAccumulator(0, 1.5, 1);
  assert.equal(firstStep.emittedPacketCount, 1, 'fractional TentacleWars throughput should emit the whole-packet portion first');
  assert.equal(firstStep.nextAccumulatorUnits, 0.5, 'fractional TentacleWars throughput should keep the leftover credit');

  const secondStep = advanceTentacleWarsPacketAccumulator(firstStep.nextAccumulatorUnits, 1.5, 1);
  assert.equal(secondStep.emittedPacketCount, 2, 'stored TentacleWars packet credit should carry into the next second');
  assert.equal(secondStep.nextAccumulatorUnits, 0, 'TentacleWars accumulator should spend all credit once it reaches a whole packet pair');

  const dominatorBurst = advanceTentacleWarsPacketAccumulator(0, 6, 0.5);
  assert.equal(dominatorBurst.emittedPacketCount, 3, 'Dominator packet flow should emit multiple packets inside a half-second burst');

  const laneSteps = advanceTentacleWarsPacketAccumulators([0, 0.5], 2.5, 1);
  assert.deepEqual(laneSteps.map(laneStep => laneStep.emittedPacketCount), [2, 3], 'multi-lane packet accumulation should stay deterministic per lane');

  const firstLaneRuntimeStep = advanceTentacleWarsLaneRuntime({
    accumulatorUnits: 0,
    throughputPerSecond: 1.5,
    deltaSeconds: 1,
    sourceAvailableEnergy: 10,
    queuedPacketTravelTimes: [],
    travelDurationSeconds: 2,
  });
  assert.equal(firstLaneRuntimeStep.emittedPacketCount, 1, 'TentacleWars live lanes should emit whole packets once the accumulator crosses one packet');
  assert.equal(firstLaneRuntimeStep.deliveredPacketCount, 0, 'TentacleWars live lanes should keep emitted packets in transit until their travel duration expires');
  assert.equal(firstLaneRuntimeStep.nextAccumulatorUnits, 0.5, 'TentacleWars live lanes should preserve leftover fractional packet credit');
  assert.deepEqual(firstLaneRuntimeStep.nextQueuedPacketTravelTimes, [2], 'TentacleWars live lanes should enqueue emitted packets with a full travel delay');

  const secondLaneRuntimeStep = advanceTentacleWarsLaneRuntime({
    accumulatorUnits: firstLaneRuntimeStep.nextAccumulatorUnits,
    throughputPerSecond: 0,
    deltaSeconds: 2,
    sourceAvailableEnergy: 10,
    queuedPacketTravelTimes: firstLaneRuntimeStep.nextQueuedPacketTravelTimes,
    travelDurationSeconds: 2,
  });
  assert.equal(secondLaneRuntimeStep.emittedPacketCount, 0, 'TentacleWars live lanes should not emit without new credit');
  assert.equal(secondLaneRuntimeStep.deliveredPacketCount, 1, 'TentacleWars live lanes should deliver queued packets once travel time elapses');
}

async function testTentacleWarsTentacleEconomyCore() {
  const { TW_BALANCE } = await load('src/tentaclewars/TwBalance.js');
  const {
    commitTentacleWarsGrowthBudget,
    computeTentacleWarsBuildCost,
    computeTentacleWarsRefundValue,
  } = await load('src/tentaclewars/TwTentacleEconomy.js');

  assert.equal(TW_BALANCE.TENTACLE_COST_PER_PIXEL, 0.20, 'TentacleWars should expose its own distance-only tentacle cost slope');
  assert.equal(computeTentacleWarsBuildCost(0), 0, 'zero-length TentacleWars lanes should have zero build cost');
  assert.equal(computeTentacleWarsBuildCost(200), 40, 'TentacleWars build cost should stay linear with distance and have no base cost');

  const firstCommit = commitTentacleWarsGrowthBudget(0, 2.5, 1.25, 6);
  assert.equal(firstCommit.committedEnergy, 1.25, 'TentacleWars growth should only commit the source energy that is actually available this step');
  assert.equal(firstCommit.nextInvestedEnergy, 1.25, 'TentacleWars growth should accumulate only paid construction energy');
  assert.equal(firstCommit.nextProgressRatio, 1.25 / 6, 'TentacleWars growth progress should be derived from the paid fraction of the lane');
  assert.equal(firstCommit.isBuildComplete, false, 'TentacleWars build should stay incomplete until the whole linear cost is paid');

  const secondCommit = commitTentacleWarsGrowthBudget(firstCommit.nextInvestedEnergy, 10, 10, 6);
  assert.equal(secondCommit.committedEnergy, 4.75, 'TentacleWars growth should clamp the final payment to the remaining build cost');
  assert.equal(secondCommit.nextInvestedEnergy, 6, 'TentacleWars growth should stop exactly at the total linear build cost');
  assert.equal(secondCommit.nextProgressRatio, 1, 'TentacleWars growth should report full progress once the total cost is covered');
  assert.equal(secondCommit.isBuildComplete, true, 'TentacleWars build should mark completion at full paid cost');

  assert.equal(computeTentacleWarsRefundValue(4.5, 2), 6.5, 'TentacleWars retract should refund full invested build energy plus in-transit packet payload');
}

async function testTentacleWarsOverflowAndCaptureCore() {
  const { TW_BALANCE } = await load('src/tentaclewars/TwBalance.js');
  const { applyTentacleFriendlyFlow } = await load('src/entities/TentCombat.js');
  const {
    applyTentacleWarsNeutralCaptureProgress,
    computeTentacleWarsNeutralCaptureCost,
    resolveTentacleWarsNeutralCapture,
    resolveTentacleWarsHostileCapture,
  } = await load('src/tentaclewars/TwCaptureRules.js');

  // OVERFLOW_MODE constant is kept as a dormant reference for Wave 2 balance decisions.
  assert.equal(TW_BALANCE.OVERFLOW_MODE, 'broadcast_full', 'TentacleWars OVERFLOW_MODE constant should stay anchored to broadcast_full (dormant in Wave 1)');
  assert.equal(TW_BALANCE.OVERFLOW_REQUIRES_FULL_CAP, true, 'TentacleWars overflow should require full saturation in phase one');
  assert.equal(TW_BALANCE.HOSTILE_CAPTURE_RESET_ENERGY, 10, 'TentacleWars hostile capture should reset to ten energy before carryover');
  assert.equal(TW_BALANCE.NEUTRAL_CAPTURE_COST_RATIO, 0.4, 'TentacleWars neutral capture cost should start at forty percent of displayed neutral energy');
  assert.equal(TW_BALANCE.NEUTRAL_CAPTURE_ROUNDING_MODE, 'ceil', 'TentacleWars neutral capture should use the agreed conservative rounding mode');

  // Behavioral replacement: friendly flow to a full-cap TW node accumulates pendingExcessFeed.
  const twNode = { simulationMode: 'tentaclewars', energy: 100, maxE: 100, isRelay: false, inFlow: 0, excessFeed: 0, pendingExcessFeed: 0 };
  applyTentacleFriendlyFlow(twNode, 10, 1.0, 0.016);
  assert.ok(twNode.pendingExcessFeed > 0, 'friendly flow to a full TW node should accumulate pendingExcessFeed');

  assert.equal(computeTentacleWarsNeutralCaptureCost(18), 8, 'TentacleWars neutral capture cost should use the configured ratio and rounding mode');
  assert.equal(applyTentacleWarsNeutralCaptureProgress(7, 4), 11, 'TentacleWars neutral capture should stack allied pressure directly in phase one');
  const exactNeutralCapture = resolveTentacleWarsNeutralCapture(4, 4, 10);
  assert.equal(exactNeutralCapture.nextEnergy, 10, 'TentacleWars exact-threshold neutral capture should keep the neutral energy pool instead of falling to one energy');
  const neutralCapture = resolveTentacleWarsNeutralCapture(11, 8, 18);
  assert.equal(neutralCapture.baseEnergy, 18, 'TentacleWars neutral capture should preserve the neutral displayed energy as the base of the captured node');
  assert.equal(neutralCapture.carryoverEnergy, 3, 'TentacleWars neutral capture should preserve packet pressure beyond the acquisition cost');
  assert.equal(neutralCapture.nextEnergy, 21, 'TentacleWars neutral capture should start from the neutral energy pool plus any carryover');

  const hostileCapture = resolveTentacleWarsHostileCapture(3, 2);
  assert.equal(hostileCapture.resetEnergy, 10, 'TentacleWars hostile capture should report the fixed reset energy');
  assert.equal(hostileCapture.carryoverEnergy, 5, 'TentacleWars hostile capture should sum offensive and released outgoing carryover');
  assert.equal(hostileCapture.nextEnergy, 15, 'TentacleWars hostile capture should reset to ten and then apply carryover');
}

async function testTentacleWarsOverflowBudgetAccumulatesAtCap() {
  const { applyTentacleFriendlyFlow } = await load('src/entities/TentCombat.js');

  const targetNode = {
    simulationMode: 'tentaclewars',
    energy: 50,
    maxE: 50,
    inFlow: 0,
    excessFeed: 0,
    pendingExcessFeed: 0,
  };

  applyTentacleFriendlyFlow(targetNode, 10, 1, 0.5);

  assert.equal(targetNode.energy, targetNode.maxE, 'TentacleWars friendly overflow should not push energy beyond maxE');
  assert.ok(targetNode.pendingExcessFeed > 0, 'TentacleWars full-cap friendly flow should accumulate pendingExcessFeed');
}

async function testTentacleWarsGameNodeHasExcessFeedProperties() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const node = new GameNode(0, 0, 0, 0, 1);
  assert.strictEqual(node.excessFeed, 0, 'GameNode.excessFeed must initialize to 0');
  assert.strictEqual(node.pendingExcessFeed, 0, 'GameNode.pendingExcessFeed must initialize to 0');
  return { ok: true };
}

async function testTentacleWarsSandboxPrototypeBoundary() {
  const twModeSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwModeRuntime.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const sandboxConfigSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwSandboxConfig.js'), 'utf8');
  const twBalanceSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwBalance.js'), 'utf8');

  assert.match(sandboxConfigSource, /isTentacleWarsSandbox:\s*true/, 'TentacleWars should expose a dedicated sandbox config');
  assert.match(twBalanceSource, /DEFAULT_SOUNDTRACK_TRACK_ID:\s*'stella'/, 'TentacleWars should centralize its default soundtrack id in TW_BALANCE');
  assert.match(sandboxConfigSource, /soundtrackTrackId:\s*TW_BALANCE\.DEFAULT_SOUNDTRACK_TRACK_ID/, 'TentacleWars sandbox should use the centralized default soundtrack id');
  assert.match(gameSource, /loadTentacleWarsSandbox\(\)/, 'Game should expose a dedicated TentacleWars sandbox loader');
  assert.match(gameSource, /loadTentacleWarsCampaignLevel\(levelData\)/, 'Game should expose a TentacleWars campaign loader entry point');
  assert.match(gameSource, /_loadConfiguredLevel\(cfg, \{ persistCurrentLevel = false \} = \{\}\)/, 'Game should centralize config loading for campaign and sandbox entries');
  assert.match(gameSource, /this\.twMode\.checkSandboxEndState\(\)/, 'TentacleWars sandbox should own its own end-state flow');
  assert.match(twModeSource, /isTentacleWarsConfig\(levelConfig\)/, 'TentacleWars runtime should expose a mode-wide config predicate beyond the sandbox');
  assert.match(twModeSource, /enterSandboxPrototype\(\)/, 'TentacleWars runtime should enter the sandbox prototype, not a placeholder');
  assert.match(mainSource, /if \(game\.twMode\.isSandboxActive\(\)\)/, 'pause controls should restart and exit the sandbox without campaign leakage');
}

async function testTentacleWarsSandboxDisablesWorldLayerGimmicks() {
  const worldSystemsSource = await fs.readFile(path.join(ROOT, 'src/systems/WorldSystems.js'), 'utf8');

  assert.match(worldSystemsSource, /if \(game\.twMode\?\.isTentacleWarsActive\?\.\(\)\) \{\s*WorldSystems\.updateCamera\(game, dt\);\s*return;\s*\}/, 'TentacleWars mode should short-circuit world-layer gimmicks and keep only camera updates');
  assert.match(worldSystemsSource, /WorldSystems\.updateVortex\(game, dt\);/, 'world systems should still keep the canonical vortex entry for NodeWARS');
  assert.match(worldSystemsSource, /WorldSystems\.updatePulsar\(game, dt\);/, 'world systems should still keep the canonical pulsar entry for NodeWARS');
  assert.match(worldSystemsSource, /WorldSystems\.updateAutoRetract\(game\);/, 'world systems should still keep the canonical auto-retract entry for NodeWARS');
}

async function testTentacleWarsSandboxDisablesFrenzyAndAutoRetract() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { WORLD_RULES } = await load('src/config/gameConfig.js');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');

  const twNode = new GameNode(0, 0, 0, 4, 1);
  twNode.maxE = 100;
  twNode.simulationMode = 'tentaclewars';
  twNode.underAttack = WORLD_RULES.AUTO_RETRACT_ATTACK_THRESHOLD + 0.2;
  twNode.update(0.1, true);
  assert.equal(twNode.autoRetract, false, 'TentacleWars sandbox nodes should never arm auto-retract even while under attack and below the normal threshold');

  assert.match(gameSource, /if \(!isTentacleWarsMode && this\.frenzyTimer > 0\)/, 'TentacleWars mode should skip the frenzy countdown branch during update');
  assert.match(gameSource, /const frenzyActive = !isTentacleWarsMode && this\.frenzyTimer > 0;/, 'TentacleWars mode should not pass frenzy regen to node updates');
  assert.match(gameSource, /_recordPlayerFrenzyCut\(sliceCut\) \{\s*if \(this\.twMode\.isTentacleWarsActive\(\)\) return;/, 'TentacleWars mode should ignore player frenzy cut bookkeeping entirely');
}

async function testTentacleWarsAiPhaseOneBoundary() {
  const { STATE } = await load('src/core/GameState.js');
  const { TwAI } = await load('src/tentaclewars/TwAI.js');
  const { GameNode } = await load('src/entities/GameNode.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { TW_BALANCE } = await load('src/tentaclewars/TwBalance.js');
  const { areAlliedOwners, areHostileOwners } = await load('src/systems/OwnerTeams.js');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const twAiSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwAI.js'), 'utf8');

  const previousMode = STATE.getGameMode();
  try {
    STATE.setGameMode('nodewars');
    assert.equal(areAlliedOwners(2, 3), true, 'NodeWARS should keep red and purple allied');
    assert.equal(areHostileOwners(2, 3), false, 'NodeWARS should keep coalition hostility rules intact');

    STATE.setGameMode('tentaclewars');
    assert.equal(TW_BALANCE.ENEMY_RELATION_MODE, 'all_hostile', 'TentacleWars should default to hostile red/purple relations');
    assert.equal(areAlliedOwners(2, 3), false, 'TentacleWars should stop treating red and purple as allied');
    assert.equal(areHostileOwners(2, 3), true, 'TentacleWars should treat red and purple as hostile by default');

    const purpleNode = new GameNode(0, 0, 0, 160, 3);
    const playerNode = new GameNode(1, 140, 0, 10, 1);
    purpleNode.maxE = 160;
    playerNode.maxE = 100;
    purpleNode.simulationMode = 'tentaclewars';
    playerNode.simulationMode = 'tentaclewars';
    purpleNode.syncLevelFromEnergy();
    let appliedCutRatio = null;
    const ai = new TwAI({
      nodes: [purpleNode, playerNode],
      tents: [{
        alive: true,
        state: TentState.ACTIVE,
        energyInPipe: 18,
        effectiveSourceNode: purpleNode,
        effectiveTargetNode: playerNode,
        applySliceCut(ratio) { appliedCutRatio = ratio; },
      }],
    }, { aiThinkIntervalSeconds: 10 }, 3);
    ai.update(0.1);
    assert.equal(appliedCutRatio, 0.15, 'TentacleWars purple AI should actively fire the canonical slice path on an obvious charged hostile lane');
  } finally {
    STATE.setGameMode(previousMode);
  }

  assert.match(gameSource, /new TwAI\(this, cfg, 2\)/, 'TentacleWars sandbox should instantiate the dedicated red AI');
  assert.match(gameSource, /new TwAI\(this, cfg, 3\)/, 'TentacleWars sandbox should instantiate the dedicated purple AI');
  assert.match(twAiSource, /applySliceCut\(0\.15\)/, 'TentacleWars purple AI should still route cuts through the canonical slice path');
}

async function testTentacleWarsSlotCapStaysWithinOriginalRange() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { getTentacleSlotUsage } = await load('src/input/PlayerTentacleInteraction.js');
  const { getTentacleWarsMaxTentacleSlots, buildTentacleWarsGradeTable } = await load('src/tentaclewars/TwGradeTable.js');
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');
  const gradeTable = buildTentacleWarsGradeTable();

  assert.deepEqual(
    gradeTable.map(entry => entry.maxTentacleSlots),
    [1, 2, 2, 2, 3, 3],
    'TentacleWars should expose the authoritative slot-cap table by grade'
  );
  assert.equal(getTentacleWarsMaxTentacleSlots(0), 1, 'TentacleWars Spore cells should cap at one outgoing tentacle');
  assert.equal(getTentacleWarsMaxTentacleSlots(1), 2, 'TentacleWars Embryo cells should cap at two outgoing tentacles');
  assert.equal(getTentacleWarsMaxTentacleSlots(5), 3, 'TentacleWars Dominator cells should cap at three outgoing tentacles');

  const embryoNode = new GameNode(0, 0, 0, 40, 1);
  embryoNode.maxE = 200;
  embryoNode.simulationMode = 'tentaclewars';
  embryoNode.syncLevelFromEnergy();

  assert.equal(embryoNode.level, 1, 'TentacleWars Embryo sample should resolve into grade index one');
  assert.equal(embryoNode.maxSlots, 2, 'TentacleWars Embryo nodes should expose two outgoing tentacles');

  const slotUsage = getTentacleSlotUsage(embryoNode, () => 1);
  assert.equal(slotUsage.maxTentacleSlots, 2, 'TentacleWars click and preview helpers should use the grade-owned slot cap');
  assert.equal(slotUsage.hasFreeSlot, true, 'TentacleWars Embryo should still allow the second outgoing tentacle');

  const fullSlotUsage = getTentacleSlotUsage(embryoNode, () => 2);
  assert.equal(fullSlotUsage.hasFreeSlot, false, 'TentacleWars Embryo should block a third outgoing tentacle');

  const solarNode = new GameNode(1, 0, 0, 160, 1);
  solarNode.maxE = 200;
  solarNode.simulationMode = 'tentaclewars';
  solarNode.syncLevelFromEnergy();
  assert.equal(solarNode.maxSlots, 3, 'TentacleWars Solar nodes should still expose three outgoing tentacles');

  assert.match(nodeRendererSource, /function drawPersistentSlotMarkers\(/, 'Node rendering should keep a dedicated persistent slot-marker renderer');
  assert.match(nodeRendererSource, /const totalSlots = node\.maxSlots;/, 'persistent slot markers should render from the mode-aware slot getter');
  assert.match(nodeRendererSource, /const usedSlots = Math\.max\(0, Math\.min\(totalSlots, node\.outCount\)\);/, 'persistent slot markers should fill against live outgoing tentacle occupancy');
  assert.match(nodeRendererSource, /drawPersistentSlotMarkers\(ctx, n, r, col\);/, 'both NodeWARS and TentacleWars should use the below-node markers for slot occupancy');
  assert.match(nodeRendererSource, /function drawNodeWarsLevelBadge\(/, 'NodeWARS should keep a separate level badge once the below-node channel is reused for slots');
  assert.match(nodeRendererSource, /if \(!isTentacleWarsNode\) \{\s*drawNodeWarsLevelBadge\(ctx, n, r, col, lvl\);\s*\}/s, 'NodeWARS should move level readability to a dedicated above-node badge');
  assert.match(nodeRendererSource, /if \(!isTentacleWarsNode && n\.owner !== 0 && n\.outCount > 0\)/, 'the old out-count badge should remain secondary telemetry for NodeWARS only');
  assert.match(uiRendererSource, /const totalSlots = n\.maxSlots;/, 'TentacleWars info panels should render slot totals from the mode-aware slot getter');
}

async function testTentacleWarsInfoPanelUsesModeOwnedPresentationContract() {
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');
  const twPresentationSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwPresentationModel.js'), 'utf8');

  assert.match(twPresentationSource, /getTentacleWarsGradeDisplayName/, 'TentacleWars should expose a dedicated grade-display helper for UI surfaces');
  assert.match(twPresentationSource, /getTentacleWarsSlotAvailability/, 'TentacleWars should expose a dedicated slot-availability helper for UI surfaces');
  assert.match(uiRendererSource, /label: LABEL\.tw_grade/, 'TentacleWars cards should render a mode-owned grade label instead of the NodeWARS level fraction');
  assert.match(uiRendererSource, /value: getTentacleWarsGradeDisplayName\(lvl\)\.toUpperCase\(\)/, 'TentacleWars cards should show named grades such as Embryo or Pulsar');
  assert.match(uiRendererSource, /value: `\$\{twSlotAvailability\.availableSlots\} \$\{LABEL\.slots_free\}`/, 'TentacleWars cards should present available tentacles first instead of sent-over-total semantics');
  assert.doesNotMatch(uiRendererSource, /value: isRelay \? 'RELAY' : lvl \+ ' \/ '/, 'TentacleWars cards should no longer show the NodeWARS level-scale fraction');
}

async function testTentacleWarsTouchDragConnectUsesCanonicalPath() {
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const inputBindingSource = await fs.readFile(path.join(ROOT, 'src/input/GameInputBinding.js'), 'utf8');

  assert.match(gameSource, /this\._dragConnectSource = this\.cfg\?\.isTutorial[\s\S]*: dragSourceNode;/, 'touch tap candidate should seed the same drag-connect source state used by mouse input');
  assert.match(inputBindingSource, /if \(game\._dragConnectSource\) \{\s*game\._extendMouseDrag\(touchX, touchY\);/s, 'touch move should reuse the canonical drag-connect extension path when the gesture starts on an owned node');
  assert.match(inputBindingSource, /const consumedByDrag = game\._endMouseDrag\(touchPoint\.x, touchPoint\.y\);/, 'touch release should reuse the canonical drag-connect completion path before falling back to tap behavior');
}

async function testTentacleWarsRuntimeMathIntegration() {
  const { computeNodeDisplayRegenRate, computeNodeTentacleFeedRate } = await load('src/systems/EnergyBudget.js');
  const { TW_BALANCE } = await load('src/tentaclewars/TwBalance.js');
  const { computeTentacleBuildCost } = await load('src/input/TentacleCommands.js');
  const { computeTentacleWarsNeutralCaptureCost } = await load('src/tentaclewars/TwCaptureRules.js');
  const tentSource = await fs.readFile(path.join(ROOT, 'src/entities/Tent.js'), 'utf8');
  const physicsSource = await fs.readFile(path.join(ROOT, 'src/systems/Physics.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');

  const twNode = {
    simulationMode: 'tentaclewars',
    isRelay: false,
    owner: 1,
    level: 0,
    outCount: 2,
    energy: 180,
    maxE: 180,
    excessFeed: 4,
    underAttack: 0,
    x: 0,
    y: 0,
  };
  const twTarget = { x: 100, y: 0 };

  assert.equal(TW_BALANCE.PASSIVE_REGEN_FRACTION, 0.25, 'TentacleWars passive regen should use the faster under-attack drain fraction');
  assert.equal(TW_BALANCE.TW_SELF_REGEN_FRACTION, 0.20, 'TentacleWars attacker self-regen reserve should stay explicit in balance');
  assert.equal(computeNodeDisplayRegenRate(twNode), 1.0, 'TentacleWars regen display should resolve from packet grade rates');
  assert.equal(computeNodeTentacleFeedRate(twNode), 0.4, 'TentacleWars base lane throughput should reserve a self-regen share while staying separate from packetized overflow credit');
  assert.equal(computeTentacleWarsNeutralCaptureCost(40), 16, 'TentacleWars sandbox neutrals should derive their capture threshold from displayed energy');

  const twBuildCost = computeTentacleBuildCost(twNode, twTarget, 99);
  assert.equal(twBuildCost.baseBuildCost, 20, 'TentacleWars player build cost should stay linear with distance');
  assert.equal(twBuildCost.rangeSurcharge, 0, 'TentacleWars player build cost should ignore NodeWARS range surcharge');

  assert.match(tentSource, /sourceNode\.simulationMode === 'tentaclewars'/, 'Tent should branch build cost and bandwidth on the source simulation mode');
  assert.match(tentSource, /advanceTentacleWarsLaneRuntime\(/, 'TentacleWars active lanes should use the packet-native lane runtime helper');
  assert.match(tentSource, /resolveTentacleWarsHostileCapture\(/, 'TentacleWars hostile takeovers should resolve through the dedicated reset-plus-carryover helper');
  assert.match(tentSource, /resolveTentacleWarsNeutralCapture\(/, 'TentacleWars neutral takeovers should resolve through the dedicated acquisition helper');
  assert.match(physicsSource, /n\.pendingExcessFeed = 0/, 'Physics reset loop should zero pendingExcessFeed each frame via double-buffer swap');
  assert.match(gameSource, /computeTentacleWarsNeutralCaptureCost\(this\.nodes\[i\]\.energy\)/, 'TentacleWars mode should set neutral capture thresholds from displayed neutral energy on load');
  assert.match(gameSource, /this\.nodes\[i\]\.simulationMode = this\.twMode\.isTentacleWarsConfig\(cfg\) \? 'tentaclewars' : 'nodewars'/, 'Game should mark TW nodes with TentacleWars simulation mode before syncing levels');
}

async function testTentacleWarsEqualGradeCombatRespectsActiveAttackState() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { Physics } = await load('src/systems/Physics.js');
  const { TentState } = await load('src/config/gameConfig.js');

  async function runTentacleWarsMiniSim({
    sourceEnergy,
    targetEnergy,
    sourceOwner = 1,
    targetOwner = 2,
    includeReverseLane = false,
    totalSteps,
    stepSeconds,
    maxE = 30,
  }) {
    const sourceNode = new GameNode(0, 0, 0, sourceEnergy, sourceOwner);
    const targetNode = new GameNode(1, 100, 0, targetEnergy, targetOwner);
    sourceNode.simulationMode = 'tentaclewars';
    targetNode.simulationMode = 'tentaclewars';
    sourceNode.maxE = maxE;
    targetNode.maxE = maxE;
    sourceNode.syncLevelFromEnergy();
    targetNode.syncLevelFromEnergy();

    const forwardTentacle = new Tent(sourceNode, targetNode, 0);
    forwardTentacle.state = TentState.ACTIVE;
    forwardTentacle.reachT = 1;

    const tents = [forwardTentacle];
    let reverseTentacle = null;
    if (includeReverseLane) {
      reverseTentacle = new Tent(targetNode, sourceNode, 0);
      reverseTentacle.state = TentState.ACTIVE;
      reverseTentacle.reachT = 1;
      tents.push(reverseTentacle);
    }

    const game = {
      time: 0,
      nodes: [sourceNode, targetNode],
      tents,
    };
    forwardTentacle.game = game;
    if (reverseTentacle) reverseTentacle.game = game;

    for (let stepIndex = 0; stepIndex < totalSteps; stepIndex += 1) {
      game.time += stepSeconds;
      Physics.updateOutCounts(game);
      sourceNode.update(stepSeconds, false);
      targetNode.update(stepSeconds, false);
      forwardTentacle.update(stepSeconds);
      if (reverseTentacle) reverseTentacle.update(stepSeconds);
    }

    return { sourceNode, targetNode };
  }

  const stepSeconds = 0.25;
  const fiveSecondSteps = 20;

  const uncontested = await runTentacleWarsMiniSim({
    sourceEnergy: 10,
    targetEnergy: 5,
    totalSteps: fiveSecondSteps,
    stepSeconds,
  });

  assert.ok(
    uncontested.sourceNode.energy > 10,
    'TentacleWars uncontested attacker should grow instead of freezing during a live hostile lane',
  );
  assert.ok(
    uncontested.sourceNode.energy < 15,
    'TentacleWars attacker should not grow faster than the grade-0 regen budget allows over five seconds',
  );

  let captureTimeSeconds = null;
  {
    const sourceNode = new GameNode(2, 0, 0, 10, 1);
    const targetNode = new GameNode(3, 100, 0, 5, 2);
    sourceNode.simulationMode = 'tentaclewars';
    targetNode.simulationMode = 'tentaclewars';
    sourceNode.maxE = 30;
    targetNode.maxE = 30;
    sourceNode.syncLevelFromEnergy();
    targetNode.syncLevelFromEnergy();

    const tentacle = new Tent(sourceNode, targetNode, 0);
    tentacle.state = TentState.ACTIVE;
    tentacle.reachT = 1;

    const game = {
      time: 0,
      nodes: [sourceNode, targetNode],
      tents: [tentacle],
    };
    tentacle.game = game;

    const timeoutSteps = Math.round(20 / stepSeconds);
    for (let stepIndex = 0; stepIndex < timeoutSteps; stepIndex += 1) {
      game.time += stepSeconds;
      Physics.updateOutCounts(game);
      sourceNode.update(stepSeconds, false);
      targetNode.update(stepSeconds, false);
      tentacle.update(stepSeconds);
      if (targetNode.owner === 1 || targetNode.energy <= 0) {
        captureTimeSeconds = (stepIndex + 1) * stepSeconds;
        break;
      }
    }
  }

  assert.ok(captureTimeSeconds !== null, 'TentacleWars grade-0 defender should be captured within the timeout window');
  assert.ok(captureTimeSeconds >= 6 && captureTimeSeconds <= 15, 'TentacleWars grade-0 defender should fall in a reasonable 6..15 second window');

  const clash = await runTentacleWarsMiniSim({
    sourceEnergy: 20,
    targetEnergy: 20,
    includeReverseLane: true,
    totalSteps: fiveSecondSteps,
    stepSeconds,
  });
  assert.ok(clash.sourceNode.energy < 20, 'TentacleWars mutual clash should deplete the attacker nucleus');
  assert.ok(clash.targetNode.energy < 20, 'TentacleWars mutual clash should also deplete the defender nucleus');

  const attackerGrowthRate = (uncontested.sourceNode.energy - 10) / 5;
  const defenderDrainRate = (5 - (captureTimeSeconds === null ? 5 : 0)) / Math.max(captureTimeSeconds || 5, 0.001);
  assert.ok(
    defenderDrainRate > attackerGrowthRate,
    'TentacleWars capture should converge faster than the uncontested attacker self-grows',
  );
}

async function testTentacleWarsCampaignLoaderWiresAuthoredLevels() {
  const {
    TW_CAMPAIGN_FIXTURE_LEVELS,
  } = await load('src/tentaclewars/TwCampaignFixtures.js');
  const {
    buildTentacleWarsCampaignConfig,
  } = await load('src/tentaclewars/TwCampaignLoader.js');
  const {
    canCreateTentacleConnection,
  } = await load('src/input/TentacleCommands.js');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const loaderSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwCampaignLoader.js'), 'utf8');
  const obstacleRuntimeSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwObstacleRuntime.js'), 'utf8');

  const worldOneObstacleLevel = TW_CAMPAIGN_FIXTURE_LEVELS.find(level => level.id === 'W1-05');
  const config = buildTentacleWarsCampaignConfig(worldOneObstacleLevel, 1000, 800);
  assert.equal(config.isTentacleWarsCampaign, true, 'authored TW levels should build into campaign configs');
  assert.equal(config.isTentacleWarsSandbox, false, 'authored TW levels should stay distinct from the sandbox');
  assert.equal(config.fixedLayout.twObstacles.length, 2, 'phase-one authored TW levels should preserve static obstacle shells');
  assert.match(loaderSource, /buildTentacleWarsCampaignConfig\(levelData, width, height\)/, 'TW campaign loader should expose a canonical authored-level config builder');
  assert.match(obstacleRuntimeSource, /unsupported shape kind/, 'TW obstacle runtime should reject unsupported authoring shapes');
  assert.match(gameSource, /loadTentacleWarsCampaignLevel\(levelData\)/, 'Game should expose a loader entry for authored TW campaign levels');

  const runtimeNodes = config.fixedLayout.nodes.map((node, index) => ({
    ...node,
    id: index,
    simulationMode: 'tentaclewars',
    maxSlots: 2,
  }));
  const sourceNode = runtimeNodes[2];
  const targetNode = runtimeNodes[3];
  assert.equal(
    canCreateTentacleConnection(sourceNode, targetNode, config.fixedLayout.twObstacles),
    false,
    'phase-one TW authored obstacles should block direct lane creation canonically',
  );
}

async function testTentacleWarsCapsuleObstacleBlocksCrossingLane() {
  const { findBlockingTentacleWarsObstacle } = await load('src/tentaclewars/TwObstacleRuntime.js');
  const obstacle = {
    id: 'capsule-blocker',
    kind: 'capsule',
    ax: 500,
    ay: 100,
    bx: 500,
    by: 500,
    r: 30,
  };
  const sourceNode = { x: 100, y: 300 };
  const targetNode = { x: 900, y: 300 };
  const blockingObstacle = findBlockingTentacleWarsObstacle([obstacle], sourceNode, targetNode);
  assert.equal(blockingObstacle, obstacle, 'crossing a capsule obstacle should return the blocker');
}

async function testTentacleWarsCapsuleObstacleIgnoresNonCrossingLane() {
  const { findBlockingTentacleWarsObstacle } = await load('src/tentaclewars/TwObstacleRuntime.js');
  const obstacle = {
    id: 'capsule-blocker',
    kind: 'capsule',
    ax: 500,
    ay: 100,
    bx: 500,
    by: 500,
    r: 30,
  };
  const sourceNode = { x: 100, y: 100 };
  const targetNode = { x: 400, y: 100 };
  const blockingObstacle = findBlockingTentacleWarsObstacle([obstacle], sourceNode, targetNode);
  assert.equal(blockingObstacle, null, 'non-crossing lanes should ignore capsule blockers');
}

async function testTentacleWarsControlledScenarioPresetsStayWired() {
  const presetSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwScenarioPresets.js'), 'utf8');
  const sandboxConfigSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwSandboxConfig.js'), 'utf8');
  const previewSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwCampaignPreview.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');

  assert.match(presetSource, /'grade-showcase'/, 'TentacleWars should expose a deterministic grade-showcase preset');
  assert.match(presetSource, /'slice-lab'/, 'TentacleWars should expose a deterministic slice-lab preset');
  assert.match(presetSource, /'clash-lab'/, 'TentacleWars should expose a deterministic clash-lab preset');
  assert.match(presetSource, /'density-lab'/, 'TentacleWars should expose a deterministic density-lab preset');
  assert.match(sandboxConfigSource, /resolveTentacleWarsScenarioPresetId/, 'TentacleWars sandbox config should resolve scenario presets from the runtime URL');
  assert.match(previewSource, /tw-autostart/, 'TentacleWars preview tooling should preserve autostart query handling');
  assert.match(gameSource, /const fixedLayout = cfg\.fixedLayout \|\|/, 'Game should accept a mode-owned fixed layout override before campaign fixed layouts');
  assert.match(gameSource, /_seedTentacleWarsPresetTents\(fixedLayout\.tents\)/, 'TentacleWars preset layouts should be able to seed deterministic tentacles');
  assert.match(mainSource, /window\.__NODEWARS_DEBUG__ =/, 'browser visual tooling should expose a small runtime debug bridge');
}

async function testTentacleWarsCutRetractionPresentationStaysProgressive() {
  const { TentState } = await load('src/config/gameConfig.js');
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');

  const sourceNode = new GameNode(0, 0, 0, 40, 1);
  const targetNode = new GameNode(1, 120, 0, 10, 1);
  sourceNode.simulationMode = 'tentaclewars';
  targetNode.simulationMode = 'tentaclewars';
  sourceNode.maxE = 200;
  targetNode.maxE = 200;

  const tentacle = new Tent(sourceNode, targetNode, 12);
  tentacle.state = TentState.ACTIVE;
  tentacle.reachT = 1;
  tentacle.paidCost = 12;
  tentacle.energyInPipe = 8;

  const startingSourceEnergy = sourceNode.energy;
  const startingTargetEnergy = targetNode.energy;

  tentacle.applySliceCut(0.25);

  assert.equal(tentacle.state, TentState.RETRACTING, 'TentacleWars slice should enter the retraction presentation state');
  assert.equal(sourceNode.energy, startingSourceEnergy, 'TentacleWars cut refund should not land all source energy instantly');
  assert.equal(targetNode.energy, startingTargetEnergy, 'TentacleWars cut impact should not land all target energy instantly');

  tentacle.update(0.1);

  assert.ok(sourceNode.energy > startingSourceEnergy, 'TentacleWars cut should restore source energy progressively during retraction');
  assert.ok(targetNode.energy > startingTargetEnergy, 'TentacleWars cut should deliver target energy progressively during retraction');
  assert.ok(targetNode.energy < startingTargetEnergy + 15, 'TentacleWars cut should not deliver the full target share on the first retraction frame');

  for (let step = 0; step < 20 && tentacle.state !== TentState.DEAD; step += 1) tentacle.update(0.1);

  assert.equal(tentacle.state, TentState.DEAD, 'TentacleWars cut retraction should finish by removing the lane');
  assert.ok(Math.abs(sourceNode.energy - (startingSourceEnergy + 5)) < 0.0001, 'TentacleWars cut should conserve the exact source-side share by the end');
  assert.ok(Math.abs(targetNode.energy - (startingTargetEnergy + 15)) < 0.0001, 'TentacleWars cut should conserve the exact target-side share by the end');
}

async function testTentacleWarsCutRetractionDoesNotExplodeTargetFlash() {
  const { TentState } = await load('src/config/gameConfig.js');
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');

  const sourceNode = new GameNode(0, 0, 0, 40, 1);
  const targetNode = new GameNode(1, 120, 0, 60, 2);
  sourceNode.simulationMode = 'tentaclewars';
  targetNode.simulationMode = 'tentaclewars';
  sourceNode.maxE = 200;
  targetNode.maxE = 200;

  const tentacle = new Tent(sourceNode, targetNode, 12);
  tentacle.state = TentState.ACTIVE;
  tentacle.reachT = 1;
  tentacle.paidCost = 12;
  tentacle.energyInPipe = 28;

  tentacle.applySliceCut(0.75);

  let peakTargetFlash = targetNode.cFlash || 0;
  for (let step = 0; step < 20 && tentacle.state !== TentState.DEAD; step += 1) {
    tentacle.update(0.05);
    peakTargetFlash = Math.max(peakTargetFlash, targetNode.cFlash || 0);
  }

  assert.ok(peakTargetFlash <= 0.7, 'TentacleWars progressive cut payout should refresh target flash instead of stacking it into giant rings');
}

async function testRenderPerformanceInstrumentationStaysPresent() {
  const rendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/Renderer.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const screenControllerSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');

  assert.match(rendererSource, /const renderStartTime = performance\.now\(\)/, 'renderer should measure frame render cost');
  assert.match(rendererSource, /game\.renderStats = \{/, 'renderer should publish render stats to the game state');
  assert.match(gameSource, /this\.renderStats = \{/, 'game should initialize render stats storage');
  assert.match(screenControllerSource, /render_ms:/, 'debug panel should expose render timing metrics');
  assert.match(mainSource, /render_avg_ms=/, 'debug snapshot should include render timing metrics');
}

async function testRangePreviewStaysViewportClamped() {
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const rendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/Renderer.js'), 'utf8');

  assert.match(
    nodeRendererSource,
    /function clampVisualRangeRingRadius\(rawRadius, canvas\)/,
    'NodeRenderer should keep a dedicated helper for clamping oversized range previews',
  );
  assert.match(
    nodeRendererSource,
    /if \(n\.selected && dm && showRangePreview\) \{\s*const rawMaxRange = maxRange\(n\.energy, dm\);\s*const mr = clampVisualRangeRingRadius\(rawMaxRange, ctx\.canvas\);/s,
    'selected-node range preview should clamp its visual radius against the current canvas',
  );
  assert.match(
    rendererSource,
    /const showRangePreview = !!\(\s*game\._dragConnectSource \|\|\s*game\._dragConnectActive \|\|\s*\(game\.sel && game\.hoverNode && game\.hoverNode !== game\.sel\)\s*\);/s,
    'Renderer should only expose the range preview during an active drag or target-preview context',
  );
}

async function testAudioEventDensityProtectionStaysPresent() {
  const soundEffectsSource = await fs.readFile(path.join(ROOT, 'src/audio/SoundEffects.js'), 'utf8');

  assert.match(soundEffectsSource, /const SOUND_EVENT_COOLDOWNS_MS = \{/, 'sound effects should declare explicit high-density event cooldowns');
  assert.match(soundEffectsSource, /function playWithCooldown\(eventKey, playback\)/, 'sound effects should route dense events through a cooldown helper');
  assert.match(soundEffectsSource, /hazardDrain:\s*180/, 'hazard drain should keep a short cooldown to avoid spam');
  assert.match(soundEffectsSource, /pulsarFire:\s*320/, 'pulsar fire should keep a short cooldown to avoid stacked pulses');
  assert.match(soundEffectsSource, /clash:\s*\(\) => playWithCooldown\('clash'/, 'clash audio should be cooldown-gated');
}

async function testOwnerPaletteStaysCanonicalInNodeRendering() {
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');

  assert.match(nodeRendererSource, /import \{ ownerColor, ownerRelayCoreColor \} from '\.\.\/theme\/ownerPalette\.js'/, 'node renderer should use the shared owner palette helpers');
  assert.doesNotMatch(nodeRendererSource, /const CP\s+= \[/, 'node renderer should not keep its own player palette array');
  assert.doesNotMatch(nodeRendererSource, /const CE\s+= \[/, 'node renderer should not keep its own enemy palette array');
  assert.match(nodeRendererSource, /return ownerColor\(n\.owner, n\.level, '#5a6878'\)/, 'node renderer should resolve node colors through ownerColor');
}

async function testSettingsTutorialAndStoryStayInSync() {
  const indexSource = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const i18nSource = await fs.readFile(path.join(ROOT, 'src/localization/i18n.js'), 'utf8');
  const screenControllerSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const storyViewSource = await fs.readFile(path.join(ROOT, 'src/ui/storyScreenView.js'), 'utf8');
  const creditsViewSource = await fs.readFile(path.join(ROOT, 'src/ui/creditsView.js'), 'utf8');

  const requiredSettingsKeys = [
    'setGraphicsMode', 'setGraphicsModeDesc', 'setShowFps', 'setShowFpsDesc',
    'setTheme', 'setThemeDesc', 'setFont', 'setFontDesc', 'setZoom', 'setZoomDesc',
    'setLang', 'setLangDesc', 'setDebug', 'setDebugDesc', 'setCopyDebug', 'setCopyDebugDesc',
    'setViewEnding', 'setViewEndingDesc',
    'setReset', 'setResetDesc',
  ];

  for (const key of requiredSettingsKeys) {
    assert.match(indexSource, new RegExp(`data-t="${key}"`), `settings screen should reference ${key}`);
    assert.match(i18nSource, new RegExp(`${key}:`), `i18n should define ${key}`);
  }

  assert.match(i18nSource, /tutorialStepsWorld1:/, 'i18n should keep world 1 tutorial steps');
  assert.match(i18nSource, /tutorialStepsWorld2:/, 'i18n should keep world 2 tutorial steps');
  assert.match(i18nSource, /tutorialStepsWorld3:/, 'i18n should keep world 3 tutorial steps');
  assert.match(i18nSource, /returns the invested energy to the source cell/, 'world 1 tutorial should describe retract refunds');
  assert.match(i18nSource, /owned non-relay cells within its radius/, 'world 3 tutorial/story should describe the real pulsar rule in English');
  assert.match(i18nSource, /células próprias que não sejam retransmissores dentro do raio/, 'world 3 tutorial/story should describe the real pulsar rule in Portuguese');

  assert.match(screenControllerSource + storyViewSource, /story-strip/, 'story screen should keep lightweight visual chapter navigation');
  assert.match(screenControllerSource + storyViewSource, /stchap-card/, 'story screen should keep chapter cards');
  assert.match(screenControllerSource + creditsViewSource, /ESSENTIAL INFORMATION|INFORMAÇÃO ESSENCIAL/, 'credits should stay concise and relevant');
}

async function testProgressAndSettingsPersistenceGuardrailsStayPresent() {
  const { STATE } = await load('src/core/GameState.js');
  const { store } = await load('src/core/storage.js');

  const originalCurrentLevel = STATE.curLvl;
  const originalActiveWorldTab = STATE.getActiveWorldTab();
  const originalSettings = structuredClone(STATE.settings);

  STATE.setCurrentLevel(7);
  STATE.setActiveWorldTab(3);
  STATE.save();

  assert.equal(store.get('nw_curLvl'), 7, 'progress save should persist the current level id');
  assert.equal(store.get('nw_activeWorldTab'), 3, 'progress save should persist the active world tab');

  STATE.settings.graphicsMode = 'broken';
  STATE.settings.highGraphics = true;
  STATE.settings.theme = 'INVALID_THEME';
  STATE.settings.fontId = 'INVALID_FONT';
  STATE.settings.textZoom = 99;
  STATE.saveSettings();

  const persistedSettings = JSON.parse(store.get('nw_settings'));
  assert.equal(persistedSettings.graphicsMode, 'high', 'settings save should normalize legacy/invalid graphics mode values');
  assert.equal(persistedSettings.theme, 'AURORA', 'settings save should fall back to a valid theme');
  assert.equal(persistedSettings.fontId, 'exo2', 'settings save should fall back to a valid font');
  assert.equal(persistedSettings.textZoom, 2, 'settings save should clamp text zoom into the supported range');

  STATE.settings = originalSettings;
  STATE.setCurrentLevel(originalCurrentLevel);
  STATE.setActiveWorldTab(originalActiveWorldTab);
  STATE.save();
}

async function testLevelZeroNodesStayRenderable() {
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const rendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/Renderer.js'), 'utf8');

  assert.match(nodeRendererSource, /function drawNodeHull\(ctx, x, y, radius, sides, angle\)/, 'node renderer should keep a dedicated hull helper');
  assert.match(nodeRendererSource, /if \(!sides \|\| sides < 3\) \{[\s\S]*ctx\.arc\(x, y, radius, 0, Math\.PI \* 2\)/, 'level 0 nodes should fall back to circle rendering');
  assert.match(rendererSource, /import \{ STATE \}\s+from '\.\.\/core\/GameState\.js'/, 'renderer should import STATE before reading graphics mode in render stats');
  assert.match(nodeRendererSource, /const highGraphics = STATE\.settings\.graphicsMode === 'high';/, 'special node overlays should define highGraphics in their own scope');
}

async function testFpsHudAndSkipGuardrailsStayPresent() {
  const hudSource = await fs.readFile(path.join(ROOT, 'src/ui/HUD.js'), 'utf8');
  const gameStateSource = await fs.readFile(path.join(ROOT, 'src/core/GameState.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const rendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/Renderer.js'), 'utf8');
  const configSource = await fs.readFile(path.join(ROOT, 'src/config/gameConfig.js'), 'utf8');

  assert.match(hudSource, /fpsEl\.classList\.remove\('hud-hidden'\)/, 'FPS HUD should remove the hidden class when enabled');
  assert.match(hudSource, /fpsEl\.style\.display = 'inline-block'/, 'FPS HUD should use an explicit visible display mode');
  assert.match(gameStateSource, /levelFailStreaks/, 'GameState should track fail streaks per level');
  assert.match(gameStateSource, /canSkipLevel\(levelConfig\)/, 'skip eligibility should be centralized in GameState');
  assert.match(mainSource, /STATE\.canSkipLevel\(game\.cfg\)/, 'skip button action should respect the skip gate');
  assert.match(gameSource, /skipButton\.style\.display = canSkipCurrentLevel \? '' : 'none'/, 'pause UI should hide skip when unavailable');
  assert.doesNotMatch(rendererSource, /drawPhaseStatus\(context, game, canvasWidth, canvasHeight\)/, 'the always-on phase panel should no longer render every frame');
  assert.match(configSource, /id:10[\s\S]*isBoss:true/, 'ECHO should be marked as a boss phase');
  assert.match(configSource, /id:21[\s\S]*isBoss:true/, 'OBLIVION should be marked as a boss phase');
  assert.match(configSource, /id:32[\s\S]*isBoss:true/, 'TRANSCENDENCE should be marked as a boss phase');
}

async function testWorldUnlockAndPurpleBadgeGuardrailsStayPresent() {
  const gameStateSource = await fs.readFile(path.join(ROOT, 'src/core/GameState.js'), 'utf8');
  const screenControllerSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const levelSelectViewSource = await fs.readFile(path.join(ROOT, 'src/ui/levelSelectView.js'), 'utf8');
  const { STATE } = await load('src/core/GameState.js');
  const { LEVELS } = await load('src/config/gameConfig.js');

  assert.match(gameStateSource, /_getWorldUnlockRequirement\(worldId\)/, 'world unlock should derive from level data, not hard-coded ranges');
  assert.match(gameStateSource, /const manualVisibility = this\._getManualWorldVisibility\(worldId\);/, 'world unlock should read an explicit manual visibility override');
  assert.match(gameStateSource, /if \(manualVisibility != null\) return manualVisibility;/, 'manual world visibility should take precedence over natural progression');
  assert.match(gameStateSource, /return unlockRequirement != null && this\.completed >= unlockRequirement;/, 'natural world unlock should still derive from canonical progress thresholds');
  assert.match(gameStateSource, /isLevelUnlocked\(levelConfig\)/, 'level unlock should be centralized in GameState');
  assert.match(gameStateSource, /getNextLevelId\(levelId = this\.curLvl\)/, 'progression should expose a canonical next-level helper');
  assert.match(gameStateSource, /recordTutorialCompletion\(tutorialWorldId, tutorialLevelId\)/, 'tutorial completion should be centralized in GameState');
  assert.match(screenControllerSource, /STATE\.isWorldUnlocked\(2\)/, 'level select should use the canonical world unlock helper for World 2');
  assert.match(screenControllerSource, /STATE\.isWorldUnlocked\(3\)/, 'level select should use the canonical world unlock helper for World 3');
  assert.match(screenControllerSource, /const isUnlocked = STATE\.isLevelUnlocked\(levelConfig\);/, 'level select should use the canonical level unlock helper');
  assert.match(levelSelectViewSource, /if \(!levelConfig\.purpleEnemyCount \|\| levelConfig\.purpleEnemyCount <= 0\) return '';/, 'purple enemy badge should stay hidden when no purple enemies are configured');

  const originalCompleted = STATE.completed;
  const originalSettings = structuredClone(STATE.settings);

  STATE.completed = 0;
  STATE._syncWorldUnlocksFromProgress();
  const world1Tutorial = LEVELS.find(levelConfig => levelConfig.id === 0);
  const world1FirstPhase = LEVELS.find(levelConfig => levelConfig.id === 1);
  assert.equal(STATE.isWorldUnlocked(1), true, 'World 1 should always be unlocked');
  assert.equal(STATE.isLevelUnlocked(world1Tutorial), true, 'World 1 tutorial should be available from a fresh campaign state');
  assert.equal(STATE.isLevelUnlocked(world1FirstPhase), true, 'World 1 first playable phase should be available even if the tutorial is skipped');
  assert.equal(STATE.getNextLevelId(10), 11, 'finishing World 1 should naturally flow to the World 2 tutorial');
  assert.equal(STATE.isWorldUnlocked(2), false, 'World 2 should stay locked in a fresh campaign without manual enable');
  STATE.settings.debug = true;
  STATE.settings.w2 = true;
  assert.equal(STATE.isWorldUnlocked(2), true, 'manual World 2 enable should unlock the world even before campaign progress reaches it');
  STATE.setDebugMode(false);
  assert.equal(STATE.settings.w2, null, 'disabling debug should clear the manual World 2 override');
  assert.equal(STATE.isWorldUnlocked(2), false, 'after debug is disabled, World 2 should fall back to natural progression');
  STATE.settings.debug = true;
  STATE.settings.w2 = null;

  STATE.completed = 10;
  STATE._syncWorldUnlocksFromProgress();
  const world2Tutorial = LEVELS.find(levelConfig => levelConfig.id === 11);
  const world2FirstPhase = LEVELS.find(levelConfig => levelConfig.id === 12);
  assert.equal(STATE.isWorldUnlocked(2), true, 'finishing World 1 should unlock World 2');
  STATE.settings.w2 = false;
  assert.equal(STATE.isWorldUnlocked(2), false, 'manual World 2 disable should override natural campaign unlock');
  STATE.settings.w2 = true;
  assert.equal(STATE.isWorldUnlocked(2), true, 'manual World 2 enable should restore the world after an explicit disable');
  STATE.setDebugMode(false);
  assert.equal(STATE.isWorldUnlocked(2), true, 'disabling debug after a manual override should restore natural campaign unlock visibility');
  STATE.settings.debug = true;
  STATE.settings.w2 = null;
  assert.equal(STATE.isLevelUnlocked(world2Tutorial), true, 'World 2 tutorial should be available as soon as World 2 opens');
  assert.equal(STATE.isLevelUnlocked(world2FirstPhase), true, 'World 2 first playable phase should be available even if the tutorial is skipped');
  assert.equal(STATE.getNextLevelId(11), 12, 'finishing the World 2 tutorial should flow to the first real World 2 phase');
  assert.equal(STATE.getNextLevelId(21), 22, 'finishing World 2 should naturally flow to the World 3 tutorial');

  STATE.completed = 21;
  STATE._syncWorldUnlocksFromProgress();
  const world3Tutorial = LEVELS.find(levelConfig => levelConfig.id === 22);
  const world3FirstPhase = LEVELS.find(levelConfig => levelConfig.id === 23);
  assert.equal(STATE.isWorldUnlocked(3), true, 'finishing World 2 should unlock World 3');
  assert.equal(STATE.isLevelUnlocked(world3Tutorial), true, 'World 3 tutorial should be available as soon as World 3 opens');
  assert.equal(STATE.isLevelUnlocked(world3FirstPhase), true, 'World 3 first playable phase should be available even if the tutorial is skipped');
  assert.equal(STATE.getNextLevelId(22), 23, 'finishing the World 3 tutorial should flow to the first real World 3 phase');

  STATE.completed = originalCompleted;
  STATE.settings = originalSettings;
  STATE._syncWorldUnlocksFromProgress();
}

async function testWorldOneTutorialTabAndFeedClashBudgetStayAligned() {
  const screenSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const energyBudgetSource = await fs.readFile(path.join(ROOT, 'src/systems/EnergyBudget.js'), 'utf8');
  const configSource = await fs.readFile(path.join(ROOT, 'src/config/gameConfig.js'), 'utf8');
  const gameStateSource = await fs.readFile(path.join(ROOT, 'src/core/GameState.js'), 'utf8');
  const { GameNode } = await load('src/entities/GameNode.js');
  const {
    computeNodeTentacleFeedRate,
    computeTentacleClashFeedRate,
  } = await load('src/systems/EnergyBudget.js');

  assert.match(screenSource, /\[1,2,3\]\.forEach\(w => \{/, 'level select should no longer create a standalone tutorial tab');
  assert.match(screenSource, /worldFilter === 1 && levelConfig\.tutorialWorldId === 1/, 'World 1 grid should include the World 1 tutorial directly');
  assert.doesNotMatch(screenSource, /isTutorialEntry/, 'level grid should not keep dead tutorial-entry locals');
  assert.match(gameStateSource, /including World 1/, 'world unlock comments should explicitly keep World 1 tutorial optional too');
  assert.match(configSource, /TIER_REGEN:\s*\[1\.0, 1\.5, 2\.0, 2\.5, 4\.5, 8\.5\]/, 'tier regen should use the updated 1.0-based progression');
  assert.match(configSource, /CAPTURE_SPEED_MULT:\s*2\.0/, 'capture speed multiplier should be rebalanced for the higher base regen');
  assert.match(configSource, /SELF_REGEN_FRACTION: 0\.30/, 'game balance should preserve a self-regen fraction while feeding');
  assert.match(energyBudgetSource, /export function computeNodeDisplayRegenRate/, 'energy budget should expose a canonical displayed regen helper');
  assert.match(energyBudgetSource, /export function computeTentacleClashFeedRate/, 'energy budget should expose a dedicated clash feed rate');

  const sourceNode = new GameNode(0, 0, 0, 40, 1);
  sourceNode.level;
  sourceNode.outCount = 1;
  sourceNode.underAttack = 0;
  sourceNode.energy = 40;

  const supportFeedRate = computeNodeTentacleFeedRate(sourceNode);
  const clashFeedRate = computeTentacleClashFeedRate(sourceNode, Infinity, 1);

  assert.ok(supportFeedRate > 0, 'support feed rate should remain positive');
  assert.ok(clashFeedRate > supportFeedRate, 'clash feed rate should commit more energy than ordinary support flow');
}

async function testTutorialExitAndMouseGestureGuardsStayPresent() {
  const indexSource = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const inputBindingSource = await fs.readFile(path.join(ROOT, 'src/input/GameInputBinding.js'), 'utf8');
  const tutorialSource = await fs.readFile(path.join(ROOT, 'src/systems/Tutorial.js'), 'utf8');

  assert.match(indexSource, /id="tutExit"/, 'tutorial overlay should expose a dedicated exit button');
  assert.match(gameSource, /_slicePointerButton = null/, 'game should track which pointer button owns the active slice');
  assert.match(gameSource, /_clearMouseGestureState\(\)/, 'game should expose a shared mouse gesture reset helper');
  assert.match(gameSource, /_clickCandidateNode = null/, 'game should track and clear a sticky click candidate node');
  assert.match(gameSource, /_clickCandidateStart = null/, 'game should track and clear a sticky click candidate start point');
  assert.match(gameSource, /INPUT_TUNING\.HOVER_HIT_PADDING_PX/, 'touch tap fallback should use padded node hit-testing');
  assert.match(gameSource, /_leftSlicePending/, 'left-button slice promotion should keep explicit pending state');
  assert.match(gameSource, /if \(hoveredTargetNode && hoveredTargetNode !== this\.sel\)/, 'drag-connect should branch on a concrete hovered target while dragging');
  assert.match(gameSource, /this\._dragConnectTarget = hoveredTargetNode;/, 'drag-connect should keep an explicit drop target while dragging');
  assert.match(gameSource, /this\.hoverNode = this\._dragConnectTarget;/, 'drag-connect should keep the last valid target focused while dragging');
  assert.match(gameSource, /const fallbackTargetNode = this\._findNodeAtScreenPoint\(screenX, screenY, INPUT_TUNING\.HOVER_HIT_PADDING_PX\)/, 'drag release should still use padded gameplay hit-testing as fallback');
  assert.match(gameSource, /let hitNode = dragTargetNode \|\| fallbackTargetNode;/, 'drag release should prefer the tracked hover target over a strict mouseup hit');
  assert.match(gameSource, /_findSnapTargetNodeAtScreenPoint/, 'drag-connect should expose a snap-target helper for nearby nodes');
  assert.match(inputBindingSource, /on\(window, 'mouseup', handleWindowMouseUp\)/, 'mouse gestures should reset even when the pointer is released outside the canvas');
  assert.match(tutorialSource, /this\.game\.paused = true;/, 'tutorial exit should pause the game before leaving to level select');
  assert.match(tutorialSource, /showScr\('levels'\)/, 'tutorial exit should return directly to phase select');
}

async function testPrimaryButtonSliceUsesDistinctVisualAndDragTargeting() {
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const hudSource = await fs.readFile(path.join(ROOT, 'src/ui/HUD.js'), 'utf8');
  const inputBindingSource = await fs.readFile(path.join(ROOT, 'src/input/GameInputBinding.js'), 'utf8');

  assert.match(uiRendererSource, /const isPrimarySlice = game\._slicePointerButton === 0/, 'slicer rendering should distinguish left-button slices');
  assert.match(uiRendererSource, /ctx\.strokeStyle = isPrimarySlice \? '#00e5ff' : '#f5c518'/, 'left-button slices should not render with the same yellow cue as right-button slices');
  assert.match(gameSource, /_dragConnectTarget = null/, 'game should clear tracked drag targets when the gesture ends');
  assert.match(gameSource, /_findNodeAtScreenPoint\(screenX, screenY, INPUT_TUNING\.HOVER_HIT_PADDING_PX\)/, 'drag targeting should use gameplay node hit-testing with hover padding');
  assert.match(gameSource, /Keep the last valid drag target "sticky"/, 'drag targeting should keep the last valid target through transient overlay overlap');
  assert.match(hudSource, /pauseButton\.style\.display = 'inline-flex'/, 'pause button should stay visible even in tutorials');
  assert.doesNotMatch(inputBindingSource, /!game\.cfg\.isTutorial/, 'Escape pause binding should no longer exclude tutorial levels');
  assert.match(inputBindingSource, /function isSliceButtonStillPressed\(buttons, slicePointerButton\)/, 'input binding should explicitly track whether the active slice button is still pressed');
  assert.match(inputBindingSource, /on\(window, 'pointerup', handleWindowPointerUp\)/, 'slice should reset on pointerup as an extra guard');
  assert.match(inputBindingSource, /on\(window, 'contextmenu', handleWindowContextMenu\)/, 'slice should reset on contextmenu as an extra right-click guard');
  assert.match(inputBindingSource, /game\._clickCandidateStart = null;/, 'touch slice promotion should clear the sticky tap candidate start');
  assert.match(inputBindingSource, /game\._clickCandidateNode = null;/, 'touch slice promotion should clear the sticky tap candidate node');
}

async function testFrenzyRequiresSameContinuousSliceGesture() {
  const playerSliceEffectsSource = await fs.readFile(path.join(ROOT, 'src/input/PlayerSliceEffects.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const i18nSource = await fs.readFile(path.join(ROOT, 'src/localization/i18n.js'), 'utf8');
  const gameConfigSource = await fs.readFile(path.join(ROOT, 'src/config/gameConfig.js'), 'utf8');
  const gameNodeSource = await fs.readFile(path.join(ROOT, 'src/entities/GameNode.js'), 'utf8');

  assert.match(playerSliceEffectsSource, /state\.sliceGestureCutTentacles\.add\(sliceCut\.tentacle\)/, 'frenzy should track distinct tentacles cut during the current slice gesture');
  assert.match(playerSliceEffectsSource, /state\.sliceGestureCutTentacles\.size >= 3/, 'frenzy should require three distinct tentacles in the same slice gesture');
  assert.doesNotMatch(playerSliceEffectsSource, /frenzyLog\.push\(now\)/, 'frenzy should no longer be based on a rolling time window');
  assert.match(gameSource, /this\._sliceGestureCutTentacles = new Set\(\)/, 'game should reset the per-slice frenzy tracker when slice gestures begin or end');
  assert.match(gameSource, /showToast\('⚡ FRENZY! \+35% REGEN'\)/, 'frenzy toast should keep the documented regen bonus');
  assert.match(gameConfigSource, /FRENZY_REGEN_MULT:\s*1\.35/, 'frenzy regen multiplier should stay aligned with the documented +35% bonus');
  assert.match(gameNodeSource, /computeNodeDisplayRegenRate\(this, frenzyActive\)/, 'GameNode regen should route through the canonical displayed regen helper');
  assert.match(i18nSource, /same continuous slice|mesmo gesto contínuo/, 'tutorial text should describe the same-gesture frenzy rule');
}

async function testFreshClashUsesApproachVisualFront() {
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const tentSource = await fs.readFile(path.join(ROOT, 'src/entities/Tent.js'), 'utf8');
  const tentRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/TentRenderer.js'), 'utf8');
  const configSource = await fs.readFile(path.join(ROOT, 'src/config/gameConfig.js'), 'utf8');

  assert.match(gameSource, /initializeFreshClashVisual/, 'new clashes should initialize a visual approach front');
  assert.match(tentSource, /clashVisualT/, 'tentacles should track a separate visual clash front');
  assert.match(tentSource, /clashApproachActive/, 'tentacles should track whether a fresh clash is still approaching the midpoint');
  assert.match(tentSource, /const midpoint = 0\.5;/, 'fresh clash approach should explicitly target the lane midpoint');
  assert.match(tentSource, /const advanceFraction = \(GROW_PPS \/ Math\.max\(this\.distance, 1\)\) \* dt;/, 'fresh clash approach should advance at the same normalized speed as tentacle growth');
  assert.match(tentSource, /if \(this\.clashApproachActive \|\| opposingTentacle\.clashApproachActive\)/, 'fresh clashes should finish the midpoint approach before normal force resolution begins');
  assert.match(tentRendererSource, /const activeClashFront = t\.clashVisualT \?\? t\.clashT;/, 'renderer should prefer the visual clash front when present');
  assert.match(configSource, /CLASH_VISUAL_APPROACH_SPEED/, 'config should expose a dedicated clash visual approach speed');
}

async function testTentacleWarsClashStaysPinnedAtMidpoint() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const leftNode = new GameNode(0, 0, 0, 120, 1);
  const rightNode = new GameNode(1, 100, 0, 120, 2);
  leftNode.simulationMode = 'tentaclewars';
  rightNode.simulationMode = 'tentaclewars';
  leftNode.maxE = 200;
  rightNode.maxE = 200;

  const leftTent = new Tent(leftNode, rightNode, 20);
  const rightTent = new Tent(rightNode, leftNode, 20);
  leftTent.state = TentState.ACTIVE;
  rightTent.state = TentState.ACTIVE;
  leftTent.reachT = 1;
  rightTent.reachT = 1;
  leftTent.clashPartner = rightTent;
  rightTent.clashPartner = leftTent;
  leftTent.clashT = 0.35;
  rightTent.clashT = 0.65;
  leftTent.clashVisualT = 0.32;
  rightTent.clashVisualT = 0.68;

  leftTent.update(0.1);

  assert.equal(leftTent.clashT, 0.5, 'TentacleWars clashes should pin the logical front to the lane midpoint');
  assert.equal(rightTent.clashT, 0.5, 'TentacleWars clashes should keep both mirrored lanes locked to the same midpoint');
  assert.equal(leftTent.clashVisualT, 0.5, 'TentacleWars clashes should pin the visual front to the midpoint');
  assert.equal(rightTent.clashVisualT, 0.5, 'TentacleWars clashes should keep the mirrored visual front pinned to the midpoint');
}

async function testTentacleWarsClashApproachActuallyAdvances() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');

  const leftNode = new GameNode(0, 0, 0, 120, 1);
  const rightNode = new GameNode(1, 200, 0, 120, 2);
  leftNode.simulationMode = 'tentaclewars';
  rightNode.simulationMode = 'tentaclewars';
  leftNode.maxE = 200;
  rightNode.maxE = 200;

  const leftTent = new Tent(leftNode, rightNode, 20);
  const rightTent = new Tent(rightNode, leftNode, 20);
  leftTent.state = TentState.ACTIVE;
  rightTent.state = TentState.ACTIVE;
  leftTent.reachT = 1;
  rightTent.reachT = 1;
  leftTent.clashPartner = rightTent;
  rightTent.clashPartner = leftTent;
  leftTent.clashT = 0.2;
  rightTent.clashT = 0.8;
  leftTent.clashVisualT = 0.2;
  rightTent.clashVisualT = 0.8;
  leftTent.clashApproachActive = true;
  rightTent.clashApproachActive = true;
  leftTent.game = { time: 0 };
  rightTent.game = leftTent.game;

  leftTent.update(0.1);

  assert.ok(leftTent.clashVisualT > 0.2, 'TentacleWars clash approach should move the left visual front toward the midpoint');
  assert.ok(rightTent.clashVisualT < 0.8, 'TentacleWars clash approach should move the right visual front toward the midpoint');
  assert.ok(leftTent.clashVisualT < 0.5, 'TentacleWars clash approach should not jump straight to midpoint on the first tick');
  assert.ok(rightTent.clashVisualT > 0.5, 'TentacleWars clash approach should preserve mirrored travel on the first tick');
}

async function testTentacleWarsClashPreviewMatchesClickResolution() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { TentState } = await load('src/config/gameConfig.js');
  const { buildPlayerTentaclePreview } = await load('src/input/BuildPreview.js');
  const { resolvePlayerClickIntent } = await load('src/input/PlayerClickResolution.js');

  const playerNode = new GameNode(0, 0, 0, 11, 1);
  const enemyNode = new GameNode(1, 100, 0, 20, 2);
  playerNode.simulationMode = 'tentaclewars';
  enemyNode.simulationMode = 'tentaclewars';
  playerNode.maxE = 200;
  enemyNode.maxE = 200;

  const hostileTent = new Tent(enemyNode, playerNode, 20);
  hostileTent.state = TentState.ACTIVE;
  hostileTent.reachT = 1;
  hostileTent.pipeAge = hostileTent.travelDuration;

  const tents = [hostileTent];
  const preview = buildPlayerTentaclePreview({
    selectedNode: playerNode,
    hoveredNode: enemyNode,
    tents,
    liveOut: () => 0,
    distanceCostMultiplier: 0.01,
    obstacles: [],
  });
  const clickIntent = resolvePlayerClickIntent({
    selectedNode: playerNode,
    hitNode: enemyNode,
    tents,
    liveOut: () => 0,
    distanceCostMultiplier: 0.01,
    obstacles: [],
    playerOwner: 1,
  });

  assert.equal(preview.type, 'build_new_tentacle', 'TentacleWars clash preview should stay on the build-new-tentacle path');
  assert.equal(preview.isClashRoute, true, 'TentacleWars clash preview should recognize the reverse hostile lane');
  assert.equal(preview.canAffordBuild, true, 'TentacleWars clash preview should treat the half-cost route as affordable');
  assert.equal(clickIntent.type, 'build_tentacle', 'TentacleWars click resolution should agree with clash preview affordability');
}

async function testPurpleAiDifferentiationAndFrameDrivenCoreVisuals() {
  const aiSource = await fs.readFile(path.join(ROOT, 'src/systems/AI.js'), 'utf8');
  const aiScoringSource = await fs.readFile(path.join(ROOT, 'src/systems/AIScoring.js'), 'utf8');
  const tentSource = await fs.readFile(path.join(ROOT, 'src/entities/Tent.js'), 'utf8');
  const tentRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/TentRenderer.js'), 'utf8');
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');

  assert.match(aiScoringSource, /if \(owner === 3\) \{[\s\S]*targetNode\.energy < targetNode\.maxE \* 0\.35[\s\S]*targetNode\.underAttack > 0\.2[\s\S]*existingPressureBonus > 0/s, 'purple AI should favor kill-confirm and existing pressure more strongly than red AI');
  assert.match(aiSource, /buildMoveScore\(/, 'AI orchestrator should delegate move scoring to the extracted scoring module');
  assert.match(aiSource, /buildAiTacticalState\(/, 'AI should derive a lightweight tactical state profile before scoring moves');
  assert.match(aiSource, /scoreSliceOpportunity\(/, 'AI should evaluate charged slice opportunities through the scoring module');
  assert.match(aiSource, /_sliceCooldown/, 'AI should throttle repeated tactical cuts with an explicit cooldown');
  assert.match(aiScoringSource, /export function buildAiTacticalState/, 'AI scoring should expose tactical state derivation');
  assert.match(aiScoringSource, /export function scoreStructuralWeakness/, 'AI scoring should expose explicit player-structure punishment');
  assert.match(aiScoringSource, /export function scoreSliceOpportunity/, 'AI scoring should expose explicit slice opportunity scoring');
  assert.doesNotMatch(tentSource, /Date\.now\(/, 'tent core visuals should no longer use wall-clock time directly');
  assert.doesNotMatch(tentRendererSource, /Date\.now\(/, 'tent renderer should use frame-driven time for its core animations');
  assert.doesNotMatch(nodeRendererSource, /Date\.now\(/, 'node renderer should use frame-driven time for frenzy tint animation');
  assert.doesNotMatch(uiRendererSource, /Date\.now\(/, 'UI renderer should use game time for phase outcome and frenzy pulses');
}

async function testAiTacticalStateAndSlicePressureStayActive() {
  const { buildAiTacticalState, scoreSliceOpportunity } = await load('src/systems/AIScoring.js');
  const { GameNode } = await load('src/entities/GameNode.js');
  const { Tent } = await load('src/entities/Tent.js');
  const { AI_RULES, TentState } = await load('src/config/gameConfig.js');

  const aiNode = new GameNode(0, 0, 0, 60, 3);
  const playerNode = new GameNode(1, 160, 0, 18, 1);
  const neutralNode = new GameNode(2, 320, 0, 20, 0);
  aiNode.maxE = 200;
  playerNode.maxE = 100;
  neutralNode.maxE = 100;
  playerNode.underAttack = 0.3;
  playerNode.outCount = 3;

  const game = {
    nodes: [aiNode, playerNode, neutralNode],
    tents: [],
  };

  const tacticalState = buildAiTacticalState(game, 3, AI_RULES);
  assert.equal(tacticalState, 'finish', 'AI tactical state should switch into finish when the player is weak and already pressured');

  const tentacle = new Tent(aiNode, playerNode, 18);
  tentacle.state = TentState.ACTIVE;
  tentacle.energyInPipe = 16;
  tentacle.reachT = 1;
  game.tents.push(tentacle);

  const sliceScore = scoreSliceOpportunity({
    game,
    owner: 3,
    tentacle,
    tacticalState,
    aiRules: AI_RULES,
  });
  assert.ok(sliceScore >= AI_RULES.PURPLE_SLICE_SCORE_THRESHOLD, 'purple AI should still recognize a strong charged slice opportunity on a pressured weak node');
}

async function testTutorialStepsStayRigidAndGated() {
  const tutorialSource = await fs.readFile(path.join(ROOT, 'src/systems/Tutorial.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');

  assert.match(tutorialSource, /isRigid\(\)/, 'tutorial should expose a rigid-step gate for gameplay actions');
  assert.match(tutorialSource, /hasActionGate\(\)/, 'tutorial should distinguish action-gated steps from informational read steps');
  assert.match(tutorialSource, /currentAction !== 'read' && currentAction !== 'done'/, 'tutorial should leave controls enabled during read-only steps');
  assert.match(tutorialSource, /this\.expectedNeutralTarget = null;/, 'tutorial should reset pinned neutral targets when a new step starts');
  assert.match(tutorialSource, /this\.expectedRelayTarget = null;/, 'tutorial should reset pinned relay targets when a new step starts');
  assert.match(tutorialSource, /_syncStepContext\(\)/, 'tutorial should synchronize step context before gating tutorial actions');
  assert.match(tutorialSource, /allowsClickIntent\(clickIntent\)/, 'tutorial should gate click intents by the current step');
  assert.match(tutorialSource, /canStartDragConnect\(sourceNode\)/, 'tutorial should gate drag-connect starts by the current step');
  assert.match(tutorialSource, /filterDragConnectTarget\(sourceNode, targetNode\)/, 'tutorial should filter drag targets by the current step action');
  assert.match(tutorialSource, /canStartSlice\(\)/, 'tutorial should gate slice start by the current step');
  assert.match(tutorialSource, /filterSliceCuts\(sliceCuts\)/, 'tutorial should reject off-step slice cuts');
  assert.match(tutorialSource, /onSliceCut\(sliceCut\)/, 'tutorial should own explicit cut-step completion handling');
  assert.match(tutorialSource, /onClickIntentApplied\(clickIntent\)/, 'tutorial should mark steps complete as soon as a valid click intent is applied');
  assert.match(tutorialSource, /this\.actionDone = true;/, 'tutorial should explicitly mark valid actions as completed');
  assert.match(tutorialSource, /_scheduleAutoAdvance\(\)/, 'tutorial should auto-advance action steps after completion');
  assert.match(tutorialSource, /_clearAutoAdvance\(\)/, 'tutorial should clear auto-advance timers when the step changes or the tutorial exits');
  assert.match(gameSource, /if \(this\.cfg\?\.isTutorial && !this\.tut\.allowsClickIntent\(clickIntent\)\) return;/, 'game click path should reject tutorial-disallowed actions');
  assert.match(gameSource, /if \(this\.cfg\?\.isTutorial\) \{\s*sliceCuts = this\.tut\.filterSliceCuts\(sliceCuts\);/s, 'slice scan should be filtered through the tutorial gate');
  assert.match(gameSource, /if \(this\.cfg\?\.isTutorial && !this\.tut\.canStartSlice\(\)\) return;/, 'slice begin should be blocked outside the cut step');
  assert.match(gameSource, /this\.tut\.onClickIntentApplied\(clickIntent\)/, 'game click path should notify tutorial completion when a valid action is applied');
  assert.match(gameSource, /this\.tut\.onSliceCut\(currentSliceCut\)/, 'game slice application should notify tutorial cut completion through the explicit hook');
}

async function testLoadLevelFinalizationAndInvalidActionUxStayAligned() {
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const screenControllerSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const tutorialSource = await fs.readFile(path.join(ROOT, 'src/systems/Tutorial.js'), 'utf8');
  const resultViewSource = await fs.readFile(path.join(ROOT, 'src/ui/resultScreenView.js'), 'utf8');
  const finalizeCallCount = (gameSource.match(/this\._finalizeLoadedLayout\(cfg\);/g) || []).length;

  assert.equal(finalizeCallCount, 1, 'loadLevel should finalize the loaded layout exactly once');
  assert.match(mainSource, /STATE\.getNextLevelId\(\)/, 'menu progression should use the canonical next-level helper');
  assert.match(screenControllerSource, /const nextLevelConfig = STATE\.getNextLevelConfig\(\);/, 'result screen should resolve the next phase through GameState');
  assert.match(tutorialSource, /STATE\.recordTutorialCompletion\(tw, this\.game\.cfg\?\.id\)/, 'tutorial completion should route through the canonical GameState helper');
  assert.match(resultViewSource, /hostile starts/, 'result screen should not claim configured enemy starts were literally eliminated');
  assert.doesNotMatch(gameSource, /console\.groupCollapsed\(\`\[ENERGY/, 'debug HUD should not still dump per-second energy logs to the console');
  assert.match(gameSource, /if \(!hit && this\._clickCandidateNode && this\._clickCandidateStart\)/, 'click resolution should fall back to the pressed node when the release stays near it');
  const toggleCaseMatch = gameSource.match(/case 'toggle_existing_tentacle':([\s\S]*?)case 'no_free_slots':/);
  const slotsCaseMatch = gameSource.match(/case 'no_free_slots':([\s\S]*?)case 'insufficient_energy':/);
  const energyCaseMatch = gameSource.match(/case 'insufficient_energy':([\s\S]*?)case 'build_tentacle':/);

  assert.ok(toggleCaseMatch, 'toggle-existing-tentacle case should stay present');
  assert.ok(slotsCaseMatch, 'no-free-slots case should stay present');
  assert.ok(energyCaseMatch, 'insufficient-energy case should stay present');
  assert.doesNotMatch(toggleCaseMatch[1], /this\.clearSel\(\);/, 'invalid reverse attempts should keep the current selection');
  assert.doesNotMatch(slotsCaseMatch[1], /this\.clearSel\(\);/, 'slot-limit rejections should keep the current selection');
  assert.doesNotMatch(energyCaseMatch[1], /this\.clearSel\(\);/, 'insufficient-energy rejections should keep the current selection');
}

async function testInputWaveV2GuardrailsStayPresent() {
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const inputBindingSource = await fs.readFile(path.join(ROOT, 'src/input/GameInputBinding.js'), 'utf8');
  const inputStateSource = await fs.readFile(path.join(ROOT, 'src/input/InputState.js'), 'utf8');
  const packageJson = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));

  assert.match(inputBindingSource, /game\._beginSlice\(game\._tapStart\.x, game\._tapStart\.y, 2\)/, 'touch-promoted slice should use the canonical slice initializer');
  assert.doesNotMatch(inputBindingSource, /game\.slicePath = createSlicePathStart\(game\._tapStart\.x, game\._tapStart\.y\)/, 'touch-promoted slice should not manually recreate slice state');
  assert.match(inputStateSource, /export function getMonotonicInputTimestamp\(\)/, 'input state should expose a monotonic input timestamp helper');
  assert.doesNotMatch(gameSource, /Date\.now\(/, 'Game input flow should not use wall-clock time for tap timing');
  assert.doesNotMatch(inputBindingSource, /Date\.now\(/, 'touch binding should not use wall-clock time for tap timing');
  assert.match(inputStateSource, /slicePath\.push\(\{ x: screenX, y: screenY \}\)/, 'slice-path append should mutate in place instead of reallocating');
  assert.match(gameSource, /_scheduleTutorialDefeatReload\(\)/, 'tutorial defeat should route through a guarded delayed reload helper');
  assert.match(gameSource, /this\._disposeInputBindings = bindGameInputEvents\(this\)/, 'game should keep a disposable handle for global input bindings');
  assert.match(inputBindingSource, /return function disposeGameInputEvents\(\)/, 'input binding should expose a dispose function');
  assert.equal(packageJson.scripts.smoke, 'node scripts/smoke-checks.mjs', 'package.json should expose the smoke script');
  assert.equal(packageJson.scripts['ui-sanity'], 'node scripts/ui-actions-sanity.mjs', 'package.json should expose the UI sanity script');
  assert.equal(packageJson.scripts['campaign-sanity'], 'node scripts/campaign-sanity.mjs', 'package.json should expose the campaign sanity script');
  assert.equal(packageJson.scripts['progression-sanity'], 'node scripts/game-state-progression-sanity.mjs', 'package.json should expose the progression sanity script');
  assert.equal(packageJson.scripts['input-harness'], 'node scripts/input-harness.mjs', 'package.json should expose the input harness script');
  assert.equal(packageJson.scripts['release-readiness'], 'node scripts/release-readiness.mjs', 'package.json should expose the release readiness script');
  assert.equal(packageJson.scripts.soak, 'node scripts/simulation-soak.mjs', 'package.json should expose the soak script');
  assert.equal(packageJson.scripts['ui-dom-sanity'], 'node scripts/ui-dom-sanity.mjs', 'package.json should expose the UI DOM sanity script');
  assert.equal(packageJson.scripts['commentary-policy'], 'node scripts/commentary-policy.mjs', 'package.json should expose the commentary policy script');
  assert.equal(packageJson.scripts.check, 'npm run smoke && npm run commentary-policy && npm run ui-sanity && npm run ui-dom-sanity && npm run progression-sanity && npm run input-harness && npm run campaign-sanity && npm run release-readiness && npm run soak', 'package.json should expose an aggregate check script');
}

async function testRegenDisplayAndFlowTooltipStayCanonical() {
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const buildPreviewSource = await fs.readFile(path.join(ROOT, 'src/input/BuildPreview.js'), 'utf8');
  const energyBudgetSource = await fs.readFile(path.join(ROOT, 'src/systems/EnergyBudget.js'), 'utf8');

  assert.match(uiRendererSource, /computeNodeDisplayRegenRate\(n, frenzyActive\)/, 'node info panel should use the canonical displayed regen helper');
  assert.doesNotMatch(uiRendererSource, /TIER_REGEN\[n\.level\]/, 'node info panel should not bypass the canonical regen helper');
  assert.match(buildPreviewSource, /displayFlowRate/, 'build preview should expose a display flow rate field for existing tentacles');
  assert.match(gameSource, /previewModel\.displayFlowRate > 0/, 'the quick tooltip should keep flow visible even for low non-zero rates');
  assert.match(gameSource, /toFixed\(1\) \+ 'e\/s'/, 'the quick tooltip should show flow with one decimal place');
  assert.match(energyBudgetSource, /FRENZY_REGEN_MULT/, 'displayed regen helper should stay aligned with frenzy regen rules');
}

async function testRedPurpleAllianceSkipsImmediateClash() {
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const aiSource = await fs.readFile(path.join(ROOT, 'src/systems/AI.js'), 'utf8');
  const tentRulesSource = await fs.readFile(path.join(ROOT, 'src/entities/TentRules.js'), 'utf8');

  assert.match(gameSource, /areHostileOwners\(opposingTentacle\.effectiveSourceNode\.owner, sourceNode\.owner\)/, 'player-created tentacles should only trigger immediate clash against hostile owners');
  assert.match(aiSource, /areHostileOwners\(opposingTentacle\.effectiveSourceNode\.owner, sourceNode\.owner\)/, 'AI-created tentacles should only trigger immediate clash against hostile owners');
  assert.match(tentRulesSource, /areAlliedOwners\(opposingTentacle\.effectiveSourceNode\.owner, tentacle\.effectiveSourceNode\.owner\)/, 'growing allied tentacles should not convert into clashes');
}

async function testAllianceUiAndOwnershipStayCoalitionAware() {
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');
  const ownershipSource = await fs.readFile(path.join(ROOT, 'src/systems/Ownership.js'), 'utf8');
  const tentCombatSource = await fs.readFile(path.join(ROOT, 'src/entities/TentCombat.js'), 'utf8');
  const autoRetractSource = await fs.readFile(path.join(ROOT, 'src/systems/world/AutoRetractSystem.js'), 'utf8');
  const { retractInvalidTentaclesAfterOwnershipChange } = await load('src/systems/Ownership.js');
  const { GameNode } = await load('src/entities/GameNode.js');

  assert.match(uiRendererSource, /areAlliedOwners\(t2\.source\.owner, n\.owner\)/, 'node info panel should count coalition support as allied incoming flow');
  assert.match(ownershipSource, /tent\.effectiveSourceNode === node/, 'ownership cleanup should always retract outgoing commitments rooted at the captured node');
  assert.match(tentCombatSource, /areAlliedOwners\(targetNode\.owner, sourceNode\.owner\)/, 'tentacle combat should route coalition links through the friendly flow path');
  assert.match(autoRetractSource, /areHostileOwners\(tentacle\.target\.owner, node\.owner\)/, 'auto-retract should only retract hostile outgoing tentacles');

  const capturedNode = new GameNode(10, 0, 0, 30, 2);
  const alliedTarget = new GameNode(11, 0, 0, 30, 1);
  const hostileSource = new GameNode(12, 0, 0, 30, 2);
  const outgoingTentacle = {
    alive: true,
    effectiveSourceNode: capturedNode,
    effectiveTargetNode: alliedTarget,
    killCalls: 0,
    kill() { this.killCalls += 1; },
  };
  const incomingHostileTentacle = {
    alive: true,
    effectiveSourceNode: hostileSource,
    effectiveTargetNode: capturedNode,
    killCalls: 0,
    kill() { this.killCalls += 1; },
  };

  retractInvalidTentaclesAfterOwnershipChange(
    { tents: [outgoingTentacle, incomingHostileTentacle] },
    capturedNode,
    1,
  );

  assert.equal(outgoingTentacle.killCalls, 1, 'capturing a node should retract its old outgoing tentacles instead of preserving them as allied support');
  assert.equal(incomingHostileTentacle.killCalls, 0, 'capturing a node should not erase incoming pressure from other hostile sources');

  const twOutgoingTentacle = {
    alive: true,
    effectiveSourceNode: capturedNode,
    effectiveTargetNode: alliedTarget,
    paidCost: 6,
    energyInPipe: 4,
    collapseCalls: 0,
    getCommittedPayloadForOwnershipCleanup() { return this.paidCost + this.energyInPipe; },
    collapseForOwnershipLoss() { this.collapseCalls += 1; this.paidCost = 0; this.energyInPipe = 0; },
  };
  const releasedOutgoingEnergy = retractInvalidTentaclesAfterOwnershipChange(
    { tents: [twOutgoingTentacle] },
    capturedNode,
    1,
    { suppressRefundOnOutgoingTentacles: true },
  );

  assert.equal(releasedOutgoingEnergy, 10, 'TentacleWars ownership cleanup should report released outgoing lane payload for hostile carryover');
  assert.equal(twOutgoingTentacle.collapseCalls, 1, 'TentacleWars ownership cleanup should collapse outgoing lanes without refunding them');
}

async function testNeutralContestAllianceModesStayParametrizable() {
  const { GameNode } = await load('src/entities/GameNode.js');
  const {
    getContestCaptureOwner,
    getContestCaptureScore,
    getDisplayContestEntries,
    shouldIgnoreAlliedContestContribution,
  } = await load('src/systems/NeutralContest.js');
  const { GAME_BALANCE } = await load('src/config/gameConfig.js');

  const target = new GameNode(0, 0, 0, 20, 0);
  target.contest = { 2: 6, 3: 5, 1: 4 };

  assert.equal(GAME_BALANCE.NEUTRAL_CAPTURE_ALLIANCE_MODE, 'sum', 'neutral capture alliance mode should default to coalition sum for balancing flexibility');
  assert.equal(getContestCaptureScore(target, 3, 'sum'), 11, 'sum mode should combine red and purple neutral capture pressure');
  assert.equal(getContestCaptureOwner(target, 3, 'sum'), 2, 'sum mode should award the node to the dominant allied contributor');

  const displayEntries = getDisplayContestEntries(target, 'sum');
  assert.equal(displayEntries.length, 2, 'sum mode should display coalition contest progress rather than separate allied arcs');
  assert.equal(displayEntries[0].score, 11, 'the leading displayed coalition score should match the summed allied pressure');

  const lockoutTarget = new GameNode(1, 0, 0, 20, 0);
  lockoutTarget.contest = { 2: 3, 3: 0 };
  assert.equal(
    shouldIgnoreAlliedContestContribution(lockoutTarget, 3, 'lockout'),
    true,
    'lockout mode should prevent a second allied owner from interfering once the first one has started the neutral capture',
  );
}

async function testCampaignEndingFlowAndDebugPreviewStayPresent() {
  const screenControllerSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const indexSource = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const domIdsSource = await fs.readFile(path.join(ROOT, 'src/ui/DomIds.js'), 'utf8');
  const i18nSource = await fs.readFile(path.join(ROOT, 'src/localization/i18n.js'), 'utf8');
  const musicSource = await fs.readFile(path.join(ROOT, 'src/audio/Music.js'), 'utf8');

  assert.match(screenControllerSource, /if \(win && levelId === 32\) \{\s*showCampaignEnding\(game\);/s, 'winning the final phase should route to the dedicated campaign ending screen');
  assert.match(screenControllerSource, /export function showCampaignEnding\(/, 'screen controller should expose a dedicated campaign ending entry point');
  assert.match(screenControllerSource, /Music\.playEnding\(\);/, 'campaign ending should play a dedicated ending theme instead of falling back to menu music');
  assert.match(mainSource, /BTN_VIEW_ENDING/, 'debug mode should expose a button to preview the campaign ending');
  assert.match(mainSource, /showCampaignEnding\(debugPreviewGame, \{ debugPreview: true \}\)/, 'debug ending preview should open the ending screen in preview mode');
  assert.match(indexSource, /id="sce"/, 'campaign ending screen should exist in the HTML with a unique DOM id');
  assert.match(indexSource, /id="btnViewEnding"/, 'settings screen should expose the debug preview ending button');
  assert.match(domIdsSource, /SCREEN_ENDING:\s+'sce'/, 'campaign ending screen id should not collide with existing HUD ids');
  assert.match(i18nSource, /endingStory:/, 'localization should provide the campaign ending narrative');
  assert.match(i18nSource, /endingTitle:/, 'localization should provide the campaign ending title');
  assert.match(i18nSource, /setViewEnding:/, 'settings copy should expose the campaign ending preview label in i18n');
  assert.match(i18nSource, /viewEnding:/, 'button copy should expose the campaign ending preview CTA in i18n');
  assert.match(musicSource, /networkAwakens/, 'music system should expose a dedicated ending theme definition');
  assert.match(musicSource, /stella/, 'music system should expose the Stella bonus track definition');
}

async function testGroupedMusicAndNotificationFlowStayCanonical() {
  const musicSource = await fs.readFile(path.join(ROOT, 'src/audio/Music.js'), 'utf8');
  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');
  const screenControllerSource = await fs.readFile(path.join(ROOT, 'src/ui/ScreenController.js'), 'utf8');
  const i18nSource = await fs.readFile(path.join(ROOT, 'src/localization/i18n.js'), 'utf8');

  assert.match(musicSource, /const TRACKS = Object\.freeze\(/, 'music should centralize track metadata in a canonical track table');
  assert.match(musicSource, /function playLevelTheme\(levelConfig\)/, 'music should resolve gameplay themes by grouped phase context');
  assert.match(musicSource, /function playEnding\(\)/, 'music should expose a dedicated epilogue theme');
  assert.match(musicSource, /setTrackChangeListener\(listener\)/, 'music should support structured track-change notifications');
  assert.match(musicSource, /let isPreviewPlayback = false;/, 'music should track a dedicated preview-playback mode for the settings soundtrack player');
  assert.match(musicSource, /let previewTrackId = null;/, 'music should keep a dedicated preview cursor for soundtrack browsing');
  assert.match(musicSource, /if \(isPreviewPlayback\) return 1;/, 'preview playback should bypass the normal music toggle so settings preview always works');
  assert.match(musicSource, /trackCount: \(\) => TRACK_ORDER\.length/, 'music should expose the full soundtrack catalog size');
  assert.match(musicSource, /currentPreviewTrackPosition:/, 'music should expose the current soundtrack preview position');
  assert.match(musicSource, /phaseRangeLabel:\s*'World 1 tutorial · phases 1-4'/, 'music metadata should document the World 1 opening phase range');
  assert.match(musicSource, /phaseRangeLabel:\s*'World 2 phases 15-20'/, 'music metadata should document the World 2 mid-pressure phase range');
  assert.match(musicSource, /phaseRangeLabel:\s*'World 3 phases 29-32'/, 'music metadata should document the World 3 finale phase range');
  assert.match(mainSource, /Music\.setTrackChangeListener\(/, 'main should subscribe to music track changes');
  assert.match(mainSource, /BTN_MUSIC_PREV/, 'settings should expose a previous-track soundtrack player control');
  assert.match(mainSource, /BTN_MUSIC_TOGGLE/, 'settings should expose a play-pause soundtrack player control');
  assert.match(mainSource, /BTN_MUSIC_NEXT/, 'settings should expose a next-track soundtrack player control');
  assert.match(mainSource, /notifNowPlaying/, 'music notifications should stay localized through i18n');
  assert.match(mainSource, /dedupeKey:\s*`music:\$\{trackInfo\.id\}`/, 'music notifications should dedupe by canonical track id');
  assert.match(musicSource, /if \(levelConfig\.isTutorial \|\| levelId <= 4\) playGenesis\(\);\s*else if \(levelId === 10\) playEchoCore\(\);\s*else playSiegeBloom\(\);/s, 'World 1 phase routing should stay mapped to opening, pressure, and boss tracks');
  assert.match(musicSource, /if \(levelConfig\.isTutorial \|\| levelId <= 14\) playVoid\(\);\s*else if \(levelId === 21\) playOblivionGate\(\);\s*else playEntropyCurrent\(\);/s, 'World 2 phase routing should stay mapped to opening, pressure, and boss tracks');
  assert.match(musicSource, /if \(levelConfig\.isTutorial \|\| levelId <= 24\) playNexus\(\);\s*else if \(levelId >= 29\) playTranscendenceProtocol\(\);\s*else playSignalWar\(\);/s, 'World 3 phase routing should stay mapped to opening, pressure, and finale tracks');
  assert.match(gameSource, /this\.playCurrentModeMusic\(\)/, 'mode-aware runtime loading and pause resume should route through one music helper');
  assert.match(screenControllerSource, /export function showNotification\(/, 'screen controller should expose the structured notification surface');
  assert.match(screenControllerSource, /const _notificationPriority = \{[\s\S]*warning:\s*4[\s\S]*objective:\s*3/s, 'notification stack should define explicit priority tiers');
  assert.match(screenControllerSource, /if \(dedupeKey\) \{[\s\S]*_notificationRecent\.set\(dedupeKey, now\)/s, 'notification stack should dedupe repeat events');
  assert.match(i18nSource, /trackSignalWar:/, 'localization should expose grouped soundtrack names');
  assert.match(i18nSource, /trackStella:/, 'localization should expose the Stella bonus track name');
  assert.match(i18nSource, /trackRoleBonusStella:/, 'localization should expose the Stella emotional role text');
  assert.match(mainSource, /body:\s*T\(trackInfo\.roleKey\)/, 'music popup body should use the emotional track role copy');
  assert.doesNotMatch(mainSource, /notifMusicMeta/, 'music popup should no longer expose technical BPM or loop metadata');
}

async function testMusicBootContractStaysRuntimeSafe() {
  const musicModule = await load('src/audio/Music.js');
  const { Music } = musicModule;

  assert.equal(typeof Music?.setTrackChangeListener, 'function', 'Music runtime contract should expose setTrackChangeListener for boot wiring');
  assert.ok(Music.trackCount() >= 13, 'soundtrack player should expose the full music catalog including bonus tracks');

  const mainSource = await fs.readFile(path.join(ROOT, 'src/main.js'), 'utf8');
  assert.match(
    mainSource,
    /if \(typeof Music\.setTrackChangeListener === 'function'\) \{[\s\S]*Music\.setTrackChangeListener\(/,
    'game boot should guard the optional track-change listener contract before using it',
  );
}

async function testSoundtrackPlayerCanBrowseTheFullCatalog() {
  const musicModule = await load('src/audio/Music.js');
  const { Music } = musicModule;

  const visitedTrackIds = [];
  for (let index = 0; index < Music.trackCount(); index += 1) {
    Music.nextTrack();
    const trackInfo = Music.currentPreviewTrackInfo();
    assert.ok(trackInfo?.id, 'soundtrack player should expose a valid preview track when stepping through the catalog');
    visitedTrackIds.push(trackInfo.id);
  }

  assert.ok(visitedTrackIds.includes('networkAwakens'), 'soundtrack player should reach the ending theme while browsing the catalog');
  assert.ok(visitedTrackIds.includes('stella'), 'soundtrack player should reach Stella while browsing the catalog');
  assert.ok(visitedTrackIds.includes('aqueous'), 'soundtrack player should reach Aqueous while browsing the catalog');
}

async function testUiDomainCheckAggregationStaysPresent() {
  const packageSource = await fs.readFile(path.join(ROOT, 'package.json'), 'utf8');
  assert.match(packageSource, /"check:ui":\s*"npm run ui-sanity && npm run ui-dom-sanity"/, 'UI domain check should aggregate action and DOM-lite suites');
}

async function testCanvasFontSelectionStaysCanonical() {
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const tentRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/TentRenderer.js'), 'utf8');
  const hazardRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/HazardRenderer.js'), 'utf8');
  const tutorialSource = await fs.readFile(path.join(ROOT, 'src/systems/Tutorial.js'), 'utf8');
  const fontHelperSource = await fs.readFile(path.join(ROOT, 'src/theme/uiFonts.js'), 'utf8');

  assert.match(fontHelperSource, /export function getCanvasDisplayFont/, 'UI font helper should expose a canonical canvas display-font builder');
  assert.match(fontHelperSource, /export function getCanvasCopyFont/, 'UI font helper should expose a canonical canvas copy-font builder');
  assert.match(uiRendererSource, /getCanvasCopyFont|getCanvasDisplayFont/, 'UI renderer should use the shared canvas font helper');
  assert.match(nodeRendererSource, /getCanvasCopyFont|getCanvasDisplayFont/, 'node renderer should use the shared canvas font helper');
  assert.match(tentRendererSource, /getCanvasCopyFont/, 'tent renderer should use the shared canvas font helper');
  assert.match(hazardRendererSource, /getCanvasCopyFont|getCanvasDisplayFont/, 'hazard renderer should use the shared canvas font helper');
  assert.match(tutorialSource, /getCanvasCopyFont/, 'tutorial overlay should use the shared canvas font helper for its labels');

  for (const source of [uiRendererSource, nodeRendererSource, tentRendererSource, hazardRendererSource]) {
    assert.doesNotMatch(source, /Orbitron|Share Tech Mono/, 'canvas UI renderers should not hardcode specific font family names');
  }
}

async function testCampaignBalanceWaveBValuesStayApplied() {
  const { getLevelConfig } = await load('src/config/gameConfig.js');

  assert.equal(getLevelConfig(18).playerStartEnergy, 36, 'Wave B should keep the gentler player opening on MAELSTROM');
  assert.equal(getLevelConfig(21).purpleEnemyStartEnergy, 42, 'Wave B should keep the softer purple pressure on OBLIVION');
  assert.equal(getLevelConfig(24).playerStartEnergy, 34, 'Wave B should keep the stronger relay-race opening for the player');
  assert.equal(getLevelConfig(30).playerStartEnergy, 40, 'Wave B should keep the clearer SIGNAL LOCK opening');
  assert.equal(getLevelConfig(32).aiThinkIntervalSeconds, 1.6, 'Wave B should keep the slightly less oppressive final-phase think rate');
}

async function testCommentaryHeadersStayModernAndEnglish() {
  const sourceFiles = await listJsFiles('src');
  const legacyHeaderPattern = /NODE WARS v3/;
  const portugueseCommentPattern = /\b(questao|descricao|controle|captura|energia|tentaculo|mundo|fase|jogador|inimigo|coment[aá]rio|renderiza|ajuste)\b/i;

  for (const relativePath of sourceFiles.filter(file => file.endsWith('.js'))) {
    const source = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
    assert.doesNotMatch(source, legacyHeaderPattern, `${relativePath} should not keep legacy v3 headers in comments`);
    const firstNonEmptyLine = source.split('\n').find(line => line.trim()) || '';
    assert.match(firstNonEmptyLine, /^\/\*/, `${relativePath} should start with a module header comment`);
    const commentLines = source
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('//') || line.startsWith('/*') || line.startsWith('*'));

    for (const commentLine of commentLines) {
      assert.doesNotMatch(commentLine, portugueseCommentPattern, `${relativePath} should keep code comments in English`);
    }
  }
}

async function testTwAiDebugScoringFlagIsOffByDefault() {
  const { TW_BALANCE } = await load('src/tentaclewars/TwBalance.js');

  assert.ok(
    Object.prototype.hasOwnProperty.call(TW_BALANCE, 'AI_DEBUG_SCORING'),
    'TW_BALANCE must expose AI_DEBUG_SCORING'
  );
  assert.equal(
    TW_BALANCE.AI_DEBUG_SCORING,
    false,
    'AI_DEBUG_SCORING must default to false so observability is off in production'
  );
  assert.ok(
    Object.prototype.hasOwnProperty.call(TW_BALANCE, 'AI_FINISH_LOW_ENERGY_FRACTION'),
    'TW_BALANCE must expose AI_FINISH_LOW_ENERGY_FRACTION'
  );
  assert.ok(
    Object.prototype.hasOwnProperty.call(TW_BALANCE, 'AI_PRESSURE_OVERFLOW_THRESHOLD'),
    'TW_BALANCE must expose AI_PRESSURE_OVERFLOW_THRESHOLD'
  );
}

async function testTwAiObservabilityGuardIsExplicit() {
  const twAiSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwAI.js'), 'utf8');

  assert.match(
    twAiSource,
    /if\s*\(\s*TW_BALANCE\.AI_DEBUG_SCORING\s*\)/,
    'TwAI must guard all debug output with an explicit if (TW_BALANCE.AI_DEBUG_SCORING) conditional'
  );

  assert.match(
    twAiSource,
    /applySliceCut\([^)]*\)[\s\S]{0,120}console\.debug/,
    'TwAI purple slice debug output must appear after applySliceCut, not before'
  );

  const sliceMethodMatch = twAiSource.match(/_checkPurpleSlicePressure\(\)[\s\S]*?^  \}/m);
  if (sliceMethodMatch) {
    const sliceBody = sliceMethodMatch[0];
    const debugIdx = sliceBody.indexOf('console.debug');
    const sliceIdx = sliceBody.indexOf('applySliceCut');
    if (debugIdx !== -1 && sliceIdx !== -1) {
      assert.ok(
        sliceIdx < debugIdx,
        'console.debug in _checkPurpleSlicePressure must appear after applySliceCut'
      );
    }
  }
}

async function testTwAiObservabilityDoesNotLogWhenSourcesEmpty() {
  const twAiSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwAI.js'), 'utf8');

  const thinkIdx = twAiSource.indexOf('_think()');
  assert.ok(thinkIdx !== -1, 'TwAI must have a _think() method');
  const thinkBody = twAiSource.slice(thinkIdx);
  const earlyReturnIdx = thinkBody.indexOf('if (!sourceNodes.length) return');
  const firstDebugIdx = thinkBody.indexOf('console.debug');
  assert.ok(earlyReturnIdx !== -1, '_think() must have the sourceNodes.length early-return guard');
  assert.ok(
    earlyReturnIdx < firstDebugIdx || firstDebugIdx === -1,
    'The sourceNodes.length early-return must appear before any console.debug in _think()'
  );
}

async function testTwAiObservabilityLogsAllCandidatesBeforePick() {
  const twAiSource = await fs.readFile(path.join(ROOT, 'src/tentaclewars/TwAI.js'), 'utf8');

  assert.match(
    twAiSource,
    /candidateMoves[\s\S]{0,300}console\.debug[\s\S]{0,300}usedSourceIds/,
    'TwAI observability must log all candidates before the pick loop begins'
  );
}

async function testTwAiTacticalStateClassifier() {
  const { buildTwAiTacticalState } = await load('src/tentaclewars/TwAIScoring.js');

  const n = overrides => ({
    id: Math.floor(Math.random() * 9999),
    owner: 2,
    energy: 50,
    maxE: 100,
    underAttack: 0,
    ...overrides,
  });

  const gameExpand = {
    nodes: [
      n({ owner: 2, energy: 30, maxE: 100 }),
      n({ owner: 0, energy: 20, maxE: 60 }),
    ],
  };
  assert.equal(
    buildTwAiTacticalState(gameExpand, 2),
    'expand',
    'No overflow-ready source should yield expand'
  );

  const gamePressure = {
    nodes: [
      n({ owner: 2, energy: 75, maxE: 100 }),
      n({ owner: 1, energy: 60, maxE: 100 }),
    ],
  };
  assert.equal(
    buildTwAiTacticalState(gamePressure, 2),
    'pressure',
    'Overflow-ready source with no low-energy hostile should yield pressure'
  );

  const gameFinish = {
    nodes: [
      n({ owner: 2, energy: 95, maxE: 100 }),
      n({ owner: 1, energy: 20, maxE: 100 }),
    ],
  };
  assert.equal(
    buildTwAiTacticalState(gameFinish, 2),
    'finish',
    'Overflow-ready source with a low-energy hostile should yield finish'
  );

  for (const [game, idx] of [[gameExpand, 0], [gamePressure, 1], [gameFinish, 2]]) {
    const state = buildTwAiTacticalState(game, 2);
    assert.ok(
      ['expand', 'pressure', 'finish'].includes(state),
      `buildTwAiTacticalState must return a known state (case ${idx}), got: ${String(state)}`
    );
  }
}

async function testTwAiTacticalStateModulatesScoring() {
  const { buildTentacleWarsMoveScore } = await load('src/tentaclewars/TwAIScoring.js');

  const mockGame = { tents: [], nodes: [] };
  const src = { id: 1, owner: 2, energy: 90, maxE: 100, x: 0, y: 0, outCount: 0 };
  const hostile = { id: 2, owner: 1, energy: 20, maxE: 100, x: 200, y: 0, underAttack: 0, outCount: 0, contest: {} };
  const neutral = { id: 3, owner: 0, energy: 20, maxE: 60, x: 200, y: 0, underAttack: 0, outCount: 0, contest: {} };
  mockGame.nodes = [src, hostile, neutral];

  const scoreHostile = state => buildTentacleWarsMoveScore({
    game: mockGame,
    owner: 2,
    sourceNode: src,
    targetNode: hostile,
    totalBuildCost: 5,
    tacticalState: state,
  });
  const scoreNeutral = state => buildTentacleWarsMoveScore({
    game: mockGame,
    owner: 2,
    sourceNode: src,
    targetNode: neutral,
    totalBuildCost: 5,
    tacticalState: state,
  });

  assert.ok(
    scoreNeutral('expand') > scoreNeutral('pressure'),
    'expand should weight neutral capture higher than pressure'
  );
  assert.ok(
    scoreHostile('finish') > scoreHostile('expand'),
    'finish should weight hostile pressure higher than expand'
  );
}

async function main() {
  const tests = [
    ['relay nodes do not create free energy', testRelayNoFreeEnergy],
    ['programmatic retract refunds payload', testProgrammaticRetractRefundsPayload],
    ['slice cut rules stay canonical', testSliceCutRulesStayCanonical],
    ['middle cut releases clash instead of destroying the partner', testMiddleCutReleasesClashInsteadOfDestroyingPartner],
    ['instant activation only tracks actually paid build cost', testImmediateActivationTracksPaidCostCorrectly],
    ['growing tentacles cannot advance without source budget', testGrowingTentacleCannotAdvanceWithoutBudget],
    ['growing retract refunds full paid construction cost', testGrowingTentacleRetractRefundsFullPaidCost],
    ['stable node level hysteresis prevents cap-threshold thrash', testStableNodeLevelHysteresisPreventsCapThrash],
    ['reversed retract refunds the effective source node', testReversedRetractRefundsEffectiveSource],
    ['middle cut conserves payload across refund and impact', testMiddleCutConservesPayloadAcrossRefundAndImpact],
    ['TentacleWars cuts use continuous geometric split semantics', testTentacleWarsCutUsesContinuousGeometry],
    ['TentacleWars neutral capture path stays mode-owned', testTentacleWarsNeutralCapturePathStaysModeOwned],
    ['TentacleWars immediate payload uses mode-specific capture rules', testTentacleWarsImmediatePayloadUsesModeSpecificCaptureRules],
    ['build cost tuning stays playable', testBuildCostTuningStaysPlayable],
    ['neutral contest does not artificially stall', testNeutralContestDoesNotArtificiallyStall],
    ['nodes under attack keep reduced outgoing flow', testUnderAttackStillAllowsReducedOutput],
    ['vortex drain uses the effective source on reversed tentacles', testVortexDrainsEffectiveSourceOnReversedTentacles],
    ['pulsar injects energy into owned nodes only', testPulsarInjectsEnergyIntoOwnedNodes],
    ['auto-retract kills outgoing enemy tentacles', testAutoRetractKillsOutgoingEnemyTentacles],
    ['fixed campaign layouts cover all configured levels', testFixedCampaignLayoutsCoverAllLevels],
    ['owner-3 palette selection is correct', testOwner3PaletteSelection],
    ['AI can evaluate relays as targets', testAIRelayTargeting],
    ['AI can use relays as origins when they have real budget', testAIRelayOriginsCanBeUsedWhenBudgeted],
    ['AI quality wave improves support and kill-confirm pressure', testAiQualityWaveImprovesSupportAndKillConfirm],
    ['AI avoids low-value overcommit', testAiAvoidsLowValueOvercommit],
    ['shared burst mechanic is used by both player and AI paths', testSharedBurstEntryPoint],
    ['ownership and contest logic use canonical shared paths', testOwnershipAndContestCanonicalization],
    ['player relay interaction paths stay enabled', testRelayPlayerInteractionPaths],
    ['neutral capture visuals use real thresholds and show a leader', testNeutralCaptureVisualUsesRealThresholds],
    ['tutorial copy matches current controls and rules', testTutorialCopyMatchesCurrentControlsAndRules],
    ['visual polish paths for world 3, tutorial ghost, and critical combat stay present', testVisualPolishPathsStayPresent],
    ['graphics profiles are explicit and backward compatible', testGraphicsProfilesAreExplicitAndBackwardCompatible],
    ['HUD and phase feedback stay aligned with current gameplay', testHudAndPhaseFeedbackStayAligned],
    ['canvas feedback events for capture and phase outcome stay present', testCanvasFeedbackEventsStayPresent],
    ['menu display controls, themes, and debug helpers stay present', testMenuAndDisplayControlsStayPresent],
    ['render performance instrumentation stays present', testRenderPerformanceInstrumentationStaysPresent],
    ['audio event density protection stays present', testAudioEventDensityProtectionStaysPresent],
    ['owner palette stays canonical in node rendering', testOwnerPaletteStaysCanonicalInNodeRendering],
    ['settings, tutorial, and story content stay in sync', testSettingsTutorialAndStoryStayInSync],
    ['progress and settings persistence guardrails stay present', testProgressAndSettingsPersistenceGuardrailsStayPresent],
    ['level 0 nodes stay renderable', testLevelZeroNodesStayRenderable],
    ['FPS HUD and skip guardrails stay present', testFpsHudAndSkipGuardrailsStayPresent],
    ['World unlock and purple badge guardrails stay present', testWorldUnlockAndPurpleBadgeGuardrailsStayPresent],
    ['World 1 tutorial tab and feed/clash budgets stay aligned', testWorldOneTutorialTabAndFeedClashBudgetStayAligned],
    ['Tutorial exit and mouse gesture guards stay present', testTutorialExitAndMouseGestureGuardsStayPresent],
    ['Primary-button slice uses distinct visual and drag targeting', testPrimaryButtonSliceUsesDistinctVisualAndDragTargeting],
    ['Frenzy requires the same continuous slice gesture', testFrenzyRequiresSameContinuousSliceGesture],
    ['Fresh clashes use an approach visual front instead of popping to mid-lane', testFreshClashUsesApproachVisualFront],
    ['TentacleWars clashes stay pinned at the lane midpoint', testTentacleWarsClashStaysPinnedAtMidpoint],
    ['TentacleWars clash approach actually advances before midpoint lock', testTentacleWarsClashApproachActuallyAdvances],
    ['TentacleWars clash preview affordability matches click resolution', testTentacleWarsClashPreviewMatchesClickResolution],
    ['Purple AI differentiation and frame-driven core visuals stay present', testPurpleAiDifferentiationAndFrameDrivenCoreVisuals],
    ['AI tactical state and slice pressure stay active', testAiTacticalStateAndSlicePressureStayActive],
    ['Tutorial steps stay rigid and gated', testTutorialStepsStayRigidAndGated],
    ['loadLevel finalization and invalid-action UX stay aligned', testLoadLevelFinalizationAndInvalidActionUxStayAligned],
    ['Input wave V2 guardrails stay present', testInputWaveV2GuardrailsStayPresent],
    ['Regen display and flow tooltip stay canonical', testRegenDisplayAndFlowTooltipStayCanonical],
    ['Red-purple alliance skips immediate clash paths', testRedPurpleAllianceSkipsImmediateClash],
    ['Alliance-aware UI and ownership rules stay present', testAllianceUiAndOwnershipStayCoalitionAware],
    ['Neutral contest alliance modes stay parametrizable', testNeutralContestAllianceModesStayParametrizable],
    ['Campaign ending flow and debug preview stay present', testCampaignEndingFlowAndDebugPreviewStayPresent],
    ['Grouped music and notification flow stay canonical', testGroupedMusicAndNotificationFlowStayCanonical],
    ['Music boot contract stays runtime-safe', testMusicBootContractStaysRuntimeSafe],
    ['Soundtrack player can browse the full catalog', testSoundtrackPlayerCanBrowseTheFullCatalog],
    ['UI domain check aggregation stays present', testUiDomainCheckAggregationStaysPresent],
    ['Canvas font selection stays canonical', testCanvasFontSelectionStaysCanonical],
    ['Campaign balance wave B values stay applied', testCampaignBalanceWaveBValuesStayApplied],
    ['TentacleWars mode skeleton stays wired', testTentacleWarsModeSkeletonStaysWired],
    ['TentacleWars grade table stays anchored to the agreed fidelity model', testTentacleWarsGradeTableCore],
    ['TentacleWars slot cap stays within original range', testTentacleWarsSlotCapStaysWithinOriginalRange],
    ['TentacleWars info panel uses a mode-owned presentation contract', testTentacleWarsInfoPanelUsesModeOwnedPresentationContract],
    ['TentacleWars touch drag-connect uses canonical path', testTentacleWarsTouchDragConnectUsesCanonicalPath],
    ['TentacleWars packet accumulator stays deterministic', testTentacleWarsPacketAccumulatorCore],
    ['TentacleWars tentacle economy stays linear and fully refundable', testTentacleWarsTentacleEconomyCore],
    ['TentacleWars overflow and capture core stays parameterized and deterministic', testTentacleWarsOverflowAndCaptureCore],
    ['TentacleWars overflow budget accumulates when node is at energyCap', testTentacleWarsOverflowBudgetAccumulatesAtCap],
    ['GameNode initializes excessFeed and pendingExcessFeed to zero', testTentacleWarsGameNodeHasExcessFeedProperties],
    ['TentacleWars sandbox prototype stays isolated from campaign flow', testTentacleWarsSandboxPrototypeBoundary],
    ['TentacleWars sandbox disables world-layer gimmicks', testTentacleWarsSandboxDisablesWorldLayerGimmicks],
    ['TentacleWars sandbox disables frenzy and auto-retract', testTentacleWarsSandboxDisablesFrenzyAndAutoRetract],
    ['TentacleWars AI phase one stays isolated and hostile by default', testTentacleWarsAiPhaseOneBoundary],
    ['TentacleWars runtime math stays wired into sandbox entities', testTentacleWarsRuntimeMathIntegration],
    ['TentacleWars equal-grade combat respects active attack state', testTentacleWarsEqualGradeCombatRespectsActiveAttackState],
    ['TentacleWars campaign loader wires authored levels into the runtime shell', testTentacleWarsCampaignLoaderWiresAuthoredLevels],
    ['TentacleWars capsule obstacle blocks a crossing tentacle lane', testTentacleWarsCapsuleObstacleBlocksCrossingLane],
    ['TentacleWars capsule obstacle does not block a non-crossing lane', testTentacleWarsCapsuleObstacleIgnoresNonCrossingLane],
    ['TentacleWars controlled scenario presets stay wired', testTentacleWarsControlledScenarioPresetsStayWired],
    ['TentacleWars cut retraction presentation stays progressive', testTentacleWarsCutRetractionPresentationStaysProgressive],
    ['TentacleWars cut retraction does not explode target flash', testTentacleWarsCutRetractionDoesNotExplodeTargetFlash],
    ['Range preview stays viewport clamped', testRangePreviewStaysViewportClamped],
    ['Commentary headers stay modern and English', testCommentaryHeadersStayModernAndEnglish],
    ['TentacleWars AI debug scoring flag is off by default', testTwAiDebugScoringFlagIsOffByDefault],
    ['TentacleWars AI observability guard is explicit and correctly placed', testTwAiObservabilityGuardIsExplicit],
    ['TentacleWars AI observability does not log when sources list is empty', testTwAiObservabilityDoesNotLogWhenSourcesEmpty],
    ['TentacleWars AI observability logs all candidates before pick loop', testTwAiObservabilityLogsAllCandidatesBeforePick],
    ['TentacleWars AI tactical state classifier returns valid states for all board shapes', testTwAiTacticalStateClassifier],
    ['TentacleWars AI tactical state modulates scoring by intent', testTwAiTacticalStateModulatesScoring],
    ['TentacleWars clash damage applies to losing source node', testTwClashDamageAppliesToLosingNode],
    ['TentacleWars clash threshold triggers auto-retract and auto-advance', testTwClashThresholdTriggersRetractAndAdvance],
    ['TentacleWars clash damage is bidirectional (canonical driver can lose)', testTwClashBidirectionalDamage],
    ['TentacleWars clash flowRate stays alive on both tentacle sides', testTwClashFlowRateStaysAliveOnBothSides],
    ['TentacleWars clash packet queue is fed during clash on both tentacles', testTwClashPacketQueueFedDuringClash],
  ];

  let passed = 0;
  for (const [name, fn] of tests) {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  }
  console.log(`\n${passed}/${tests.length} smoke checks passed`);
}

main().catch(err => {
  console.error('Smoke checks failed');
  console.error(err);
  process.exitCode = 1;
});
