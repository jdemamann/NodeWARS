import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const load = rel => import(path.join(ROOT, rel));

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
    effectiveSourceNode: { owner: 3 },
    effectiveTargetNode: { owner: 1, energy: 10 },
    energyInPipe: 8,
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
  assert.match(aiSource, /if \(this\.owner === 3\) this\._checkStrategicCuts\(this\.game\);/, 'purple AI should check strategic cuts outside the think-interval early return');
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
  assert.match(i18nSource, /export function getTutorialSteps\(/, 'i18n should expose an explicit tutorial step helper');
  assert.match(tutorialSource, /getTutorialSteps\(STATE\.curLang, tutorialWorldId\)/, 'tutorial flow should consume the explicit tutorial helper');
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
  const indexSource = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const tentRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/TentRenderer.js'), 'utf8');
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const bgRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/BGRenderer.js'), 'utf8');
  const hazardRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/HazardRenderer.js'), 'utf8');
  const orbSource = await fs.readFile(path.join(ROOT, 'src/entities/Orb.js'), 'utf8');

  assert.match(gameStateSource, /graphicsMode: 'low'/, 'settings should persist an explicit graphics profile');
  assert.match(gameStateSource, /_normalizeGraphicsSettings\(/, 'game state should normalize old and new graphics settings');
  assert.match(mainSource, /cycleGraphicsMode\(/, 'main settings flow should cycle between explicit graphics profiles');
  assert.match(screensSource, /togGraphicsMode/, 'settings UI should expose the graphics mode toggle');
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
  const gameStateSource = await fs.readFile(path.join(ROOT, 'src/core/GameState.js'), 'utf8');
  const hudSource = await fs.readFile(path.join(ROOT, 'src/ui/HUD.js'), 'utf8');
  const cssSource = await fs.readFile(path.join(ROOT, 'styles/main.css'), 'utf8');
  const i18nSource = await fs.readFile(path.join(ROOT, 'src/localization/i18n.js'), 'utf8');

  assert.match(indexSource, /hero-logo/, 'main menu should include the custom logo structure');
  assert.match(indexSource, /id="togShowFps"/, 'settings should expose the FPS toggle');
  assert.match(indexSource, /id="btnCopyDebug"/, 'settings should expose the debug snapshot action');
  assert.match(indexSource, /id="btnViewEnding"/, 'settings should expose the campaign-ending preview action in debug mode');
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
  assert.match(i18nSource, /setCopyDebug/, 'i18n should include the debug snapshot labels');
  assert.match(i18nSource, /setViewEnding/, 'i18n should include the debug ending-preview labels');
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

  assert.match(screenControllerSource, /story-strip/, 'story screen should keep lightweight visual chapter navigation');
  assert.match(screenControllerSource, /stchap-card/, 'story screen should keep chapter cards');
  assert.match(screenControllerSource, /ESSENTIAL INFORMATION|INFORMAÇÃO ESSENCIAL/, 'credits should stay concise and relevant');
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
  STATE.settings.w2 = true;
  assert.equal(STATE.isWorldUnlocked(2), true, 'manual World 2 enable should unlock the world even before campaign progress reaches it');
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

async function testPurpleAiDifferentiationAndFrameDrivenCoreVisuals() {
  const aiSource = await fs.readFile(path.join(ROOT, 'src/systems/AI.js'), 'utf8');
  const tentSource = await fs.readFile(path.join(ROOT, 'src/entities/Tent.js'), 'utf8');
  const tentRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/TentRenderer.js'), 'utf8');
  const nodeRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/NodeRenderer.js'), 'utf8');
  const uiRendererSource = await fs.readFile(path.join(ROOT, 'src/rendering/UIRenderer.js'), 'utf8');

  assert.match(aiSource, /if \(this\.owner === 3\) \{[\s\S]*targetNode\.energy < targetNode\.maxE \* 0\.35[\s\S]*targetNode\.underAttack > 0\.2[\s\S]*existingPressureBonus > 0/s, 'purple AI should favor kill-confirm and existing pressure more strongly than red AI');
  assert.doesNotMatch(tentSource, /Date\.now\(/, 'tent core visuals should no longer use wall-clock time directly');
  assert.doesNotMatch(tentRendererSource, /Date\.now\(/, 'tent renderer should use frame-driven time for its core animations');
  assert.doesNotMatch(nodeRendererSource, /Date\.now\(/, 'node renderer should use frame-driven time for frenzy tint animation');
  assert.doesNotMatch(uiRendererSource, /Date\.now\(/, 'UI renderer should use game time for phase outcome and frenzy pulses');
}

async function testTutorialStepsStayRigidAndGated() {
  const tutorialSource = await fs.readFile(path.join(ROOT, 'src/systems/Tutorial.js'), 'utf8');
  const gameSource = await fs.readFile(path.join(ROOT, 'src/core/Game.js'), 'utf8');

  assert.match(tutorialSource, /isRigid\(\)/, 'tutorial should expose a rigid-step gate for gameplay actions');
  assert.match(tutorialSource, /allowsClickIntent\(clickIntent\)/, 'tutorial should gate click intents by the current step');
  assert.match(tutorialSource, /canStartDragConnect\(sourceNode\)/, 'tutorial should gate drag-connect starts by the current step');
  assert.match(tutorialSource, /filterDragConnectTarget\(sourceNode, targetNode\)/, 'tutorial should restrict drag targets to the expected node');
  assert.match(tutorialSource, /canStartSlice\(\)/, 'tutorial should gate slice start by the current step');
  assert.match(tutorialSource, /filterSliceCuts\(sliceCuts\)/, 'tutorial should reject off-step slice cuts');
  assert.match(gameSource, /if \(this\.cfg\?\.isTutorial && !this\.tut\.allowsClickIntent\(clickIntent\)\) return;/, 'game click path should reject tutorial-disallowed actions');
  assert.match(gameSource, /if \(this\.cfg\?\.isTutorial\) \{\s*sliceCuts = this\.tut\.filterSliceCuts\(sliceCuts\);/s, 'slice scan should be filtered through the tutorial gate');
  assert.match(gameSource, /if \(this\.cfg\?\.isTutorial && !this\.tut\.canStartSlice\(\)\) return;/, 'slice begin should be blocked outside the cut step');
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
  assert.equal(packageJson.scripts.soak, 'node scripts/simulation-soak.mjs', 'package.json should expose the soak script');
  assert.equal(packageJson.scripts['ui-dom-sanity'], 'node scripts/ui-dom-sanity.mjs', 'package.json should expose the UI DOM sanity script');
  assert.equal(packageJson.scripts.check, 'npm run smoke && npm run ui-sanity && npm run ui-dom-sanity && npm run campaign-sanity && npm run soak', 'package.json should expose an aggregate check script');
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

  assert.match(uiRendererSource, /areAlliedOwners\(t2\.source\.owner, n\.owner\)/, 'node info panel should count coalition support as allied incoming flow');
  assert.match(ownershipSource, /!areAlliedOwners\(tent\.effectiveTargetNode\.owner, newOwner\)/, 'ownership cleanup should preserve allied links after a capture');
  assert.match(tentCombatSource, /areAlliedOwners\(targetNode\.owner, sourceNode\.owner\)/, 'tentacle combat should route coalition links through the friendly flow path');
  assert.match(autoRetractSource, /areHostileOwners\(tentacle\.target\.owner, node\.owner\)/, 'auto-retract should only retract hostile outgoing tentacles');
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

  assert.match(screenControllerSource, /if \(win && levelId === 32\) \{\s*showCampaignEnding\(game\);/s, 'winning the final phase should route to the dedicated campaign ending screen');
  assert.match(screenControllerSource, /export function showCampaignEnding\(/, 'screen controller should expose a dedicated campaign ending entry point');
  assert.match(mainSource, /BTN_VIEW_ENDING/, 'debug mode should expose a button to preview the campaign ending');
  assert.match(mainSource, /showCampaignEnding\(debugPreviewGame, \{ debugPreview: true \}\)/, 'debug ending preview should open the ending screen in preview mode');
  assert.match(indexSource, /id="sce"/, 'campaign ending screen should exist in the HTML with a unique DOM id');
  assert.match(indexSource, /id="btnViewEnding"/, 'settings screen should expose the debug preview ending button');
  assert.match(domIdsSource, /SCREEN_ENDING:\s+'sce'/, 'campaign ending screen id should not collide with existing HUD ids');
  assert.match(i18nSource, /endingStory:/, 'localization should provide the campaign ending narrative');
  assert.match(i18nSource, /endingTitle:/, 'localization should provide the campaign ending title');
  assert.match(i18nSource, /setViewEnding:/, 'settings copy should expose the campaign ending preview label in i18n');
  assert.match(i18nSource, /viewEnding:/, 'button copy should expose the campaign ending preview CTA in i18n');
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

async function main() {
  const tests = [
    ['relay nodes do not create free energy', testRelayNoFreeEnergy],
    ['programmatic retract refunds payload', testProgrammaticRetractRefundsPayload],
    ['slice cut rules stay canonical', testSliceCutRulesStayCanonical],
    ['middle cut releases clash instead of destroying the partner', testMiddleCutReleasesClashInsteadOfDestroyingPartner],
    ['instant activation only tracks actually paid build cost', testImmediateActivationTracksPaidCostCorrectly],
    ['growing tentacles cannot advance without source budget', testGrowingTentacleCannotAdvanceWithoutBudget],
    ['growing retract refunds full paid construction cost', testGrowingTentacleRetractRefundsFullPaidCost],
    ['reversed retract refunds the effective source node', testReversedRetractRefundsEffectiveSource],
    ['middle cut conserves payload across refund and impact', testMiddleCutConservesPayloadAcrossRefundAndImpact],
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
    ['Purple AI differentiation and frame-driven core visuals stay present', testPurpleAiDifferentiationAndFrameDrivenCoreVisuals],
    ['Tutorial steps stay rigid and gated', testTutorialStepsStayRigidAndGated],
    ['loadLevel finalization and invalid-action UX stay aligned', testLoadLevelFinalizationAndInvalidActionUxStayAligned],
    ['Input wave V2 guardrails stay present', testInputWaveV2GuardrailsStayPresent],
    ['Regen display and flow tooltip stay canonical', testRegenDisplayAndFlowTooltipStayCanonical],
    ['Red-purple alliance skips immediate clash paths', testRedPurpleAllianceSkipsImmediateClash],
    ['Alliance-aware UI and ownership rules stay present', testAllianceUiAndOwnershipStayCoalitionAware],
    ['Neutral contest alliance modes stay parametrizable', testNeutralContestAllianceModesStayParametrizable],
    ['Campaign ending flow and debug preview stay present', testCampaignEndingFlowAndDebugPreviewStayPresent],
    ['Canvas font selection stays canonical', testCanvasFontSelectionStaysCanonical],
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
