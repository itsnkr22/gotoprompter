// OG image rendering: satori → resvg → PNG (docs/spec/03-site.md §5.5).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { APP_NAME } from '../brand';

// Resolved from the package root: this module is bundled into dist/ at build time.
const fontRegular = readFileSync(join(process.cwd(), 'public/fonts/Inter-Regular.woff'));
const fontBold = readFileSync(join(process.cwd(), 'public/fonts/Inter-Bold.woff'));

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style, children },
});

export async function renderOg(opts: { title: string; subtitle: string }): Promise<Uint8Array> {
  const tree = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '1200px',
      height: '630px',
      background: '#000000',
      color: '#ffffff',
      padding: '64px',
      fontFamily: 'Inter',
    },
    [
      el('div', { width: '160px', height: '10px', background: '#2DD4BF', borderRadius: '5px' }),
      el(
        'div',
        {
          display: 'flex',
          fontSize: '64px',
          fontWeight: 700,
          lineHeight: 1.15,
          maxHeight: '300px',
          overflow: 'hidden',
        },
        opts.title,
      ),
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '28px',
          color: '#A1A1AA',
        },
        [
          el('div', { display: 'flex', fontWeight: 700, color: '#ffffff' }, APP_NAME),
          el('div', { display: 'flex' }, opts.subtitle),
        ],
      ),
    ],
  );
  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBold, weight: 700, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
