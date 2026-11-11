// Pre-build: copy the built web app to public/app, write llms.txt and pricing.json from the shared
// config (docs/spec/03-site.md §1.5, §8). Fails loudly when apps/web is not built.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const webDist = fileURLToPath(new URL('../web/dist/', root));
const target = fileURLToPath(new URL('public/app/', root));
const brand = JSON.parse(readFileSync(new URL('../../packages/config/brand.json', root), 'utf8'));
const launch = JSON.parse(readFileSync(new URL('../../packages/config/launch.json', root), 'utf8'));

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

const { APP_NAME, APP_DOMAIN } = brand;
const macIntro = launch.macAvailable
  ? `> ${APP_NAME} is a voice-following teleprompter: a free, open-source web app and a paid Mac app. It scrolls as you speak by matching your words against the whole script, and on Mac it floats over every app while staying invisible in screen shares and recordings.

Key facts: whole-script voice tracking (pause, ad-lib, skip or go back), 34 languages on the web, 60+ on Mac, on-device speech recognition, no account, Mac app free for 3 scripts with Pro (yearly) and Lifetime (one-time) plans.`
  : `> ${APP_NAME} is a voice-following teleprompter: a free, open-source web app that scrolls as you speak by matching your words against the whole script. A Mac app that floats over every app and stays invisible in screen shares is coming soon; it is not available yet.

Key facts: whole-script voice tracking (pause, ad-lib, skip or go back), 34 languages, on-device speech recognition, offline PWA, no account, free. The Mac app (coming soon) is not for sale or download yet.`;
const llms = `# ${APP_NAME}

${macIntro}

## Product pages
- [Web app](https://${APP_DOMAIN}/web/): free browser teleprompter, offline PWA, mirror mode, video recording
- [Mac app](https://${APP_DOMAIN}/mac/): floating always-on-top window, hidden from Zoom, Meet, Teams, OBS and recordings
- [Pricing](https://${APP_DOMAIN}/pricing/)
${launch.macAvailable ? `- [Download](https://${APP_DOMAIN}/download/)\n` : ''}- [Zoom](https://${APP_DOMAIN}/mac/zoom/) · [Google Meet](https://${APP_DOMAIN}/mac/google-meet/) · [Microsoft Teams](https://${APP_DOMAIN}/mac/microsoft-teams/) · [Loom](https://${APP_DOMAIN}/mac/loom/) · [Riverside](https://${APP_DOMAIN}/mac/riverside/)

## Guides
- [Blog](https://${APP_DOMAIN}/blog/)
- [Support](https://${APP_DOMAIN}/support/)
- [Changelog](https://${APP_DOMAIN}/changelog/)
- [About](https://${APP_DOMAIN}/about/)
`;
writeFileSync(new URL('public/llms.txt', root), llms);
cpSync(
  fileURLToPath(new URL('../../packages/config/pricing.json', root)),
  fileURLToPath(new URL('public/pricing.json', root)),
);
console.log('wrote public/llms.txt and public/pricing.json');
