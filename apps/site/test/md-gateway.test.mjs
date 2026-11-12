// Unit tests for the Markdown gateway (edge/md-gateway.mjs) behind the root middleware.js.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle, prefersMarkdown, resolve } from '../edge/md-gateway.mjs';

const FILES = {
  '/_md/index.md': '# gotoprompter\n\nHome.\n',
  '/_md/pricing.md': '# Pricing\n\nPlans.\n',
  '/_md/blog/how-to-use-a-teleprompter-on-zoom.md': '# Zoom\n\nSteps.\n',
  '/_md/_catalog.md': '# Catalog\n',
};
const fetchFile = async (url) =>
  FILES[url.pathname] === undefined
    ? new Response('Not found', { status: 404 })
    : new Response(FILES[url.pathname], {
        headers: { 'last-modified': 'Thu, 12 Nov 2026 10:00:00 GMT' },
      });
const req = (path, { method = 'GET', accept } = {}) =>
  new Request(`https://gotoprompter.app${path}`, {
    method,
    headers: accept === undefined ? {} : { accept },
  });

test('prefersMarkdown: Markdown only when it outranks HTML', () => {
  for (const a of [
    'text/markdown',
    'text/markdown, text/html',
    'text/markdown, */*',
    'text/markdown, text/html;q=0.9',
    'text/html;q=0.5, text/markdown;q=0.8',
  ])
    assert.equal(prefersMarkdown(a), true, a);
  for (const a of [
    undefined,
    '',
    '*/*',
    'text/*',
    'text/html',
    'text/html, text/markdown',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/markdown;q=0.5, text/html',
    'text/markdown;q=0, */*',
    'application/json',
  ])
    assert.equal(prefersMarkdown(a), false, String(a));
});

test('resolve: .md suffix, /api/md/ and negotiation map to the right file', () => {
  assert.equal(resolve('/index.md').file, '/_md/index.md');
  assert.equal(resolve('/pricing.md').file, '/_md/pricing.md');
  assert.equal(resolve('/pricing.md').canonical, 'https://gotoprompter.app/pricing/');
  assert.equal(
    resolve('/blog/how-to-use-a-teleprompter-on-zoom.md').file,
    '/_md/blog/how-to-use-a-teleprompter-on-zoom.md',
  );
  assert.equal(resolve('/api/md/pricing').file, '/_md/pricing.md');
  assert.equal(resolve('/api/md/pricing/').file, '/_md/pricing.md');
  assert.equal(resolve('/api/md/').file, '/_md/index.md');
  assert.equal(resolve('/api/md/_catalog').file, '/_md/_catalog.md');
  assert.equal(resolve('/pricing/', 'text/markdown').file, '/_md/pricing.md');
  assert.equal(resolve('/pricing', 'text/markdown').file, '/_md/pricing.md');
  assert.equal(resolve('/', 'text/markdown').file, '/_md/index.md');
  assert.equal(resolve('/pricing/', 'text/markdown').negotiated, true);
  assert.equal(resolve('/pricing/', '*/*'), null);
  assert.equal(resolve('/app/', 'text/markdown'), null, 'the web app is never negotiated');
  assert.equal(resolve('/llms.txt', 'text/markdown'), null);
  assert.equal(resolve('/robots.txt'), null);
  for (const bad of ['/%2e%2e/secret.md', '/api/md/..%2fx', '/Pricing.md', '/a.b.md'])
    assert.equal(resolve(bad).file, null, bad);
});

test('handle: serves Markdown with the agent headers', async () => {
  const res = await handle(req('/pricing.md'), fetchFile);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), FILES['/_md/pricing.md']);
  const h = res.headers;
  assert.equal(h.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(h.get('x-markdown-tokens'), String(Math.ceil(FILES['/_md/pricing.md'].length / 4)));
  assert.equal(h.get('x-robots-tag'), 'noindex, follow');
  assert.equal(h.get('content-location'), 'https://gotoprompter.app/pricing/');
  assert.match(h.get('link'), /^<https:\/\/gotoprompter\.app\/pricing\/>; rel="canonical"/);
  assert.match(h.get('link'), /<\/llms\.txt>; rel="describedby"/);
  assert.match(h.get('cache-control'), /s-maxage=3600, stale-while-revalidate=86400/);
  assert.equal(h.get('access-control-allow-origin'), '*');
  assert.equal(h.get('last-modified'), 'Thu, 12 Nov 2026 10:00:00 GMT');
  assert.equal(h.get('vary'), null, 'Vary only on negotiated responses');
});

test('handle: negotiation, HEAD, OPTIONS, 404 and fall-through', async () => {
  const neg = await handle(req('/pricing/', { accept: 'text/markdown' }), fetchFile);
  assert.equal(neg.status, 200);
  assert.equal(neg.headers.get('vary'), 'Accept');

  assert.equal(await handle(req('/pricing/', { accept: '*/*' }), fetchFile), null);
  assert.equal(await handle(req('/pricing/'), fetchFile), null);
  assert.equal(
    await handle(req('/download/', { accept: 'text/markdown' }), fetchFile),
    null,
    'a content route with no Markdown falls back to HTML',
  );

  const head = await handle(req('/pricing.md', { method: 'HEAD' }), fetchFile);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.ok(Number(head.headers.get('x-markdown-tokens')) > 0);

  const options = await handle(req('/pricing.md', { method: 'OPTIONS' }), fetchFile);
  assert.equal(options.status, 204);
  assert.match(options.headers.get('access-control-allow-methods'), /GET, HEAD, OPTIONS/);

  const post = await handle(req('/pricing.md', { method: 'POST' }), fetchFile);
  assert.equal(post.status, 405);

  for (const path of [
    '/does-not-exist.md',
    '/checkout/success.md',
    '/api/md/nope',
    '/%2e%2e/x.md',
  ]) {
    const res = await handle(req(path), fetchFile);
    assert.equal(res.status, 404, path);
    assert.equal(res.headers.get('content-type'), 'text/markdown; charset=utf-8');
    assert.match(await res.text(), /^# Not found/);
  }

  const catalog = await handle(req('/api/md/_catalog'), fetchFile);
  assert.equal(catalog.status, 200);
  assert.equal(catalog.headers.get('content-location'), 'https://gotoprompter.app/api/md/_catalog');
});
