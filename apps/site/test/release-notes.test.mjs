import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { defaultChangelog, renderNotes, sectionFor } from '../scripts/release-notes.mjs';

const sample = `# Changelog

## Mac app
### 1.1.0
- **Beta channel** - opt in under Settings → General.
- Fixes.

### 1.0.0 — launch
- **Voice scrolling** with [details](https://example.com).

## Web app
### 2026-11
- Not a Mac release.
`;

test('picks the matching Mac section only', () => {
  assert.equal(
    sectionFor(sample, '1.1.0'),
    '- **Beta channel** - opt in under Settings → General.\n- Fixes.',
  );
  assert.equal(
    sectionFor(sample, '1.0.0'),
    '- **Voice scrolling** with [details](https://example.com).',
  );
  assert.equal(sectionFor(sample, '2026-11'), null, 'web sections are not Mac releases');
  assert.equal(sectionFor(sample, '9.9.9'), null);
});

test('renders HTML with a version heading', () => {
  const html = renderNotes(sample, '1.0.0');
  assert.match(html, /^<h2>gotoprompter 1\.0\.0<\/h2>/);
  assert.match(html, /<strong>Voice scrolling<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com">details<\/a>/);
  assert.throws(() => renderNotes(sample, '9.9.9'), /no "### 9\.9\.9" section/);
});

test('the real changelog has the in-development 1.0.0 section', () => {
  const markdown = readFileSync(defaultChangelog, 'utf8');
  assert.ok(sectionFor(markdown, '1.0.0'));
});
