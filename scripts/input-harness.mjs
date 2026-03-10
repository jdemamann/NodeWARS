import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

const { GameNode } = await load('src/entities/GameNode.js');
const { Tent } = await load('src/entities/Tent.js');
const { resolvePlayerClickIntent } = await load('src/input/PlayerClickResolution.js');
const { buildPlayerTentaclePreview } = await load('src/input/BuildPreview.js');
const {
  createTapCandidate,
  shouldPromoteTapToSlice,
  shouldTriggerTapAction,
  appendSlicePoint,
} = await load('src/input/InputState.js');
const { findNodeAtWorldPoint } = await load('src/input/NodeHitTesting.js');
const { GAMEPLAY_RULES, TentState } = await load('src/config/gameConfig.js');

function liveOut(node) {
  return node.outCount || 0;
}

function testClickIntentFlow() {
  const source = new GameNode(0, 0, 0, 60, 1);
  const neutral = new GameNode(1, 80, 0, 20, 0);

  const selectIntent = resolvePlayerClickIntent({
    selectedNode: null,
    hitNode: source,
    tents: [],
    liveOut,
    distanceCostMultiplier: 0,
  });
  assert.equal(selectIntent.type, 'select_player_node', 'clicking a player node should select it');

  const buildIntent = resolvePlayerClickIntent({
    selectedNode: source,
    hitNode: neutral,
    tents: [],
    liveOut,
    distanceCostMultiplier: 0,
  });
  assert.equal(buildIntent.type, 'build_tentacle', 'clicking a valid target should request tentacle construction');
}

function testBuildPreviewFlowAndToggle() {
  const source = new GameNode(0, 0, 0, 60, 1);
  const target = new GameNode(1, 120, 0, 20, 0);
  const preview = buildPlayerTentaclePreview({
    selectedNode: source,
    hoveredNode: target,
    tents: [],
    liveOut,
    distanceCostMultiplier: 0.02,
  });
  assert.equal(preview.type, 'build_new_tentacle', 'preview should report a new tentacle build when no lane exists');
  assert.ok(preview.roundedTotalBuildCost >= preview.roundedBuildCost, 'preview should include total cost including range surcharge');

  const tent = new Tent(source, target, 10);
  tent.state = TentState.ACTIVE;
  tent.flowRate = 0.8;
  const togglePreview = buildPlayerTentaclePreview({
    selectedNode: source,
    hoveredNode: target,
    tents: [tent],
    liveOut,
    distanceCostMultiplier: 0.02,
  });
  assert.equal(togglePreview.type, 'toggle_existing_tentacle', 'preview should detect existing lanes');
  assert.equal(togglePreview.displayFlowRate, 0.8, 'preview should expose the existing lane flow rate');
}

function testPointerPromotionAndTapDecision() {
  const tapCandidate = createTapCandidate(10, 10, 1000);
  assert.equal(
    shouldPromoteTapToSlice(tapCandidate, 40, 10, GAMEPLAY_RULES.input.DRAG_CONNECT_THRESHOLD_PX),
    true,
    'large movement should promote a tap candidate into a slice/drag gesture',
  );
  assert.equal(
    shouldTriggerTapAction(tapCandidate, 1120, 14, 14, 250, 12),
    true,
    'short low-distance touches should remain valid taps',
  );
}

function testSlicePathAndHitTesting() {
  const slicePath = [{ x: 0, y: 0 }];
  appendSlicePoint(slicePath, 10, 12);
  assert.equal(slicePath.length, 2, 'slice path should append in place');

  const closeNode = new GameNode(0, 20, 20, 20, 1);
  const fartherNode = new GameNode(1, 40, 20, 20, 1);
  const hitNode = findNodeAtWorldPoint([fartherNode, closeNode], 24, 20, 8, { excludeHazards: true });
  assert.equal(hitNode, closeNode, 'hit-testing should choose the closest node inside the hit radius');
}

const tests = [
  ['click intent flow stays canonical', testClickIntentFlow],
  ['build preview flow stays canonical', testBuildPreviewFlowAndToggle],
  ['pointer promotion and tap decision stay deterministic', testPointerPromotionAndTapDecision],
  ['slice path and hit-testing stay deterministic', testSlicePathAndHitTesting],
];

let passed = 0;
for (const [name, testFn] of tests) {
  testFn();
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log(`\n${passed}/${tests.length} input harness checks passed`);
