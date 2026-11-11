// Builds dist/ from src/: tokens.css (CSS custom properties) and a typed JS module.
// Uses Node's built-in TypeScript type stripping, so no compiler step is needed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStylesheet } from '../src/toCss.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'src/tokens.json'), 'utf8'));
delete tokens.$comment;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/tokens.css'), buildStylesheet(tokens));
writeFileSync(
  join(root, 'dist/index.js'),
  `export const tokens = ${JSON.stringify(tokens, null, 2)};\n`,
);
writeFileSync(
  join(root, 'dist/index.d.ts'),
  `declare const tokens: ${JSON.stringify(tokens, null, 2)};\nexport { tokens };\n`,
);
