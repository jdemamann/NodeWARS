import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const COMMENT_START = /^\s*\/\*/;
const COMMENT_END = /\*\/\s*$/;
const FUNCTION_SIGNATURE_PATTERNS = [
  /^\s*export\s+(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/,
  /^\s*(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/,
  /^\s*export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\([^=]*\)\s*=>/,
  /^\s*const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\([^=]*\)\s*=>/,
  /^\s*export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>/,
  /^\s*const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>/,
  /^\s*(?:static\s+)?(?:async\s+)?(?:#?[A-Za-z_$][\w$]*)\s*\([^;]*\)\s*\{/,
];
const METHOD_KEYWORDS_TO_SKIP = new Set(['if', 'for', 'while', 'switch', 'catch']);

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function getChangedSourceFiles() {
  const tracked = runGit(['diff', '--name-only', 'HEAD', '--', 'src'])
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(file => file.endsWith('.js'));

  const untracked = runGit(['ls-files', '--others', '--exclude-standard', 'src'])
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(file => file.endsWith('.js'));

  return [...new Set([...tracked, ...untracked])].sort();
}

function getAddedLines(relativePath, isUntracked) {
  if (isUntracked) return null;

  const diff = runGit(['diff', '--unified=0', '--no-color', 'HEAD', '--', relativePath]);
  if (!diff) return new Set();

  const addedLines = new Set();
  const diffLines = diff.split('\n');
  let currentNewLine = 0;

  for (const line of diffLines) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentNewLine = Number(hunkMatch[1]);
      continue;
    }
    if (!currentNewLine || line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) {
      addedLines.add(currentNewLine);
      currentNewLine += 1;
      continue;
    }
    if (line.startsWith('-')) continue;
    currentNewLine += 1;
  }

  return addedLines;
}

function hasNearbyBlockComment(lines, lineIndex) {
  let cursor = lineIndex - 1;

  while (cursor >= 0 && !lines[cursor].trim()) cursor -= 1;
  if (cursor < 0 || !COMMENT_END.test(lines[cursor])) return false;

  while (cursor >= 0) {
    if (COMMENT_START.test(lines[cursor])) return true;
    cursor -= 1;
  }

  return false;
}

function findFunctionLikeLines(lines) {
  const matches = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!FUNCTION_SIGNATURE_PATTERNS.some(pattern => pattern.test(line))) continue;

    const methodNameMatch = line.match(/^\s*(?:static\s+)?(?:async\s+)?(#?[A-Za-z_$][\w$]*)\s*\(/);
    if (methodNameMatch && METHOD_KEYWORDS_TO_SKIP.has(methodNameMatch[1])) continue;

    matches.push({ lineNumber: index + 1, signature: line.trim() });
  }

  return matches;
}

async function validateChangedFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const source = await fs.readFile(absolutePath, 'utf8');
  const lines = source.split('\n');
  const firstNonEmptyLine = lines.find(line => line.trim()) || '';

  assert.match(
    firstNonEmptyLine,
    COMMENT_START,
    `${relativePath} should keep a module header comment at the top of the file`,
  );

  const isUntracked = !!runGit(['ls-files', '--others', '--exclude-standard', '--', relativePath]);
  const addedLines = getAddedLines(relativePath, isUntracked);
  const functionLines = findFunctionLikeLines(lines);
  const relevantFunctions = addedLines === null
    ? functionLines
    : functionLines.filter(entry => addedLines.has(entry.lineNumber));

  for (const entry of relevantFunctions) {
    assert.equal(
      hasNearbyBlockComment(lines, entry.lineNumber - 1),
      true,
      `${relativePath}:${entry.lineNumber} should have a nearby block header comment for "${entry.signature}"`,
    );
  }
}

async function main() {
  const changedFiles = getChangedSourceFiles();

  if (!changedFiles.length) {
    console.log('PASS commentary policy has no changed source files to validate');
    console.log('\n1/1 commentary policy checks passed');
    return;
  }

  for (const relativePath of changedFiles) {
    await validateChangedFile(relativePath);
  }

  console.log(`PASS commentary policy validated ${changedFiles.length} changed source file(s)`);
  console.log('\n1/1 commentary policy checks passed');
}

await main();
