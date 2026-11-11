// Post-build internal link checker (docs/spec/03-site.md §1.5). Usage: node scripts/check-links.mjs dist
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const htmlFiles = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f === 'app') continue; // the web app is checked by its own build
      walk(p);
    } else if (f.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

const attr =
  /<(?:a|img|source|video|link|script)\b[^>]*?\s(?:href|src|poster)=["']([^"'#?]+)[^"']*["']/gi;
const broken = [];
const exists = (url) => {
  const clean = url.replace(/^\//, '');
  const p = join(dist, clean);
  if (clean === '' || clean === 'app/') return true;
  if (existsSync(p)) return true;
  if (!clean.endsWith('/') && existsSync(join(dist, clean, 'index.html'))) return true;
  if (clean.endsWith('/') && existsSync(join(p, 'index.html'))) return true;
  return false;
};

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(attr)) {
    const url = m[1];
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    if (url.startsWith('/app/')) continue;
    if (!exists(url)) broken.push(`${file.slice(dist.length)} → ${url}`);
  }
}

if (broken.length) {
  console.error(`check-links: ${broken.length} broken internal link(s)`);
  for (const b of broken) console.error(`  ${b}`);
  process.exit(1);
}
console.log(`check-links: ${htmlFiles.length} pages, no broken internal links`);
