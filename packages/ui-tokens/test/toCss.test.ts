import { describe, expect, it } from 'vitest';
import tokens from '../src/tokens.json' with { type: 'json' };
import { buildStylesheet, toCssVars } from '../src/toCss.ts';

describe('ui-tokens', () => {
  it('flattens groups into prefixed custom properties', () => {
    expect(toCssVars({ color: { accent: '#2DD4BF' } })).toEqual(['  --vp-color-accent: #2DD4BF;']);
  });

  it('ignores $-prefixed metadata and skipped groups', () => {
    expect(toCssVars({ $comment: 'x', 'color-light': { bg: '#fff' } }, ['color-light'])).toEqual(
      [],
    );
  });

  it('emits dark defaults and light overrides', () => {
    const css = buildStylesheet(tokens);
    expect(css).toContain(':root {');
    expect(css).toContain('--vp-color-accent: #2DD4BF;');
    expect(css).toMatch(/\[data-theme="light"\] \{\n {2}--vp-color-bg: #FFFFFF;/);
  });

  it('keeps the placeholder accent distinct from upstream yellow', () => {
    expect(tokens.color.accent.toUpperCase()).not.toBe('#FFBB00');
  });
});
