// Runs against dist/ after `astro build` (docs/spec/03-site.md §12).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CONTENT_ROUTES } from '../edge/md-gateway.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const read = (p) => readFileSync(`${dist}${p}`, 'utf8');
const page = (route) =>
  read(`${route.replace(/^\//, '')}${route.endsWith('/') ? 'index.html' : ''}`);
const launch = JSON.parse(
  readFileSync(new URL('../../../packages/config/launch.json', import.meta.url), 'utf8'),
);

const ROUTES = [
  '/',
  '/web/',
  '/mac/',
  '/mac/zoom/',
  '/mac/google-meet/',
  '/mac/microsoft-teams/',
  '/mac/loom/',
  '/mac/riverside/',
  '/pricing/',
  '/download/',
  '/checkout/success/',
  '/license/',
  '/refund-policy/',
  '/privacy/',
  '/terms/',
  '/about/',
  '/changelog/',
  '/blog/',
  '/support/',
  '/404.html',
  '/rss.xml',
  '/llms.txt',
  '/llms-full.txt',
  '/ai.txt',
  '/_md/index.md',
  '/_md/_catalog.md',
  '/robots.txt',
  '/sitemap-index.xml',
];

test('every route exists in dist', () => {
  for (const r of ROUTES) {
    const file = r.endsWith('/') ? `${r}index.html` : r;
    assert.ok(existsSync(`${dist}${file.replace(/^\//, '')}`), `missing ${file}`);
  }
  assert.ok(existsSync(`${dist}app/index.html`), 'web app copied to /app/');
});

test('every blog post has a page and an OG image', () => {
  const slugs = readdirSync(fileURLToPath(new URL('../src/content/blog/', import.meta.url))).map(
    (f) => f.replace(/\.md$/, ''),
  );
  assert.ok(slugs.length >= 8);
  for (const s of slugs) {
    assert.ok(existsSync(`${dist}blog/${s}/index.html`), `missing page for ${s}`);
    assert.ok(existsSync(`${dist}og/blog/${s}.png`), `missing OG image for ${s}`);
    const html = page(`/blog/${s}/`);
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /class="tldr card"/);
    assert.match(
      html,
      new RegExp(`og:image" content="https://gotoprompter\\.app/og/blog/${s}\\.png"`),
    );
  }
});

test('sitemap contains /app/ and not /checkout/success/', () => {
  const sitemap = read('sitemap-0.xml');
  assert.match(sitemap, /https:\/\/gotoprompter\.app\/app\//);
  assert.doesNotMatch(sitemap, /checkout\/success/);
  assert.doesNotMatch(sitemap, /\/404/);
});

test('every JSON-LD block parses and has @type', () => {
  const htmlRoutes = ROUTES.filter((r) => r.endsWith('/'));
  for (const r of htmlRoutes) {
    const html = page(r);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.ok(blocks.length > 0, `no JSON-LD on ${r}`);
    for (const b of blocks) {
      const data = JSON.parse(b[1]);
      for (const item of Array.isArray(data) ? data : [data])
        assert.ok(item['@type'], `JSON-LD without @type on ${r}`);
    }
  }
});

test('/mac/ FAQPage has 14 questions; use-case pages have 14 + extras and a HowTo', () => {
  const count = (html) => {
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].flatMap((b) => JSON.parse(b[1]));
    const faq = blocks.find((x) => x['@type'] === 'FAQPage');
    return {
      faq: faq ? faq.mainEntity.length : 0,
      howTo: blocks.some((x) => x['@type'] === 'HowTo'),
    };
  };
  assert.equal(count(page('/mac/')).faq, 14);
  const zoom = count(page('/mac/zoom/'));
  assert.equal(zoom.faq, 17);
  assert.ok(zoom.howTo);
  assert.match(page('/mac/zoom/'), /Will other Zoom participants see the teleprompter\?/);
  assert.doesNotMatch(page('/mac/zoom/'), /\{\{PLATFORM_NAME\}\}|\{\{APP_NAME\}\}/);
});

test('head metadata: canonical, OG, robots, title suffix', () => {
  const home = page('/');
  assert.match(home, /<title>gotoprompter — Teleprompter that follows your voice<\/title>/);
  assert.match(home, /rel="canonical" href="https:\/\/gotoprompter\.app\/"/);
  const web = page('/web/');
  assert.match(web, /<title>Free web teleprompter that follows your voice · gotoprompter<\/title>/);
  assert.match(web, /rel="canonical" href="https:\/\/gotoprompter\.app\/web\/"/);
  assert.match(page('/checkout/success/'), /name="robots" content="noindex,nofollow"/);
  assert.match(page('/404.html'.replace('.html', '.html')), /off-script/);
  for (const r of ROUTES.filter((x) => x.endsWith('/')))
    assert.equal((page(r).match(/<h1[\s>]/g) ?? []).length, 1, `one h1 on ${r}`);
});

test('no upstream names or numbers leaked into the site', () => {
  const needles = ['VoicePrompter', '23,000', '125+', 'Konstantin'];
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory()
        ? d.name === 'app'
          ? []
          : walk(`${dir}/${d.name}`)
        : d.name.endsWith('.html')
          ? [`${dir}/${d.name}`]
          : [],
    );
  for (const f of walk(dist.replace(/\/$/, ''))) {
    const html = readFileSync(f, 'utf8');
    for (const n of needles) assert.ok(!html.includes(n), `${n} found in ${f}`);
  }
});

test('internal links and images resolve', () => {
  execFileSync(process.execPath, [
    fileURLToPath(new URL('../scripts/check-links.mjs', import.meta.url)),
    dist,
  ]);
});

test(
  'Mac "coming soon": no download or checkout CTA, no Mac offers, download page noindex',
  {
    skip: launch.macAvailable && 'Mac app is available (packages/config/launch.json)',
  },
  () => {
    const routes = ['/', '/mac/', '/mac/zoom/', '/pricing/', '/web/', '/blog/'];
    for (const r of routes) {
      const html = page(r);
      assert.doesNotMatch(html, />\s*Download for Mac\s*</, `download CTA on ${r}`);
      assert.doesNotMatch(html, /href="\/download\/"/, `link to /download/ on ${r}`);
      assert.doesNotMatch(
        html,
        /client="idle"[^>]*PricingButtons|data-plan=/,
        `checkout button on ${r}`,
      );
    }
    for (const r of ['/', '/mac/', '/pricing/']) {
      for (const [, json] of page(r).matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        const items = [JSON.parse(json)].flat();
        for (const it of items)
          if (it['@type'] === 'SoftwareApplication' && it.operatingSystem === 'macOS')
            assert.deepEqual(it.offers, [], `Mac offers in JSON-LD on ${r}`);
      }
    }
    assert.match(page('/mac/'), /Coming soon/);
    assert.match(page('/pricing/'), /Planned Mac app pricing/);
    assert.match(page('/pricing/'), /aria-disabled="true"[^>]*>\s*Coming soon/);
    const download = page('/download/');
    assert.match(download, /The Mac app is coming soon/);
    assert.match(download, /name="robots" content="noindex,nofollow"/);
    assert.doesNotMatch(read('sitemap-0.xml'), /\/download\/|\/license\//);
    assert.match(read('llms.txt'), /coming soon/);
    assert.doesNotMatch(read('llms.txt'), /\/download\//);
  },
);

test('AI files: every public page has a Markdown version, listed in llms.txt and llms-full.txt', () => {
  const catalog = read('_md/_catalog.md');
  const matcher = readFileSync(new URL('../../../middleware.js', import.meta.url), 'utf8');
  const llms = read('llms.txt');
  const full = read('llms-full.txt');
  const ai = read('ai.txt');
  const paths = [...read('sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => p !== '/app/');
  assert.ok(paths.length >= 20);
  for (const p of paths) {
    const md = p === '/' ? 'index.md' : `${p.slice(1, -1)}.md`;
    const mdUrl = `https://gotoprompter.app/${md}`;
    assert.ok(existsSync(`${dist}_md/${md}`), `missing _md/${md}`);
    const text = read(`_md/${md}`);
    assert.match(text, /^# \S/, `${md} starts with a title`);
    assert.ok(text.includes(`Canonical: https://gotoprompter.app${p}\n`), `${md} canonical`);
    assert.doesNotMatch(
      text,
      /<\/?(div|span|section|details|summary|button|svg)\b|undefined|\[object /,
      `${md} is clean`,
    );
    assert.ok(llms.includes(`(${mdUrl})`), `llms.txt lists ${md}`);
    assert.ok(
      full.includes(`<!-- source: https://gotoprompter.app${p} -->`),
      `llms-full.txt has ${p}`,
    );
    assert.ok(
      page(p).includes(`<link rel="alternate" type="text/markdown" href="${mdUrl}">`),
      `${p} links its Markdown version`,
    );
    assert.ok(catalog.includes(`(${mdUrl})`), `catalog lists ${md}`);
    assert.ok(
      CONTENT_ROUTES.some((r) => r.test(p)),
      `md-gateway CONTENT_ROUTES covers ${p}`,
    );
    const section = p.split('/')[1] || '/';
    if (section !== '/') assert.ok(matcher.includes(section), `middleware matcher covers ${p}`);
    const summary = page(p).match(/<meta name="ai-summary" content="([^"]+)"/);
    assert.ok(summary && summary[1].length > 40, `${p} has an ai-summary`);
  }
  // Pages outside the sitemap (noindex or Mac-only while the Mac app is off) get no Markdown.
  const mdFiles = [];
  (function walk(dir) {
    for (const f of readdirSync(`${dist}${dir}`, { withFileTypes: true })) {
      if (f.isDirectory()) walk(`${dir}${f.name}/`);
      else mdFiles.push(`${dir}${f.name}`);
    }
  })('_md/');
  assert.equal(
    mdFiles.length,
    paths.length + 1,
    'one Markdown file per public page, plus the catalog',
  );
  for (const p of ['checkout/success', 'license/portal', '404'])
    assert.ok(!existsSync(`${dist}_md/${p}.md`), `no Markdown for ${p}`);
  assert.ok(!readdirSync(dist).some((f) => f.endsWith('.md')), 'no .md files outside _md/');
  assert.match(llms, /^# gotoprompter\n\n> /);
  for (const h of [
    'Core pages',
    'Support answers',
    'Articles',
    'Machine-readable',
    'Guidance for AI assistants',
    'Optional',
  ])
    assert.match(llms, new RegExp(`^## ${h}$`, 'm'), `llms.txt has ${h}`);
  assert.match(llms, /\(https:\/\/gotoprompter\.app\/support\/#activate-license\)/);
  for (const s of [
    '[identity]',
    '[permissions]',
    '[restrictions]',
    '[attribution]',
    '[scope]',
    '[training]',
    '[contact]',
    '[metadata]',
  ])
    assert.ok(ai.includes(`\n${s}\n`), `ai.txt has ${s}`);
  assert.match(read('robots.txt'), /llms\.txt/);
  for (const p of ['/checkout/success/', '/license/portal/'])
    assert.ok(!llms.includes(`https://gotoprompter.app${p}`), `llms.txt leaves out ${p}`);
});

test('changelog entries render as lists', () => {
  for (const [, after] of page('/changelog/').matchAll(/<\/h3>\s*(<\w+)/g))
    assert.equal(after, '<ul');
});

test('robots.txt explicitly allows AI crawlers with the same rules as everyone else', () => {
  const groups = read('robots.txt')
    .split(/\n\s*\n/)
    .map((g) => g.split('\n').filter((l) => l && !l.startsWith('#')))
    .filter((g) => g.some((l) => /^user-agent:/i.test(l)));
  assert.ok(groups.length >= 3);
  const agents = groups.flatMap((g) =>
    g.filter((l) => /^user-agent:/i.test(l)).map((l) => l.split(':')[1].trim()),
  );
  for (const a of [
    '*',
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'PerplexityBot',
    'Google-Extended',
    'CCBot',
  ])
    assert.ok(agents.includes(a), `robots.txt names ${a}`);
  for (const g of groups) {
    assert.ok(g.includes('Allow: /'), `group ${g[0]} allows /`);
    assert.ok(g.includes('Disallow: /checkout/'), `group ${g[0]} disallows /checkout/`);
  }
  assert.match(read('robots.txt'), /^Sitemap: https:\/\/gotoprompter\.app\/sitemap-index\.xml$/m);
});

test('vercel.json: Link describedby header on pages, raw Markdown files noindex', () => {
  const vercel = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'));
  const link = vercel.headers.find((h) => h.headers.some((x) => x.key === 'Link'));
  assert.ok(link, 'a Link header rule exists');
  for (const f of ['/llms.txt', '/llms-full.txt', '/ai.txt'])
    assert.ok(link.headers[0].value.includes(`<${f}>; rel="describedby"`), `Link names ${f}`);
  const re = new RegExp(`^${link.source}$`);
  for (const p of ['/', '/pricing/', '/blog/teleprompter-for-google-meet/'])
    assert.ok(re.test(p), p);
  for (const p of ['/pricing.md', '/_md/pricing.md', '/api/md/pricing', '/_astro/x.js'])
    assert.ok(!re.test(p), p);
  const md = vercel.headers.find((h) => h.source === '/_md/(.*)');
  assert.ok(
    md?.headers.some((x) => x.key === 'X-Robots-Tag'),
    '/_md/ is noindex',
  );
});

test('advertised /api/md/ URLs have the trailing slash (slashless ones redirect)', () => {
  for (const f of ['llms.txt', 'llms-full.txt', 'ai.txt', 'robots.txt', '_md/_catalog.md']) {
    const urls = read(f).match(/https:\/\/gotoprompter\.app\/api\/md\/[^\s)`;,]*/g) ?? [];
    for (const u of urls) assert.match(u, /\/$|\/\.$/, `${f}: ${u}`);
    if (f !== 'llms-full.txt') assert.ok(urls.length > 0, `${f} mentions /api/md/`);
  }
});
