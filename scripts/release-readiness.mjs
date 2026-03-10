import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function read(relPath) {
  return fs.readFile(path.join(ROOT, relPath), 'utf8');
}

async function exists(relPath) {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

async function testBundledFontsAndNoRemoteDependency() {
  const html = await read('index.html');
  const css = await read('styles/main.css');
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/, 'release bundle should not depend on remote font CDNs');
  for (const fontPath of [
    'assets/fonts/Orbitron-wght.woff2',
    'assets/fonts/ShareTechMono-Regular.woff2',
    'assets/fonts/Rajdhani-Regular.woff2',
    'assets/fonts/Rajdhani-Bold.woff2',
    'assets/fonts/Exo2-wght.woff2',
  ]) {
    assert.equal(await exists(fontPath), true, `release bundle should include ${fontPath}`);
  }
  assert.match(css, /format\('woff2'\)/, 'stylesheet should prefer bundled woff2 fonts');
}

async function testPortReportsAndAgentsExist() {
  assert.equal(await exists('docs/project/linux-desktop-binary-report.md'), true, 'Linux packaging report should exist');
  assert.equal(await exists('docs/project/android-port-report.md'), true, 'Android packaging report should exist');
  assert.equal(await exists('docs/agents/performance-build-agent.md'), true, 'performance/build agent should exist for release work');
}

async function testPackageScriptsExposeReleaseCheckPath() {
  const pkg = await read('package.json');
  assert.match(pkg, /"release-readiness":\s*"node scripts\/release-readiness\.mjs"/, 'package scripts should expose a release readiness entry point');
  assert.match(pkg, /"check:release":\s*"npm run release-readiness"/, 'package scripts should expose a release-domain check');
}

const tests = [
  ['bundled fonts and no remote dependency stay ready for packaging', testBundledFontsAndNoRemoteDependency],
  ['port reports and release agents exist', testPortReportsAndAgentsExist],
  ['package scripts expose a release readiness path', testPackageScriptsExposeReleaseCheckPath],
];

let passed = 0;
for (const [name, testFn] of tests) {
  await testFn();
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log(`\n${passed}/${tests.length} release readiness checks passed`);
