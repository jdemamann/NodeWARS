import assert from 'node:assert/strict';

const { LEVELS, NodeType } = await import('../src/config/gameConfig.js');
const { GameNode } = await import('../src/entities/GameNode.js');
const { Tent } = await import('../src/entities/Tent.js');
const { Physics } = await import('../src/systems/Physics.js');
const { WorldSystems } = await import('../src/systems/WorldSystems.js');
const { AI } = await import('../src/systems/AI.js');
const { computeBuildCost, computeDistance } = await import('../src/math/simulationMath.js');

function createSeededRandom(seed = 123456789) {
  let state = seed >>> 0;
  return function seededRandom() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function makeGame(levelConfig) {
  const playerBase = new GameNode(0, 120, 220, 52, 1);
  const enemyBase = new GameNode(1, 680, 220, 50, 2);
  const centralNeutral = new GameNode(2, 400, 220, 18, 0);
  const relayNode = new GameNode(3, 400, 100, 14, 0, NodeType.RELAY);
  const signalNode = new GameNode(4, 400, 340, 20, 0, NodeType.SIGNAL);
  const flankNeutral = new GameNode(5, 250, 360, 16, 0);
  const enemyFlank = new GameNode(6, 550, 100, 22, 2);

  const nodes = [playerBase, enemyBase, centralNeutral, relayNode, signalNode, flankNeutral, enemyFlank];
  for (const node of nodes) {
    node.maxE = levelConfig.nodeEnergyCap;
    if (node.type === NodeType.SIGNAL) {
      node.captureThreshold = 24;
    }
  }

  return {
    W: 800,
    H: 480,
    time: 0,
    _frame: 0,
    scoreTime: 0,
    fogDirty: true,
    fogRevealTimer: 0,
    camX: 0,
    camY: 0,
    nodes,
    tents: [],
    hazards: [
      {
        x: 400,
        y: 220,
        ax: 400,
        ay: 220,
        r: 90,
        drainRate: 5.5,
        phase: 0,
        moving: true,
        moveR: 28,
        movePhase: 0.4,
        movePhaseY: 1.2,
        pulsing: true,
        pulseTimer: 0,
        pulsePeriod: 5,
        pulseActive: true,
        _warn: 0,
        _drainCd: 0,
      },
    ],
    pulsars: [
      {
        x: 560,
        y: 300,
        r: 180,
        strength: 8,
        timer: 2.6,
        interval: 4.5,
        phase: 0,
        chargeTimer: 0,
        charging: false,
        pulse: 0,
        isSuper: false,
      },
    ],
  };
}

function issueTentacleIfPossible(game, sourceNode, targetNode, distanceCostMultiplier) {
  if (!sourceNode || !targetNode || sourceNode === targetNode) return false;
  if (game.tents.some(tentacle => tentacle.alive && !tentacle.reversed && tentacle.source === sourceNode && tentacle.target === targetNode)) {
    return false;
  }
  if ((sourceNode.outCount || 0) >= sourceNode.maxSlots) return false;

  const distance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
  const buildCost = computeBuildCost(distance) + distance * distanceCostMultiplier;
  if (sourceNode.energy < buildCost + 2) return false;

  const tentacle = new Tent(sourceNode, targetNode, buildCost);
  tentacle.game = game;
  sourceNode.outCount = (sourceNode.outCount || 0) + 1;
  game.tents.push(tentacle);
  return true;
}

function issuePlayerOrders(game, levelConfig, elapsedSeconds) {
  const playerNodes = game.nodes.filter(node => node.owner === 1 && !node.isRelay);
  const candidateTargets = game.nodes.filter(node => node.owner !== 1);
  if (!playerNodes.length || !candidateTargets.length) return;

  playerNodes.sort((left, right) => right.energy - left.energy);
  const sourceNode = playerNodes[0];

  const preferredTargets = candidateTargets
    .map(targetNode => ({
      targetNode,
      score:
        (targetNode.isRelay ? 40 : 0) +
        (targetNode.type === NodeType.SIGNAL ? 28 : 0) +
        (targetNode.owner === 0 ? 16 : 0) -
        computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y) * 0.06 -
        targetNode.energy * 0.2,
    }))
    .sort((left, right) => right.score - left.score);

  if (!preferredTargets.length) return;

  issueTentacleIfPossible(game, sourceNode, preferredTargets[0].targetNode, levelConfig.distanceCostMultiplier);

  if (elapsedSeconds > 20 && preferredTargets[1]) {
    issueTentacleIfPossible(game, sourceNode, preferredTargets[1].targetNode, levelConfig.distanceCostMultiplier);
  }
}

function validateStableState(game) {
  for (const node of game.nodes) {
    assert.ok(Number.isFinite(node.energy), `node ${node.id} energy must stay finite`);
    assert.ok(node.energy > -250, `node ${node.id} energy should not run away deeply negative`);
    assert.ok(node.energy <= node.maxE + 30, `node ${node.id} energy should stay near its cap`);
    assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y), `node ${node.id} position must stay finite`);
    if (node.contest) {
      for (const score of Object.values(node.contest)) {
        assert.ok(Number.isFinite(score), `node ${node.id} contest score must stay finite`);
        assert.ok(score >= 0, `node ${node.id} contest score must stay non-negative`);
      }
    }
  }

  for (const tentacle of game.tents) {
    assert.ok(Number.isFinite(tentacle.reachT), 'tentacle reach must stay finite');
    assert.ok(Number.isFinite(tentacle.energyInPipe), 'tentacle pipe energy must stay finite');
    assert.ok(tentacle.energyInPipe >= 0, 'tentacle pipe energy must stay non-negative');
    assert.ok(Number.isFinite(tentacle.flowRate), 'tentacle flow rate must stay finite');
  }

  assert.ok(game.tents.length < 80, 'tentacle count should stay bounded in the soak scenario');
}

function runCoreWorldSoak() {
  const levelConfig = LEVELS[30];
  const game = makeGame(levelConfig);
  const ai = new AI(game, levelConfig, 2);
  const initialOwnership = game.nodes.map(node => node.owner).join(',');
  let elapsedSeconds = 0;

  const originalRandom = Math.random;
  Math.random = createSeededRandom(20260309);

  try {
    const dt = 0.1;
    for (let step = 0; step < 2400; step += 1) {
      elapsedSeconds += dt;
      game.time += dt;
      game.scoreTime += dt;
      game._frame += 1;

      Physics.updateOutCounts(game);
      for (const node of game.nodes) node.update(dt, false);
      WorldSystems.update(game, dt);
      for (const tentacle of game.tents) tentacle.update(dt);
      ai.update(dt);

      if (step % 20 === 0) {
        issuePlayerOrders(game, levelConfig, elapsedSeconds);
      }

      game.tents = game.tents.filter(tentacle => tentacle.alive);

      if (step % 100 === 0) {
        validateStableState(game);
      }
    }
  } finally {
    Math.random = originalRandom;
  }

  validateStableState(game);
  assert.notEqual(
    game.nodes.map(node => node.owner).join(','),
    initialOwnership,
    'the soak scenario should produce at least one ownership change',
  );
}

function runCheck(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

try {
  runCheck('core + world simulation stays numerically stable over time', runCoreWorldSoak);
  console.log('\n1/1 simulation soak checks passed');
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
