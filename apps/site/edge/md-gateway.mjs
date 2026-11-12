// Markdown gateway (docs/spec/03-site.md §8), run by the root middleware.js on Vercel.
// The build (scripts/ai-files.mjs) writes one Markdown file per public page under /_md/; this module
// serves them at:
//   • /<page>.md               /pricing.md → /_md/pricing.md, /index.md → the homepage
//   • /api/md/<page>/          /api/md/pricing/, /api/md/ → the homepage, /api/md/_catalog/ → catalog
//                              (trailing slash: the site redirects slashless paths before this runs)
//   • /<page>/ + Accept        only when text/markdown outranks text/html (see prefersMarkdown)
// Everything else returns null and the static site answers as usual. Pure Web APIs, so it runs in
// Node tests and in Vercel's runtime alike.
import brand from '../../../packages/config/brand.json' with { type: 'json' };

const SITE = `https://${brand.APP_DOMAIN}`;
/** Page paths are lowercase slugs; anything else (dots, encoded characters) is not a page. */
const SAFE = /^\/(?:[a-z0-9_-]+\/)*$/;
const MD_ROOT = '/_md';
const DESCRIBED_BY = ['/llms.txt', '/llms-full.txt', '/ai.txt']
  .map((p) => `<${p}>; rel="describedby"; type="text/plain"`)
  .join(', ');

/**
 * Pages that may answer `Accept: text/markdown`: an explicit allowlist of content routes. A route
 * here still falls back to HTML when the build wrote no Markdown for it (noindex pages, or the Mac
 * pages while the Mac app is off). build.test.mjs fails if a sitemap page is missing.
 */
export const CONTENT_ROUTES = [
  /^\/$/,
  /^\/(web|pricing|support|changelog|about|privacy|terms|refund-policy|download|license)\/?$/,
  /^\/mac(\/[a-z0-9-]+)?\/?$/,
  /^\/blog(\/[a-z0-9-]+)?\/?$/,
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Location, Link, X-Markdown-Tokens, Last-Modified',
};

/** q-value of the most specific Accept entry matching `type`, and its position (-1 if none). */
function match(entries, type) {
  const [major] = type.split('/');
  let best = { q: 0, rank: -1, index: -1 };
  entries.forEach((e, index) => {
    const rank = e.type === type ? 3 : e.type === `${major}/*` ? 2 : e.type === '*/*' ? 1 : 0;
    if (rank > best.rank && rank > 0) best = { q: e.q, rank, index };
  });
  return best;
}

/**
 * True when the client wants Markdown more than HTML. text/markdown must be named explicitly
 * (never via `*\/*` or `text/*`) and must have a higher q than text/html, or the same q and come
 * first. A missing header, `*\/*` or a browser's usual Accept always get HTML.
 */
export function prefersMarkdown(accept) {
  if (!accept) return false;
  const entries = accept.split(',').map((part) => {
    const [type, ...params] = part.trim().toLowerCase().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const value = q ? Number(q.slice(2)) : 1;
    return { type: type.trim(), q: Number.isFinite(value) ? value : 0 };
  });
  const md = entries.findIndex((e) => e.type === 'text/markdown');
  if (md === -1 || entries[md].q <= 0) return false;
  const html = match(entries, 'text/html');
  if (entries[md].q !== html.q) return entries[md].q > html.q;
  return html.index === -1 || md < html.index;
}

/** "/" → "/index.md", "/blog/x/" → "/blog/x.md" (the page path is normalised to a trailing slash). */
const fileFor = (pagePath) =>
  pagePath === '/' ? `${MD_ROOT}/index.md` : `${MD_ROOT}${pagePath.replace(/\/$/, '')}.md`;

/** Works out which Markdown file a request is for, or null when it is not a Markdown request. */
export function resolve(pathname, accept) {
  const t = target(pathname, accept);
  if (t && t.page && !SAFE.test(t.page)) return { ...t, file: null };
  return t;
}

function target(pathname, accept) {
  if (pathname === '/api/md' || pathname.startsWith('/api/md/')) {
    const rest = pathname.slice('/api/md'.length).replace(/^\/+|\/+$/g, '');
    if (rest === '_catalog')
      return {
        file: `${MD_ROOT}/_catalog.md`,
        canonical: `${SITE}/api/md/_catalog/`,
        negotiated: false,
      };
    const page = rest ? `/${rest}/` : '/';
    return { page, file: fileFor(page), canonical: `${SITE}${page}`, negotiated: false };
  }
  if (pathname.endsWith('.md')) {
    const stem = pathname.slice(0, -'.md'.length);
    const page = stem === '/index' ? '/' : `${stem}/`;
    return { page, file: fileFor(page), canonical: `${SITE}${page}`, negotiated: false };
  }
  if (CONTENT_ROUTES.some((r) => r.test(pathname)) && prefersMarkdown(accept)) {
    const page = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return { page, file: fileFor(page), canonical: `${SITE}${page}`, negotiated: true };
  }
  return null;
}

function headers(body, { canonical, negotiated, lastModified, status }) {
  const h = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'X-Markdown-Tokens': String(Math.ceil(body.length / 4)),
    'X-Robots-Tag': 'noindex, follow',
    'Cache-Control':
      status === 200
        ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
        : 'public, max-age=0, s-maxage=60',
    Vary: 'Accept',
    Link: canonical ? `<${canonical}>; rel="canonical", ${DESCRIBED_BY}` : DESCRIBED_BY,
    ...CORS,
  };
  if (canonical) h['Content-Location'] = canonical;
  if (lastModified) h['Last-Modified'] = lastModified;
  if (!negotiated) delete h.Vary;
  return h;
}

const notFound = (pathname) =>
  `# Not found\n\n> There is no Markdown version of ${pathname}.\n\nEvery page that has one is listed at ${SITE}/api/md/_catalog/ and ${SITE}/llms.txt.\n`;

/**
 * Handles a request. Returns a Response for Markdown requests, or null to let the static site
 * answer. `fetchFile(url)` loads a built file; in production it is a fetch of the same deployment.
 */
export async function handle(request, fetchFile) {
  const url = new URL(request.url);
  const target = resolve(url.pathname, request.headers.get('accept'));
  if (!target) return null;

  if (request.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: { ...CORS, 'Access-Control-Max-Age': '86400' },
    });
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (target.negotiated) return null;
    return new Response('# Method not allowed\n', {
      status: 405,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        Allow: 'GET, HEAD, OPTIONS',
        ...CORS,
      },
    });
  }

  const res = target.file ? await fetchFile(new URL(target.file, url.origin)) : null;
  if (!res?.ok) {
    if (target.negotiated) return null; // no Markdown for this page: serve its HTML
    const body = notFound(url.pathname);
    return new Response(request.method === 'HEAD' ? null : body, {
      status: 404,
      headers: headers(body, { status: 404 }),
    });
  }
  const body = await res.text();
  const h = headers(body, {
    ...target,
    lastModified: res.headers.get('last-modified'),
    status: 200,
  });
  return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: h });
}
