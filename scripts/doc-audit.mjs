#!/usr/bin/env node
/**
 * doc-audit.mjs
 *
 * Read-only doc audit for the NodeWARS boot-chain files.
 * Scans for dead links, missing scripts, orphan scripts,
 * duplicate headings, and orphan docs.
 *
 * Usage: node scripts/doc-audit.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Boot-chain files to audit ──────────────────────────────────────────────

const BOOT_CHAIN = [
  'AGENTS.md',
  'docs/project/RESUME.md',
  'docs/project/development-working-rhythm.md',
  'docs/project/operational-kanban.md',
  'docs/project/skill-usage-map.md',
  'docs/project/task-backlog.md',
  'docs/project/check-matrix.md',
  'docs/project/inbox-codex.md',
  'docs/project/inbox-claude.md',
  'docs/project/tw-collab-status.md',
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function fileExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function readText(rel) {
  return fs.readFile(path.join(ROOT, rel), 'utf8');
}

async function listDir(rel, ext = null) {
  const dir = path.join(ROOT, rel);
  try {
    const entries = await fs.readdir(dir);
    return ext ? entries.filter(entry => entry.endsWith(ext)) : entries;
  } catch {
    return [];
  }
}

function extractMarkdownLinks(text) {
  const results = [];
  const lines = text.split('\n');
  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    for (const match of lineText.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
      const href = match[2].split('#')[0].trim();
      if (href && !href.startsWith('http')) results.push({ href, line: lineNum });
    }
    for (const match of lineText.matchAll(/`((?:docs|src)\/[^`]+\.(?:md|js))`/g)) {
      results.push({ href: match[1], line: lineNum });
    }
  });
  return results;
}

function extractScriptRefs(rel, text) {
  const results = [];
  for (const match of text.matchAll(/`(scripts\/[^`]+\.(?:mjs|sh))`/g)) {
    results.push({ source: rel, script: match[1] });
  }
  for (const match of text.matchAll(/node (scripts\/\S+\.mjs)/g)) {
    results.push({ source: rel, script: match[1] });
  }
  for (const match of text.matchAll(/bash (scripts\/\S+\.sh)/g)) {
    results.push({ source: rel, script: match[1] });
  }
  return results;
}

function extractHeadings(text) {
  const results = [];
  for (const match of text.matchAll(/^(#{1,2})\s+(.+)$/gm)) {
    results.push(match[2].trim());
  }
  return results;
}

const isCommonHeading = heading => heading.trim().split(/\s+/).length <= 2;

// ── Checks ─────────────────────────────────────────────────────────────────

async function checkDeadLinks(bootFiles) {
  const findings = [];
  for (const rel of bootFiles) {
    let text;
    try {
      text = await readText(rel);
    } catch {
      continue;
    }
    for (const { href, line } of extractMarkdownLinks(text)) {
      const abs = path.join(ROOT, href);
      if (!await fileExists(abs)) {
        findings.push(`  ${rel}:${line} → ${href} (NOT FOUND)`);
      }
    }
  }
  return findings;
}

async function checkMissingScripts(bootFiles) {
  const cited = [];
  for (const rel of bootFiles) {
    let text;
    try {
      text = await readText(rel);
    } catch {
      continue;
    }
    for (const ref of extractScriptRefs(rel, text)) cited.push(ref);
  }
  const findings = [];
  const seen = new Set();
  for (const { source, script } of cited) {
    const key = `${source}::${script}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!await fileExists(path.join(ROOT, script))) {
      findings.push(`  ${source} references ${script} (NOT FOUND)`);
    }
  }
  return findings;
}

async function checkOrphanScripts(bootFiles) {
  const bootRefs = new Set();
  for (const rel of bootFiles) {
    let text;
    try {
      text = await readText(rel);
    } catch {
      continue;
    }
    for (const { script } of extractScriptRefs(rel, text)) bootRefs.add(script);
  }

  const archiveFiles = await listDir('docs/archive', '.md');
  const archiveRefs = new Set();
  for (const file of archiveFiles) {
    let text;
    try {
      text = await readText(`docs/archive/${file}`);
    } catch {
      continue;
    }
    for (const { script } of extractScriptRefs(`docs/archive/${file}`, text)) archiveRefs.add(script);
  }

  const scriptFiles = await listDir('scripts');
  const findings = [];
  for (const file of scriptFiles) {
    const rel = `scripts/${file}`;
    if (bootRefs.has(rel)) continue;
    if (archiveRefs.has(rel)) {
      findings.push(`  ${rel} [ARCHIVE-REF] — referenced only in docs/archive/`);
    } else {
      findings.push(`  ${rel} — not referenced in any boot-chain doc`);
    }
  }
  return findings;
}

async function checkDuplicateHeadings(bootFiles) {
  const headingMap = new Map();
  for (const rel of bootFiles) {
    let text;
    try {
      text = await readText(rel);
    } catch {
      continue;
    }
    for (const heading of extractHeadings(text)) {
      if (!headingMap.has(heading)) headingMap.set(heading, []);
      headingMap.get(heading).push(rel);
    }
  }
  const findings = [];
  for (const [heading, files] of headingMap) {
    if (files.length > 1) {
      if (isCommonHeading(heading)) {
        findings.push(`  [INFO] "${heading}" in ${files.join(' AND ')} (common heading — OK)`);
      } else {
        findings.push(`  [REVIEW] "${heading}" in ${files.join(' AND ')}`);
      }
    }
  }
  return findings;
}

async function checkOrphanDocs(bootFiles) {
  const allRefs = new Set(bootFiles.map(file => file.replace(/^\//, '')));
  for (const rel of bootFiles) {
    let text;
    try {
      text = await readText(rel);
    } catch {
      continue;
    }
    for (const { href } of extractMarkdownLinks(text)) allRefs.add(href);
  }

  const docFiles = await listDir('docs/project', '.md');
  const findings = [];
  for (const file of docFiles) {
    const rel = `docs/project/${file}`;
    if (!allRefs.has(rel)) {
      findings.push(`  ${rel} — no inbound references [REVIEW]`);
    }
  }

  const archiveFiles = await listDir('docs/archive', '.md');
  for (const file of archiveFiles) {
    findings.push(`  docs/archive/${file} [ARCHIVE — OK]`);
  }

  return findings;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Doc Audit Report ===\n');

  const deadLinks = await checkDeadLinks(BOOT_CHAIN);
  console.log(`[DEAD LINKS] ${deadLinks.length} found`);
  for (const finding of deadLinks) console.log(finding);
  if (!deadLinks.length) console.log('  (none)');

  console.log('');
  const missingScripts = await checkMissingScripts(BOOT_CHAIN);
  console.log(`[MISSING SCRIPTS] ${missingScripts.length} found`);
  for (const finding of missingScripts) console.log(finding);
  if (!missingScripts.length) console.log('  (none)');

  console.log('');
  const orphanScripts = await checkOrphanScripts(BOOT_CHAIN);
  console.log(`[ORPHAN SCRIPTS] ${orphanScripts.length} found (informational — no action required this wave)`);
  for (const finding of orphanScripts) console.log(finding);
  if (!orphanScripts.length) console.log('  (none)');

  console.log('');
  const duplicateHeadings = await checkDuplicateHeadings(BOOT_CHAIN);
  console.log(`[DUPLICATE HEADINGS] ${duplicateHeadings.length} found`);
  for (const finding of duplicateHeadings) console.log(finding);
  if (!duplicateHeadings.length) console.log('  (none)');

  console.log('');
  const orphanDocs = await checkOrphanDocs(BOOT_CHAIN);
  console.log(`[ORPHAN DOCS] ${orphanDocs.length} found`);
  for (const finding of orphanDocs) console.log(finding);
  if (!orphanDocs.length) console.log('  (none)');

  const errors = deadLinks.length + missingScripts.length;
  console.log('\n=== Summary ===');
  console.log(`Errors (must fix): ${errors}`);
  console.log(`  [DEAD LINKS]: ${deadLinks.length}`);
  console.log(`  [MISSING SCRIPTS]: ${missingScripts.length}`);
  console.log(`Review items: ${orphanDocs.filter(finding => finding.includes('[REVIEW]')).length}`);
  console.log(`Informational: orphan scripts ${orphanScripts.length}, duplicate headings ${duplicateHeadings.length}`);

  if (errors > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error('Doc audit failed:', error);
  process.exitCode = 1;
});
