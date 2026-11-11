import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/tokenizer.js';

const words = (text: string, preserveFormatting = true) =>
  tokenize(text, { preserveFormatting }).map((t) => t.raw);

describe('tokenize', () => {
  it('returns no tokens for empty or whitespace input', () => {
    expect(tokenize('', { preserveFormatting: true })).toEqual([]);
    expect(tokenize('  \n\t ', { preserveFormatting: true })).toEqual([]);
  });

  it('numbers tokens sequentially and cleans words', () => {
    const t = tokenize('Hello, World! 42', { preserveFormatting: true });
    expect(t.map((x) => x.index)).toEqual([0, 1, 2]);
    expect(t.map((x) => x.clean)).toEqual(['hello', 'world', '42']);
    expect(t[0]!.isSentenceEnd).toBe(false);
    expect(t[1]!.isSentenceEnd).toBe(true);
    expect(t.every((x) => x.kind === 'word' && !x.skip)).toBe(true);
  });

  it('normalises CRLF and trims', () => {
    expect(words('a\r\nb\rc\n')).toEqual(['a', '', 'b', '', 'c']);
  });

  it('preserveFormatting=true: every newline is a break token, blank line = two breaks', () => {
    const t = tokenize('one\ntwo\n\nthree', { preserveFormatting: true });
    expect(t.map((x) => x.kind)).toEqual(['word', 'break', 'word', 'break', 'break', 'word']);
    expect(t.filter((x) => x.kind === 'break').every((x) => x.skip && x.raw === '')).toBe(true);
  });

  it('preserveFormatting=false: a run of newlines is one stop token', () => {
    const t = tokenize('one\ntwo\n\n\nthree', { preserveFormatting: false });
    expect(t.map((x) => x.kind)).toEqual(['word', 'stop', 'word', 'stop', 'word']);
    expect(t[1]!.raw).toBe('🛑');
    expect(t[1]!.skip).toBe(true);
  });

  it('marks bracket notes as skipped, inclusive of opening and closing pieces', () => {
    const t = tokenize('say [pause for a beat] this', { preserveFormatting: true });
    expect(t.map((x) => x.isNote)).toEqual([false, true, true, true, true, false]);
    expect(t.map((x) => x.skip)).toEqual([false, true, true, true, true, false]);
  });

  it('treats a piece containing a bracket as a note as a whole', () => {
    const t = tokenize('word[x] next', { preserveFormatting: true });
    expect(t[0]!.isNote).toBe(true);
    expect(t[1]!.isNote).toBe(false);
  });

  it('an unclosed bracket skips everything to the end', () => {
    const t = tokenize('[note that never closes\nmore text', { preserveFormatting: true });
    expect(t.filter((x) => x.kind === 'word').every((x) => x.skip && x.isNote)).toBe(true);
  });

  it('skips emoji pieces, including emoji inside a word', () => {
    const t = tokenize('great 🎉 wow🎉 fine', { preserveFormatting: true });
    expect(t.map((x) => x.skip)).toEqual([false, true, true, false]);
    expect(t[1]!.isNote).toBe(false);
  });

  it('skips punctuation-only pieces (empty clean)', () => {
    const t = tokenize('wait — then ... go', { preserveFormatting: true });
    expect(t.map((x) => x.skip)).toEqual([false, true, false, true, false]);
    expect(t[1]!.clean).toBe('');
  });

  it('detects sentence ends with trailing quotes and brackets', () => {
    const t = tokenize('"Done." (Really?) Yes!" Next', { preserveFormatting: true });
    expect(t.map((x) => x.isSentenceEnd)).toEqual([true, true, true, false]);
  });

  it('keeps Arabic letters in clean', () => {
    const t = tokenize('مرحبا بالعالم.', { preserveFormatting: true });
    expect(t[0]!.clean).toBe('مرحبا');
    expect(t[1]!.clean).toBe('بالعالم');
    expect(t[1]!.isSentenceEnd).toBe(true);
  });

  it('segments Japanese without spaces when the locale asks for it', () => {
    const t = tokenize('今日は晴れです。[間]明日も晴れ', {
      preserveFormatting: true,
      locale: 'ja-JP',
    });
    expect(t.length).toBeGreaterThan(3);
    const notes = t.filter((x) => x.isNote).map((x) => x.raw);
    expect(notes.join('')).toContain('間');
    expect(t.some((x) => x.isSentenceEnd)).toBe(true);
  });

  it('segments CJK text even without a locale when it dominates', () => {
    const t = tokenize('我今天很高兴', { preserveFormatting: true });
    expect(t.length).toBeGreaterThan(1);
  });

  it('does not segment Latin text with a Latin locale or no locale', () => {
    expect(words('hello world')).toEqual(['hello', 'world']);
    expect(tokenize('hello world', { preserveFormatting: true, locale: 'en-US' }).length).toBe(2);
  });
});
