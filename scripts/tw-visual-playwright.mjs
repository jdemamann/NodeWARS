#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const moduleRoot = process.env.TW_PLAYWRIGHT_NODE_MODULE;

if (!moduleRoot) {
  console.error('TW_PLAYWRIGHT_NODE_MODULE is required');
  process.exit(1);
}

const { chromium, firefox, webkit } = require(path.join(moduleRoot, 'playwright'));

const COMMAND = process.argv[2] || 'snapshot';
const TARGET_URL = process.argv[3];
const TARGET = process.argv[4];
const BROWSER = process.argv[5] || 'chromium';
const VIEWPORT = process.argv[6] || '1440,1024';
const SCENARIO_PRESET = process.argv[7] || '';
const SCENARIO_ACTION = process.argv[8] || 'none';
const SCENARIO_WAIT_MS = Number(process.argv[9] || 1400);

const [width, height] = VIEWPORT.split(',').map((value) => Number(value));
const browserType = ({ chromium, firefox, webkit })[BROWSER];

if (!browserType) {
  console.error(`Unsupported browser: ${BROWSER}`);
  process.exit(1);
}

function attachPageLogs(page) {
  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log(`[pageerror] ${err.message}`);
  });
}

async function openPage() {
  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  attachPageLogs(page);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  return { browser, page };
}

async function runSnapshot() {
  const { browser, page } = await openPage();
  try {
    await page.screenshot({ path: TARGET, fullPage: true });
    console.log(`screenshot=${TARGET}`);
    console.log(`title=${await page.title()}`);
  } finally {
    await browser.close();
  }
}

async function runSmoke() {
  const outDir = TARGET;
  fs.mkdirSync(outDir, { recursive: true });

  const { browser, page } = await openPage();
  try {
    const menuPath = path.join(outDir, 'tw-visual-basic-menu.png');
    const settingsPath = path.join(outDir, 'tw-visual-basic-settings.png');

    await page.screenshot({ path: menuPath, fullPage: true });
    await page.click('#btnsettings');
    await page.waitForTimeout(400);
    await page.screenshot({ path: settingsPath, fullPage: true });

    const state = await page.evaluate(() => ({
      menuHidden: document.getElementById('sm')?.classList.contains('off') ?? null,
      settingsHidden: document.getElementById('sq')?.classList.contains('off') ?? null,
      backExists: !!document.getElementById('btnSettingsBack'),
      title: document.title,
    }));

    console.log(JSON.stringify({
      menu: menuPath,
      settings: settingsPath,
      state,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

function buildScenarioUrl(baseUrl, presetId) {
  const url = new globalThis.URL(baseUrl);
  url.searchParams.set('tw-debug', '1');
  url.searchParams.set('tw-mode', 'tentaclewars');
  url.searchParams.set('tw-autostart', '1');
  if (presetId) url.searchParams.set('tw-preset', presetId);
  return url.toString();
}

async function runScenario() {
  const { browser, page } = await openPage();
  try {
    const scenarioUrl = buildScenarioUrl(TARGET_URL, SCENARIO_PRESET);
    await page.goto(scenarioUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(SCENARIO_WAIT_MS);

    if (SCENARIO_ACTION === 'slice-primary') {
      await page.evaluate(() => {
        const game = window.__NODEWARS_DEBUG__?.getGame?.();
        const sliceTentacle = game?.tents?.find(tentacle => tentacle.alive && tentacle.source?.owner === 1);
        sliceTentacle?.applySliceCut?.(0.35);
      });
      await page.waitForTimeout(900);
    } else if (SCENARIO_ACTION.startsWith('pin-node:')) {
      const nodeId = Number(SCENARIO_ACTION.split(':')[1]);
      await page.evaluate((selectedNodeId) => {
        const game = window.__NODEWARS_DEBUG__?.getGame?.();
        const node = game?.nodes?.find(candidate => candidate.id === selectedNodeId) || null;
        if (game) {
          game.hoverNode = node;
          game.hoverPin = !!node;
        }
      }, nodeId);
      await page.waitForTimeout(120);
    }

    await page.screenshot({ path: TARGET, fullPage: true });
    console.log(`scenario=${SCENARIO_PRESET}`);
    console.log(`action=${SCENARIO_ACTION}`);
    console.log(`screenshot=${TARGET}`);
  } finally {
    await browser.close();
  }
}

if (!TARGET_URL) {
  console.error('URL argument is required');
  process.exit(1);
}

if (COMMAND === 'snapshot') {
  if (!TARGET) {
    console.error('output file is required for snapshot');
    process.exit(1);
  }
  await runSnapshot();
} else if (COMMAND === 'smoke') {
  if (!TARGET) {
    console.error('output directory is required for smoke');
    process.exit(1);
  }
  await runSmoke();
} else if (COMMAND === 'scenario') {
  if (!TARGET) {
    console.error('output file is required for scenario');
    process.exit(1);
  }
  await runScenario();
} else {
  console.error(`Unknown command: ${COMMAND}`);
  process.exit(1);
}
