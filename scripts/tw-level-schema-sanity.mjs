import assert from 'node:assert/strict';

import {
  TW_LEVEL_SAMPLE_INVALID,
  TW_LEVEL_SAMPLE_VALID,
  validateTentacleWarsLevelData,
} from '../src/tentaclewars/TwLevelSchema.js';

function run(testName, testFn) {
  testFn();
  console.log(`PASS ${testName}`);
}

run('TentacleWars sample level passes schema validation', () => {
  const validated = validateTentacleWarsLevelData(structuredClone(TW_LEVEL_SAMPLE_VALID));
  assert.equal(validated.id, 'W1-01', 'validator should preserve valid level objects');
});

run('TentacleWars invalid sample is rejected with a descriptive error', () => {
  assert.throws(
    () => validateTentacleWarsLevelData(structuredClone(TW_LEVEL_SAMPLE_INVALID)),
    /level\.phase|level\.id|level\.winCondition/,
    'invalid level objects should fail with a field-specific message',
  );
});

console.log('\n2/2 TentacleWars level schema sanity checks passed');
