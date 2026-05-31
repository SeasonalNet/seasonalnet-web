import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  PUBLIC_DOCS_ABOUT_META,
  PUBLIC_DOCS_ALLOWLIST,
  PUBLIC_DOCS_DENY_PREFIXES,
  PUBLIC_DOCS_LANS_META,
  PUBLIC_DOCS_MANAGED_OUTPUTS,
  PUBLIC_DOCS_ROOT_META,
  PUBLIC_DOCS_SOURCE_DEFAULT_PATH,
  PUBLIC_DOCS_SOURCE_REPO,
  PUBLIC_DOCS_TOPOLOGY_META,
} from './public-docs-policy.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..');
const outputRoot = path.join(workspaceRoot, 'content', 'docs');
const defaultSourceRoot = path.resolve(workspaceRoot, PUBLIC_DOCS_SOURCE_DEFAULT_PATH);
const sourceRoot = path.resolve(process.env.SEASONALNET_DOCS_SOURCE ?? defaultSourceRoot);

function normalizeText(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function escapeFrontmatter(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function stripLeadingTitle(text) {
  return text.replace(/^#\s+.+\n+/, '').trimStart();
}

function buildRouteMap() {
  return new Map(PUBLIC_DOCS_ALLOWLIST.map((entry) => [entry.sourcePath, entry.routePath]));
}

function rewriteInternalLinks(text, routeMap) {
  let next = text;

  for (const [sourcePath, routePath] of routeMap) {
    const escaped = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`\\]\\(${escaped}\\)`, 'g'), `](${routePath})`);
  }

  next = next.replace(/\]\((\.\/)?LANs\/seasonalnet-lan-map\.md\)/g, '](/docs/topology/lans/main-lan)');
  next = next.replace(/\]\((\.\/)?LANs\/seasonalcme-network-map\.md\)/g, '](/docs/topology/lans/seasonalcme)');
  next = next.replace(/\]\((\.\/)?LANs\/phonelan-map\.md\)/g, '](/docs/topology/lans/phone-lan)');
  next = next.replace(/\]\(README\.md\)/g, '](/docs)');
  next = next.replace(/\]\(PLATFORM\.md\)/g, '](/docs/about/platform)');
  next = next.replace(/\]\(SERVICES\.md\)/g, '](/docs/about/services)');
  next = next.replace(/\]\(NETWORK\.md\)/g, '](/docs/topology)');
  next = next.replace(/\]\(PROJECTS\.md\)/g, '](/docs/projects)');

  return next;
}

function stripHtmlComments(text) {
  return text.replace(/^<!--.*?-->\n*/gms, '').replace(/\n<!--.*?-->\n/gms, '\n\n');
}

function toMdx({ title, description }, rawText, routeMap) {
  const body = rewriteInternalLinks(
    stripHtmlComments(stripLeadingTitle(normalizeText(rawText))),
    routeMap,
  ).trim();

  return [
    '---',
    `title: "${escapeFrontmatter(title)}"`,
    `description: "${escapeFrontmatter(description)}"`,
    '---',
    '',
    body,
    '',
  ].join('\n');
}

function generateSectionIndex({ title, description, intro, section }) {
  const entries = PUBLIC_DOCS_ALLOWLIST.filter((entry) => entry.section === section);

  const lines = [
    '---',
    `title: "${escapeFrontmatter(title)}"`,
    `description: "${escapeFrontmatter(description)}"`,
    '---',
    '',
    intro,
    '',
  ];

  for (const entry of entries) {
    lines.push(`- [${entry.title}](${entry.routePath}) — ${entry.description}`);
  }

  lines.push('');
  return lines.join('\n');
}

function generateAboutIndex() {
  return generateSectionIndex({
    title: 'About SeasonalNet',
    description: 'Platform overview and public-safe service catalog for SeasonalNet.',
    intro: 'Read these pages for the high-level SeasonalNet platform model, service boundaries, and public-safe subsystem inventory.',
    section: 'about',
  });
}

function generateLanIndex() {
  return generateSectionIndex({
    title: 'LAN Maps',
    description: 'Published network-segment maps sourced from the public SeasonalNet documentation set.',
    intro: 'Select a network segment:',
    section: 'topology-lans',
  });
}

async function ensureRequiredSourceFiles() {
  const required = ['AGENTS.md', ...PUBLIC_DOCS_ALLOWLIST.map((entry) => entry.sourcePath)];

  for (const relativePath of required) {
    const fullPath = path.join(sourceRoot, relativePath);

    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) {
        throw new Error(`${relativePath} is not a file`);
      }
    } catch (error) {
      throw new Error(
        `Missing required source file ${relativePath} under ${sourceRoot}. ` +
          `Set SEASONALNET_DOCS_SOURCE if the repo is checked out elsewhere.`,
        { cause: error },
      );
    }
  }
}

function validatePolicy() {
  for (const entry of PUBLIC_DOCS_ALLOWLIST) {
    if (PUBLIC_DOCS_DENY_PREFIXES.some((prefix) => entry.sourcePath.startsWith(prefix))) {
      throw new Error(`Policy violation: ${entry.sourcePath} is denylisted but also allowlisted.`);
    }
  }
}

async function removeManagedOutputs() {
  for (const relativePath of PUBLIC_DOCS_MANAGED_OUTPUTS) {
    await fs.rm(path.join(outputRoot, relativePath), { force: true });
  }
}

async function writeJson(relativePath, data) {
  const fullPath = path.join(outputRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function writeText(relativePath, text) {
  const fullPath = path.join(outputRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, text, 'utf8');
}

async function main() {
  validatePolicy();
  await ensureRequiredSourceFiles();
  await removeManagedOutputs();

  const routeMap = buildRouteMap();

  await writeJson('meta.json', PUBLIC_DOCS_ROOT_META);
  await writeJson('about/meta.json', PUBLIC_DOCS_ABOUT_META);
  await writeJson('topology/meta.json', PUBLIC_DOCS_TOPOLOGY_META);
  await writeJson('topology/lans/meta.json', PUBLIC_DOCS_LANS_META);
  await writeText('about/index.mdx', generateAboutIndex());
  await writeText('topology/lans/index.mdx', generateLanIndex());

  for (const entry of PUBLIC_DOCS_ALLOWLIST) {
    const inputPath = path.join(sourceRoot, entry.sourcePath);
    const rawText = await fs.readFile(inputPath, 'utf8');
    const outputText = toMdx(entry, rawText, routeMap);

    await writeText(entry.outputPath, outputText);
  }

  const syncedRoutes = PUBLIC_DOCS_ALLOWLIST.map((entry) => `- ${entry.sourcePath} -> ${entry.routePath}`);
  process.stdout.write(
    [
      `Synced public docs from ${PUBLIC_DOCS_SOURCE_REPO}: ${sourceRoot}`,
      ...syncedRoutes,
      '',
    ].join('\n'),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
