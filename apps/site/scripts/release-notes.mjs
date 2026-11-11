#!/usr/bin/env node
// Renders the `### <version>` section under `## Mac app` of the changelog to HTML for
// `POST /releases` and the GitHub release (docs/spec/06-release-ops.md §3.5).
// Usage: node scripts/release-notes.mjs <X.Y.Z> [--markdown] [--file <changelog.md>]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { marked } from 'marked';

const here = dirname(fileURLToPath(import.meta.url));
export const defaultChangelog = resolve(here, '../src/content/changelog/changelog.md');

/** Markdown of the matching Mac section, without its heading; null when absent. */
export function sectionFor(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  let inMac = false;
  let capturing = false;
  const out = [];
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (capturing) break;
      inMac = /^## mac app/i.test(line);
      continue;
    }
    if (/^### /.test(line)) {
      if (capturing) break;
      const heading = line.replace(/^### /, '').trim();
      const headVersion = heading.split(/\s/)[0];
      capturing = inMac && headVersion === version;
      continue;
    }
    if (capturing) out.push(line);
  }
  const body = out.join('\n').trim();
  return capturing || body ? body || null : null;
}

export function renderNotes(markdown, version) {
  const section = sectionFor(markdown, version);
  if (section === null)
    throw new Error(`changelog has no "### ${version}" section under "## Mac app"`);
  const html = marked.parse(section, { async: false });
  return `<h2>gotoprompter ${version}</h2>\n${html}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const version = args.find((a) => !a.startsWith('--'));
  const fileIndex = args.indexOf('--file');
  const file = fileIndex >= 0 ? args[fileIndex + 1] : defaultChangelog;
  if (!version) {
    console.error('usage: release-notes.mjs <X.Y.Z> [--markdown] [--file changelog.md]');
    process.exit(2);
  }
  const markdown = readFileSync(file, 'utf8');
  try {
    if (args.includes('--markdown')) {
      const section = sectionFor(markdown, version);
      if (section === null)
        throw new Error(`changelog has no "### ${version}" section under "## Mac app"`);
      process.stdout.write(section + '\n');
    } else {
      process.stdout.write(renderNotes(markdown, version));
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
