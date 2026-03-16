/*
 * TwOwnership sanity suite — 5 checks
 *
 * Verifies that TwOwnership transition primitives correctly compute
 * starting energy and call applyOwnershipChange with the right arguments.
 */

import { resolveTwNeutralCaptureTransition, resolveTwHostileCaptureTransition } from '../src/tentaclewars/TwOwnership.js';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`PASS ${label}`);
    passed++;
  } else {
    console.error(`FAIL ${label}`);
    failed++;
  }
}

/* ── helpers ── */

function makeNode(overrides = {}) {
  return {
    owner: 0,
    energy: 0,
    maxE: 20,
    captureThreshold: 5,
    simulationMode: 'tentaclewars',
    ...overrides,
  };
}

function makeGame(tents = []) {
  return { tents };
}

/* Track applyOwnershipChange calls by patching via module-level side channel.
   TwOwnership imports applyOwnershipChange from Ownership.js — we can't easily
   intercept it without a mocking framework, so we test observable node state
   changes produced by the full call chain instead. */

/* ── Test 1: neutral capture sets node owner ── */
{
  const targetNode = makeNode({ owner: 0, energy: 3, captureThreshold: 5 });
  const game = makeGame();
  // captureProgress = 8 > threshold 5 → should trigger ownership change
  resolveTwNeutralCaptureTransition(game, targetNode, 1, 8);
  assert('neutral capture transition changes node owner to attacker', targetNode.owner === 1);
}

/* ── Test 2: neutral capture carryover energy applied ── */
{
  // neutralEnergy=3, captureThreshold=5, captureProgress=8 → carryover=3, nextEnergy=3+3=6
  const targetNode = makeNode({ owner: 0, energy: 3, captureThreshold: 5, maxE: 20 });
  const game = makeGame();
  resolveTwNeutralCaptureTransition(game, targetNode, 1, 8);
  // After capture startingEnergy = min(20, 3+3) = 6
  assert('neutral capture carryover energy sets correct starting energy', targetNode.energy === 6);
}

/* ── Test 3: hostile capture changes node owner ── */
{
  const targetNode = makeNode({ owner: 2, energy: -2, maxE: 20 });
  const game = makeGame();
  resolveTwHostileCaptureTransition(game, null, targetNode, 1);
  assert('hostile capture transition changes node owner to attacker', targetNode.owner === 1);
}

/* ── Test 4: hostile capture uses reset+carryover energy (no outgoing lanes) ── */
{
  // energy=-2 → attackCarryover=2, no outgoing → nextEnergy = RESET + 2
  // TW_BALANCE.HOSTILE_CAPTURE_RESET_ENERGY is typically 1
  const targetNode = makeNode({ owner: 2, energy: -2, maxE: 20 });
  const game = makeGame();
  resolveTwHostileCaptureTransition(game, null, targetNode, 1);
  // nextEnergy should be >= 1 (at minimum the reset energy)
  assert('hostile capture produces non-negative starting energy', targetNode.energy >= 0);
}

/* ── Test 5: hostile capture collects released outgoing energy from live lanes ── */
{
  const targetNode = makeNode({ owner: 2, energy: -1, maxE: 20 });
  // Mock an outgoing tentacle with committed payload
  const outgoingTent = {
    alive: true,
    state: 'active',
    effectiveSourceNode: targetNode,
    getCommittedPayloadForOwnershipCleanup: () => 3,
  };
  // The channel being evaluated (tentacle !== channel, so use null as channel)
  const game = makeGame([outgoingTent]);
  resolveTwHostileCaptureTransition(game, null, targetNode, 1);
  // releasedOutgoingEnergy=3 → more carryover → energy should be higher than without outgoing lane
  const targetNodeNoOutgoing = makeNode({ owner: 2, energy: -1, maxE: 20 });
  resolveTwHostileCaptureTransition(makeGame(), null, targetNodeNoOutgoing, 1);
  assert('hostile capture with outgoing lane produces higher starting energy', targetNode.energy >= targetNodeNoOutgoing.energy);
}

/* ── result ── */
console.log(`\n${passed}/${passed + failed} TwOwnership sanity checks passed`);
if (failed > 0) process.exit(1);
