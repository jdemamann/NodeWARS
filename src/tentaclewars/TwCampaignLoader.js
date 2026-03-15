/* ================================================================
   TentacleWars campaign loader

   Translates authored TentacleWars level objects into the runtime
   configuration shell that Game already knows how to load.
   ================================================================ */

import { NodeType } from '../config/gameConfig.js';
import { TW_BALANCE } from './TwBalance.js';
import { scaleTentacleWarsObstacle } from './TwObstacleRuntime.js';
import { validateTentacleWarsLevelData } from './TwLevelSchema.js';

const OWNER_TO_RUNTIME = Object.freeze({
  player: 1,
  neutral: 0,
  red: 2,
  purple: 3,
});

const TW_AUTHORED_LAYOUT = Object.freeze({
  width: 220,
  height: 160,
});

/* Keeps authored TW campaign layouts readable without changing authored cost feel. */
function computeTentacleWarsCampaignViewport(width, height) {
  const viewportWidth = Math.max(TW_AUTHORED_LAYOUT.width, Math.floor(width * 0.65));
  const viewportHeight = Math.max(TW_AUTHORED_LAYOUT.height, Math.floor(height * 0.65));
  return {
    x: (width - viewportWidth) * 0.5,
    y: (height - viewportHeight) * 0.5,
    width: viewportWidth,
    height: viewportHeight,
  };
}

/* Normalizes authored campaign build costs back to the canonical 220px design space. */
function computeTentacleWarsCampaignCostNormalizer(viewport) {
  return TW_AUTHORED_LAYOUT.width / Math.max(1, viewport.width);
}

/* Maps authored owner strings into the runtime owner ids used by GameNode. */
function mapTentacleWarsOwner(owner) {
  const mappedOwner = OWNER_TO_RUNTIME[owner];
  if (mappedOwner == null) {
    throw new Error(`Unsupported TentacleWars cell owner "${owner}"`);
  }
  return mappedOwner;
}

/* Scales one authored level into a fixed-layout shell at the current viewport. */
export function buildTentacleWarsCampaignLayout(levelData, width, height) {
  const validatedLevel = validateTentacleWarsLevelData(levelData);
  const viewport = computeTentacleWarsCampaignViewport(width, height);
  const twCostNormalizer = computeTentacleWarsCampaignCostNormalizer(viewport);

  return {
    nodes: validatedLevel.cells.map(cell => ({
      x: viewport.x + viewport.width * cell.x,
      y: viewport.y + viewport.height * cell.y,
      energy: cell.initialEnergy,
      owner: mapTentacleWarsOwner(cell.owner),
      type: NodeType.NORMAL,
      twCostNormalizer,
    })),
    hazards: [],
    pulsars: [],
    twObstacles: validatedLevel.obstacles.map(obstacle => scaleTentacleWarsObstacle(obstacle, viewport)),
    twViewport: viewport,
    twCostNormalizer,
  };
}

/* Builds the level-config shell that the existing Game loader can consume. */
export function buildTentacleWarsCampaignConfig(levelData, width, height) {
  const runtimeLayout = buildTentacleWarsCampaignLayout(levelData, width, height);
  const validatedLevel = validateTentacleWarsLevelData(levelData);

  const redEnemyCount = validatedLevel.cells.filter(cell => cell.owner === 'red').length;
  const purpleEnemyCount = validatedLevel.cells.filter(cell => cell.owner === 'purple').length;
  const playerCells = validatedLevel.cells.filter(cell => cell.owner === 'player');
  const redCells = validatedLevel.cells.filter(cell => cell.owner === 'red');
  const purpleCells = validatedLevel.cells.filter(cell => cell.owner === 'purple');

  return {
    id: validatedLevel.id,
    name: validatedLevel.id,
    isTentacleWarsCampaign: true,
    isTentacleWarsSandbox: false,
    twLevelId: validatedLevel.id,
    twWorld: validatedLevel.world,
    twPhase: validatedLevel.phase,
    introMechanicTags: [...validatedLevel.introMechanicTags],
    winCondition: validatedLevel.winCondition,
    fixedLayout: runtimeLayout,
    suppressWorldBanner: false,
    worldId: validatedLevel.world,
    isTutorial: false,
    isBoss: false,
    nodes: validatedLevel.cells.length,
    playerStartEnergy: Math.max(0, ...playerCells.map(cell => cell.initialEnergy)),
    enemyCount: redEnemyCount,
    enemyStartEnergy: Math.max(0, ...redCells.map(cell => cell.initialEnergy), 0),
    purpleEnemyCount,
    purpleEnemyStartEnergy: Math.max(0, ...purpleCells.map(cell => cell.initialEnergy), 0),
    neutralEnergyRange: [0, validatedLevel.energyCap],
    nodeEnergyCap: validatedLevel.energyCap,
    distanceCostMultiplier: 0,
    twCostNormalizer: runtimeLayout.twCostNormalizer,
    aiThinkIntervalSeconds: TW_BALANCE.AI_THINK_INTERVAL_SEC,
    soundtrackTrackId: TW_BALANCE.DEFAULT_SOUNDTRACK_TRACK_ID,
    par: validatedLevel.par,
  };
}
