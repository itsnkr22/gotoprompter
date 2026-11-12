// Vercel Routing Middleware: serves the Markdown version of site pages (/pricing.md, /api/md/…,
// Accept: text/markdown). The logic and its tests live in apps/site/edge/md-gateway.mjs; this file
// only wires it to Vercel. Requests the gateway does not claim fall through to the static site.
import { next } from '@vercel/functions';
import { handle } from './apps/site/edge/md-gateway.mjs';

export const config = {
  // Keep in step with CONTENT_ROUTES in md-gateway.mjs (build.test.mjs checks both).
  matcher: [
    '/',
    '/((?!_md/|_astro/|app/).*\\.md)',
    '/api/md',
    '/api/md/:path*',
    '/:page(web|pricing|support|changelog|about|privacy|terms|refund-policy|download|license){/}?',
    '/:section(mac|blog){/:slug}?{/}?',
  ],
};

export default async function middleware(request) {
  const response = await handle(request, (url) => fetch(url));
  return response ?? next();
}
