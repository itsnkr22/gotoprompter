import { copyFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

// lastmod for blog posts comes from their front matter (`updated`, else `date`). Other pages get no
// lastmod: a build date on every URL would tell crawlers nothing changed is new.
const blogDir = new URL('./src/content/blog/', import.meta.url);
const postLastmod = Object.fromEntries(
  readdirSync(blogDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = readFileSync(new URL(f, blogDir), 'utf8').split('\n---')[0];
      const day = (key) => fm.match(new RegExp(`^${key}:\\s*(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
      return [`/blog/${f.slice(0, -3)}/`, day('updated') ?? day('date')];
    })
    .filter(([, d]) => d),
);

/** Also publish the single sitemap at /sitemap.xml, the path crawlers and SEO tools try first. */
const plainSitemap = () => ({
  name: 'plain-sitemap',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      copyFileSync(`${out}/sitemap-0.xml`, `${out}/sitemap.xml`);
    },
  },
});

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
      customPages: [`${site}/app/`],
      serialize: (item) => {
        const lastmod = postLastmod[new URL(item.url).pathname];
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    plainSitemap(),
  ],
  markdown: {
    processor: unified({ remarkPlugins: [wikiLinks], shikiConfig: { theme: 'github-dark' } }),
  },
});
