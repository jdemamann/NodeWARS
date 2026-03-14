/* ================================================================
   TentacleWars level schema

   Defines the canonical JS-object contract for authored TentacleWars
   campaign levels. The validator is intentionally strict enough to
   catch authoring mistakes early while leaving obstacle runtime
   complexity to the dedicated obstacle-spec task.
   ================================================================ */

export const TW_LEVEL_WIN_CONDITIONS = ['all_hostiles_converted'];

export const TW_LEVEL_CELL_OWNERS = ['player', 'neutral', 'red', 'purple'];

export const TW_LEVEL_OBSTACLE_SHAPES = ['circle', 'capsule'];

export const TW_LEVEL_SAMPLE_VALID = Object.freeze({
  id: 'W1-01',
  world: 1,
  phase: 1,
  energyCap: 15,
  cells: [
    { id: 'p1', owner: 'player', initialEnergy: 5, x: 0.18, y: 0.5 },
    { id: 'n1', owner: 'neutral', initialEnergy: 8, x: 0.42, y: 0.5 },
    { id: 'r1', owner: 'red', initialEnergy: 10, x: 0.78, y: 0.5 },
  ],
  obstacles: [],
  winCondition: 'all_hostiles_converted',
  par: 45,
  introMechanicTags: ['connect', 'neutral-capture'],
});

export const TW_LEVEL_SAMPLE_INVALID = Object.freeze({
  id: 'W1-99',
  world: 1,
  phase: 99,
  energyCap: 15,
  cells: [
    { id: 'p1', owner: 'player', initialEnergy: 5, x: 0.18, y: 0.5 },
  ],
  obstacles: [],
  winCondition: 'capture_everything',
  par: 45,
  introMechanicTags: ['connect'],
});

/* Formats field-local validation failures with a stable path prefix. */
function fail(path, message) {
  throw new Error(`${path}: ${message}`);
}

/* Rejects arrays and primitives so downstream field checks can stay simple. */
function assertPlainObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'expected a plain object');
  }
}

/* Enforces bounded integer fields such as world, phase, and energy cap. */
function assertIntegerInRange(value, path, minimum, maximum) {
  if (!Number.isInteger(value)) {
    fail(path, 'expected an integer');
  }
  if (value < minimum || value > maximum) {
    fail(path, `expected an integer between ${minimum} and ${maximum}`);
  }
}

/* Enforces bounded numeric authoring fields such as normalized coordinates. */
function assertFiniteNumberInRange(value, path, minimum, maximum) {
  if (!Number.isFinite(value)) {
    fail(path, 'expected a finite number');
  }
  if (value < minimum || value > maximum) {
    fail(path, `expected a number between ${minimum} and ${maximum}`);
  }
}

/* Keeps all identifier and tag-like fields non-empty and human-readable. */
function assertNonEmptyString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'expected a non-empty string');
  }
}

/* Validates the normalized TentacleWars obstacle-shape family. */
function validateObstacleShape(shape, path) {
  assertPlainObject(shape, path);
  assertNonEmptyString(shape.kind, `${path}.kind`);
  if (!TW_LEVEL_OBSTACLE_SHAPES.includes(shape.kind)) {
    fail(`${path}.kind`, `expected one of: ${TW_LEVEL_OBSTACLE_SHAPES.join(', ')}`);
  }

  if (shape.kind === 'circle') {
    assertFiniteNumberInRange(shape.cx, `${path}.cx`, 0, 1);
    assertFiniteNumberInRange(shape.cy, `${path}.cy`, 0, 1);
    assertFiniteNumberInRange(shape.radius, `${path}.radius`, 0.001, 1);
    return;
  }

  assertFiniteNumberInRange(shape.ax, `${path}.ax`, 0, 1);
  assertFiniteNumberInRange(shape.ay, `${path}.ay`, 0, 1);
  assertFiniteNumberInRange(shape.bx, `${path}.bx`, 0, 1);
  assertFiniteNumberInRange(shape.by, `${path}.by`, 0, 1);
  assertFiniteNumberInRange(shape.radius, `${path}.radius`, 0.001, 1);
}

/* Validates one authored cell against owner, energy, and normalized position rules. */
function validateCell(cell, path, energyCap, cellIds) {
  assertPlainObject(cell, path);
  assertNonEmptyString(cell.id, `${path}.id`);
  if (cellIds.has(cell.id)) {
    fail(`${path}.id`, `duplicate cell id "${cell.id}"`);
  }
  cellIds.add(cell.id);

  assertNonEmptyString(cell.owner, `${path}.owner`);
  if (!TW_LEVEL_CELL_OWNERS.includes(cell.owner)) {
    fail(`${path}.owner`, `expected one of: ${TW_LEVEL_CELL_OWNERS.join(', ')}`);
  }

  assertFiniteNumberInRange(cell.initialEnergy, `${path}.initialEnergy`, 0, energyCap);
  assertFiniteNumberInRange(cell.x, `${path}.x`, 0, 1);
  assertFiniteNumberInRange(cell.y, `${path}.y`, 0, 1);
}

/* Validates one authored obstacle shell against the normalized shape contract. */
function validateObstacle(obstacle, path, obstacleIds) {
  assertPlainObject(obstacle, path);
  assertNonEmptyString(obstacle.id, `${path}.id`);
  if (obstacleIds.has(obstacle.id)) {
    fail(`${path}.id`, `duplicate obstacle id "${obstacle.id}"`);
  }
  obstacleIds.add(obstacle.id);

  validateObstacleShape(obstacle.shape, `${path}.shape`);
}

/*
 * The level id is the cross-surface stable identifier. World and phase remain
 * separate fields so ordering and routing can be asserted independently.
 */
export function validateTentacleWarsLevelData(levelData) {
  assertPlainObject(levelData, 'level');

  assertNonEmptyString(levelData.id, 'level.id');
  if (!/^W[1-4]-\d{2}$/.test(levelData.id)) {
    fail('level.id', 'expected format W<world>-<phase>, for example W1-01');
  }

  assertIntegerInRange(levelData.world, 'level.world', 1, 4);
  assertIntegerInRange(levelData.phase, 'level.phase', 1, 20);
  const expectedId = `W${levelData.world}-${String(levelData.phase).padStart(2, '0')}`;
  if (levelData.id !== expectedId) {
    fail('level.id', `expected "${expectedId}" to match world/phase fields`);
  }

  assertIntegerInRange(levelData.energyCap, 'level.energyCap', 1, 200);
  assertIntegerInRange(levelData.par, 'level.par', 1, 3600);

  if (!Array.isArray(levelData.cells) || levelData.cells.length === 0) {
    fail('level.cells', 'expected a non-empty array');
  }
  const cellIds = new Set();
  levelData.cells.forEach((cell, index) => {
    validateCell(cell, `level.cells[${index}]`, levelData.energyCap, cellIds);
  });

  if (!Array.isArray(levelData.obstacles)) {
    fail('level.obstacles', 'expected an array');
  }
  const obstacleIds = new Set();
  levelData.obstacles.forEach((obstacle, index) => {
    validateObstacle(obstacle, `level.obstacles[${index}]`, obstacleIds);
  });

  assertNonEmptyString(levelData.winCondition, 'level.winCondition');
  if (!TW_LEVEL_WIN_CONDITIONS.includes(levelData.winCondition)) {
    fail('level.winCondition', `expected one of: ${TW_LEVEL_WIN_CONDITIONS.join(', ')}`);
  }

  if (!Array.isArray(levelData.introMechanicTags)) {
    fail('level.introMechanicTags', 'expected an array');
  }
  const seenTags = new Set();
  levelData.introMechanicTags.forEach((tag, index) => {
    assertNonEmptyString(tag, `level.introMechanicTags[${index}]`);
    if (seenTags.has(tag)) {
      fail(`level.introMechanicTags[${index}]`, `duplicate mechanic tag "${tag}"`);
    }
    seenTags.add(tag);
  });

  return levelData;
}
