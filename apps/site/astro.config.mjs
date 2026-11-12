import { readFileSync } from 'node:fs';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import { wikiLinks } from './src/lib/wiki-links.ts';

const brand = JSON.parse(
  readFileSync(new URL('../../packages/config/brand.json', import.meta.url), 'utf8'),
);
const launch = JSON.parse(
  readFileSync(new URL('../../packages/config/launch.json', import.meta.url), 'utf8'),
);
const site = `https://${brand.APP_DOMAIN}`;
// While the Mac app is "coming soon", /download/ is a noindex placeholder and /license/ has no customers.
const macOnly = launch.macAvailable ? [] : ['/download/', '/license/'];

// docs/spec/03-site.md §1.4
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  server: { port: 4321 },
  integrations: [
    preact({ compat: false }),
    sitemap({
      filter: (page) =>
        !page.includes('/checkout/success/') &&
        !page.includes('/license/portal/') && // noindex
        !page.includes('/404') &&
        !macOnly.some((p) => new URL(page).pathname.startsWith(p)),
      changefreq: 'weekly',
      customPages: [`${site}/app/`],
    }),
  ],
  markdown: {
    processor: unified({ remarkPlugins: [wikiLinks], shikiConfig: { theme: 'github-dark' } }),
  },
});
