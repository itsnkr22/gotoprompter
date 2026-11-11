import assert from 'node:assert/strict';
import { test } from 'node:test';
import { indexArticle, near, score, search, tokens } from '../src/lib/support-search.ts';

const article = (over = {}) => ({
  id: 'activate-license',
  question: 'How do I activate my license?',
  category: 'License & billing',
  platforms: ['macOS'],
  answerHtml:
    '<p>Paste the key into Settings → License and click Activate. The script limit disappears.</p>',
  keywords: 'key activate pro lifetime unlock',
  searchPhrases: ['enter license key', 'activate pro'],
  videoUrl: null,
  ...over,
});

test('tokens: lowercases, drops ignored words, maps aliases, dedupes', () => {
  assert.deepEqual(tokens('How do I activate my licence key?'), ['license']);
  assert.deepEqual(tokens("The mic doesn't work"), ['microphone', 'work']); // "doesn't" → not → ignored
  assert.deepEqual(tokens('gotoprompter app please'), []);
  assert.deepEqual(tokens('Scrolling scrolls, scroll!'), ['scrolling', 'scrolls']); // 'scrolls' is not an alias
});

test('near: one substitution, one adjacent transposition, one insertion; never on short words', () => {
  assert.equal(near('license', 'license'), true);
  assert.equal(near('licence', 'license'), true); // substitution
  assert.equal(near('lciense', 'license'), true); // adjacent transposition
  assert.equal(near('lisence', 'license'), false); // two non-adjacent substitutions
  assert.equal(near('licens', 'license'), true); // deletion
  assert.equal(near('licensee', 'license'), true); // insertion
  assert.equal(near('licenze', 'licensa'), false); // two substitutions
  assert.equal(near('mac', 'mic'), false); // too short
  assert.equal(near('abcdef', 'abcdefgh'), false); // length diff > 1
});

test('score: title > hints > body, typo weight ×0.65, 75% threshold, phrase bonus, empty query', () => {
  const entry = indexArticle(article());
  assert.equal(score(entry, ''), 1);
  assert.equal(score(entry, 'how do I'), 1); // only ignored words
  assert.equal(score(entry, 'license'), 5); // title (aliases of key/activation all → license)
  assert.equal(score(entry, 'unlock'), 4); // hints only
  assert.equal(score(entry, 'settings'), 1); // body only
  assert.equal(score(entry, 'unlok'), 4 * 0.65); // typo in hints
  // "enter license key" → tokens [enter, license]; both match (hints 4 + title 5) and the phrase bonus applies
  assert.equal(score(entry, 'enter license key'), 5 + 4 + 12);
});

test('score: threshold and phrase mechanics in detail', () => {
  const entry = indexArticle(article());
  // "activate pro" → tokens [license, pro]: both match (title, hints) → 5 + 4, phrase bonus → +12
  assert.equal(score(entry, 'activate pro'), 5 + 4 + 12);
  // 4 words, 3 match → 75% → relevant; 4 words, 2 match → not relevant
  assert.ok(score(entry, 'license unlock settings zebra') > 0);
  assert.equal(score(entry, 'license zebra giraffe hippo'), 0);
});

test('search: ranks by score, filters by platform and category, keeps original order on ties', () => {
  const a = article();
  const b = article({
    id: 'web-offline',
    question: 'Does the web app work offline?',
    category: 'Web app',
    platforms: ['web'],
    answerHtml: '<p>Install it as an app.</p>',
    keywords: 'pwa install no internet',
    searchPhrases: ['work without internet'],
  });
  const c = article({
    id: 'lost-key',
    question: 'I lost my license key.',
    category: 'License & billing',
    platforms: ['macOS'],
    answerHtml: '<p>Enter the email you used at checkout.</p>',
    keywords: 'recover resend',
    searchPhrases: ['resend license'],
  });
  const all = [a, b, c];
  const index = all.map(indexArticle);
  assert.deepEqual(
    search(all, index, '').map((x) => x.id),
    ['activate-license', 'web-offline', 'lost-key'],
  );
  assert.deepEqual(
    search(all, index, 'license').map((x) => x.id),
    ['activate-license', 'lost-key'],
  );
  assert.deepEqual(
    search(all, index, 'license', { platform: 'web' }).map((x) => x.id),
    [],
  );
  assert.deepEqual(
    search(all, index, '', { category: 'Web app' }).map((x) => x.id),
    ['web-offline'],
  );
  // 'resend' is unknown to activate-license → 1 of 2 words < 75% → excluded
  assert.deepEqual(
    search(all, index, 'resend license').map((x) => x.id),
    ['lost-key'],
  );
  assert.deepEqual(
    search(all, index, 'license key').map((x) => x.id),
    ['activate-license', 'lost-key'],
  );
});
