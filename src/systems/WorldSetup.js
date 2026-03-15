/* ================================================================
   World setup helpers

   Populates authored and generated world features such as hazards,
   relays, pulsars, and neutral bunkers during level load.
   ================================================================ */

import { GAMEPLAY_RULES, NodeType } from '../config/gameConfig.js';
import { GameNode } from '../entities/GameNode.js';

const { world: WORLD_RULES } = GAMEPLAY_RULES;

export function populateWorldFeatures(game, cfg, width, height) {
  // Generated phases rebuild these feature arrays from config each load.
  game.hazards = [];
  game.pulsars = [];
  game.twObstacles = [];
  spawnHazards(game, cfg, width, height);
  spawnRelays(game, cfg, width, height);
  spawnPulsars(game, cfg, width, height);
  spawnSignalNodes(game, cfg, width, height);
}

export function applyFixedWorldFeatures(game, layout) {
  // Fixed layouts already provide fully-authored hazard and pulsar specs.
  game.hazards = (layout.hazards || []).map(hazardSpec => ({ ...hazardSpec }));
  game.pulsars = (layout.pulsars || []).map(pulsarSpec => ({ ...pulsarSpec }));
  game.twObstacles = (layout.twObstacles || []).map(obstacleSpec => ({ ...obstacleSpec }));
}

export function populateFixedNodes(game, layout) {
  game.nodes = layout.nodes.map((nodeSpec, index) => {
    const gameNode = new GameNode(index, nodeSpec.x, nodeSpec.y, nodeSpec.energy, nodeSpec.owner, nodeSpec.type);
    if (Number.isFinite(nodeSpec.twCostNormalizer)) {
      gameNode.twCostNormalizer = nodeSpec.twCostNormalizer;
    }
    if (nodeSpec.isBunker) {
      gameNode.isBunker = true;
      gameNode.captureThreshold = WORLD_RULES.BUNKER_CAPTURE_THRESHOLD;
    }
    if (nodeSpec.captureThreshold) {
      gameNode.captureThreshold = nodeSpec.captureThreshold;
    }
    return gameNode;
  });
}

export function applyNeutralBunkers(game, cfg) {
  if (!cfg.bunkerCount) return;
  const neutralNodes = game.nodes.filter(node => node.owner === 0 && !node.isRelay && node.type === NodeType.NORMAL);
  const shuffledNodes = [...neutralNodes].sort(() => Math.random() - 0.5);
  const bunkerCount = Math.min(cfg.bunkerCount, shuffledNodes.length);
  for (let i = 0; i < bunkerCount; i++) {
    shuffledNodes[i].energy = 140;
    shuffledNodes[i].isBunker = true;
    shuffledNodes[i].captureThreshold = WORLD_RULES.BUNKER_CAPTURE_THRESHOLD;
  }
}

function spawnHazards(game, cfg, width, height) {
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const movingHazardCount = cfg.movingVortexCount || 0;
  const totalHazards = cfg.vortexCount || 0;

  for (let hazardIndex = 0; hazardIndex < totalHazards; hazardIndex++) {
    const isSuperHazard = !!cfg.hasSuperVortex && hazardIndex === totalHazards - 1;
    const isMovingHazard = hazardIndex < movingHazardCount;
    const isPulsingHazard = !!cfg.pulsingVortexPeriodSeconds;
    const hazardRadius = isSuperHazard ? 105 : 55 + randomBetween(0, 25);

    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const hazardX = randomBetween(110, width - 110);
      const hazardY = randomBetween(110, height - 110);
      let placementOk = true;
      for (const node of game.nodes) {
        if (Math.hypot(node.x - hazardX, node.y - hazardY) < hazardRadius + node.radius + 55) {
          placementOk = false;
          break;
        }
      }
      for (const existingHazard of game.hazards) {
        if (Math.hypot(existingHazard.x - hazardX, existingHazard.y - hazardY) < hazardRadius + existingHazard.r + 40) {
          placementOk = false;
          break;
        }
      }
      if (!placementOk) continue;

      game.hazards.push({
        x: hazardX,
        y: hazardY,
        ax: hazardX,
        ay: hazardY,
        r: hazardRadius,
        phase: randomBetween(0, Math.PI * 2),
        drainRate: isSuperHazard ? 18 : 6,
        warningR: hazardRadius * 1.5,
        _drainCd: 0,
        _warn: 0,
        isSuper: isSuperHazard,
        moving: isMovingHazard,
        movePhase: randomBetween(0, Math.PI * 2),
        movePhaseY: randomBetween(0, Math.PI * 2),
        moveR: isMovingHazard ? 45 + randomBetween(0, 30) : 0,
        pulsing: isPulsingHazard,
        pulseActive: true,
        pulseTimer: randomBetween(0, (cfg.pulsingVortexPeriodSeconds || 5) / 2),
        pulsePeriod: cfg.pulsingVortexPeriodSeconds || 5,
      });
      placed = true;
    }
  }
}

function spawnRelays(game, cfg, width, height) {
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const fortressCount = cfg.fortifiedRelayCount || 0;

  for (let relayIndex = 0; relayIndex < (cfg.relayCount || 0); relayIndex++) {
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const relayX = randomBetween(90, width - 90);
      const relayY = randomBetween(90, height - 90);
      let placementOk = true;
      for (const node of game.nodes) {
        if (Math.hypot(node.x - relayX, node.y - relayY) < 90) {
          placementOk = false;
          break;
        }
      }
      if (!placementOk) continue;

      const relayNode = new GameNode(game.nodes.length, relayX, relayY, 0, 0, NodeType.RELAY);
      const relayCountAlreadyPlaced = game.nodes.filter(node => node.isRelay).length;
      if (relayCountAlreadyPlaced < fortressCount) {
        relayNode.isBunker = true;
        relayNode.captureThreshold = WORLD_RULES.BUNKER_CAPTURE_THRESHOLD;
      }
      game.nodes.push(relayNode);
      placed = true;
    }
  }
}

function spawnPulsars(game, cfg, width, height) {
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  let placedPulsarCount = 0;
  for (let pulsarIndex = 0; pulsarIndex < (cfg.pulsarCount || 0); pulsarIndex++) {
    const isSuperPulsar = !!cfg.hasSuperPulsar && placedPulsarCount === 0;
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const pulsarX = randomBetween(100, width - 100);
      const pulsarY = randomBetween(100, height - 100);
      let placementOk = true;
      for (const node of game.nodes) {
        if (Math.hypot(node.x - pulsarX, node.y - pulsarY) < 80) {
          placementOk = false;
          break;
        }
      }
      for (const existingPulsar of game.pulsars) {
        if (Math.hypot(existingPulsar.x - pulsarX, existingPulsar.y - pulsarY) < 120) {
          placementOk = false;
          break;
        }
      }
      if (!placementOk) continue;

      game.pulsars.push({
        x: pulsarX,
        y: pulsarY,
        r: isSuperPulsar ? Math.min(width, height) * 0.78 : 130 + randomBetween(-20, 30),
        timer: randomBetween(3, 6),
        interval: isSuperPulsar ? 9 : 4.5,
        strength: isSuperPulsar ? 45 : 22,
        pulse: 0,
        phase: 0,
        chargeTimer: 0,
        isSuper: isSuperPulsar,
      });
      placedPulsarCount++;
      placed = true;
    }
  }
}

function spawnSignalNodes(game, cfg, width, height) {
  if (!cfg.signalTowerCount) return;

  const randomBetween = (min, max) => min + Math.random() * (max - min);
  for (let signalIndex = 0; signalIndex < cfg.signalTowerCount; signalIndex++) {
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const signalX = randomBetween(width * 0.25, width * 0.75);
      const signalY = randomBetween(height * 0.2, height * 0.8);
      let placementOk = true;
      for (const node of game.nodes) {
        if (Math.hypot(node.x - signalX, node.y - signalY) < 100) {
          placementOk = false;
          break;
        }
      }
      if (!placementOk) continue;

      const signalNode = new GameNode(game.nodes.length, signalX, signalY, 0, 0, NodeType.SIGNAL);
      signalNode.captureThreshold = 30;
      game.nodes.push(signalNode);
      placed = true;
    }
  }
}
