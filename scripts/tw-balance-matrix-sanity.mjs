import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MATRIX_PATH = path.join(ROOT, 'docs/tentaclewars/tw-balance-matrix.csv');

const REQUIRED_HEADERS = [
  'id',
  'world',
  'phase',
  'energyCap',
  'par',
  'introMechanicTags',
  'obstacles',
  'hostileCount',
  'notes',
];

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

const raw = await fs.readFile(MATRIX_PATH, 'utf8');
const lines = raw.trim().split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const sampleRow = parseCsvLine(lines[1] || '');

assert.deepEqual(header, REQUIRED_HEADERS, 'TW balance matrix should keep the canonical phase-one column headers');
assert.equal(sampleRow[0], 'W1-01', 'TW balance matrix should include the scaffold sample row for W1-01');
assert.equal(sampleRow.length, REQUIRED_HEADERS.length, 'TW balance matrix sample rows should stay aligned with the header count');

console.log('PASS TentacleWars balance matrix keeps the canonical header contract');
console.log('PASS TentacleWars balance matrix includes the sample scaffold row');
console.log('\n2/2 TentacleWars balance matrix sanity checks passed');
