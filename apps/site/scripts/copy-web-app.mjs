// Pre-build: copy the built web app to public/app and pricing.json from the shared config
// (docs/spec/03-site.md §1.5, §8). llms.txt, llms-full.txt and ai.txt are written after the build by
// scripts/ai-files.mjs. Fails loudly when apps/web is not built.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const webDist = fileURLToPath(new URL('../web/dist/', root));
const target = fileURLToPath(new URL('public/app/', root));

if (!existsSync(`${webDist}index.html`)) {
  console.error('apps/web is not built. Run pnpm --filter @gotoprompter/web build first.');
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(webDist, target, { recursive: true });
if (!existsSync(`${target}index.html`)) {
  console.error('copy failed: public/app/index.html is missing');
  process.exit(1);
}
const count = (dir) =>
  readdirSync(dir).reduce(
    (n, f) => n + (statSync(`${dir}/${f}`).isDirectory() ? count(`${dir}/${f}`) : 1),
    0,
  );
console.log(`copied web app: ${count(target)} files → public/app`);

cpSync(
  fileURLToPath(new URL('../../packages/config/pricing.json', root)),
  fileURLToPath(new URL('public/pricing.json', root)),
);
console.log('wrote public/pricing.json');
