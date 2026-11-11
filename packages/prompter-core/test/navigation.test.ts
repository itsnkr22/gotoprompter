import { describe, expect, it } from 'vitest';
import {
  firstSpeakable,
  lastSpeakable,
  navigateParagraph,
  nextSpeakable,
  paragraphBoundaries,
  prevSpeakable,
} from '../src/navigation.js';
import { tokenize } from '../src/tokenizer.js';

const P = 'one two.\nthree four.\n\nfive six.';

describe('speakable helpers', () => {
  it('next/prev/first/last skip skipped tokens', () => {
    const t = tokenize('[n] a [n] b [n]', { preserveFormatting: true });
    expect(firstSpeakable(t)).toBe(1);
    expect(lastSpeakable(t)).toBe(3);
    expect(nextSpeakable(t, 2)).toBe(3);
    expect(nextSpeakable(t, 4)).toBe(t.length);
    expect(prevSpeakable(t, 2)).toBe(1);
    expect(prevSpeakable(t, 0)).toBe(-1);
    expect(lastSpeakable([])).toBe(-1);
  });
});

describe('paragraphBoundaries', () => {
  it('merges runs of breaks to the last index', () => {
    const t = tokenize(P, { preserveFormatting: true });
    // tokens: one two. | br | three four. | br br | five six.
    expect(paragraphBoundaries(t)).toEqual([2, 6]);
  });
  it('uses stops when formatting is collapsed', () => {
    const t = tokenize(P, { preserveFormatting: false });
    expect(paragraphBoundaries(t)).toEqual([2, 5]);
  });
  it('falls back to sentence ends when there are no breaks', () => {
    const t = tokenize('a b. c d! e f? g', { preserveFormatting: true });
    expect(paragraphBoundaries(t)).toEqual([1, 3, 5]);
  });
  it('ignores skipped tokens between breaks', () => {
    const t = tokenize('a\n[x]\nb', { preserveFormatting: true });
    expect(paragraphBoundaries(t)).toEqual([3]);
  });
});

describe('navigateParagraph', () => {
  const t = tokenize(P, { preserveFormatting: true }); // indices: one0 two.1 br2 three3 four.4 br5 br6 five7 six.8
  it('go next moves to the token after the next boundary', () => {
    expect(navigateParagraph(t, 0, 1)).toBe(3);
    expect(navigateParagraph(t, 3, 1)).toBe(7);
  });
  it('go next at the last paragraph clamps to the last speakable token', () => {
    expect(navigateParagraph(t, 7, 1)).toBe(8);
  });
  it('go back returns to the start of the current paragraph first', () => {
    expect(navigateParagraph(t, 8, -1)).toBe(7);
    expect(navigateParagraph(t, 4, -1)).toBe(3);
  });
  it('go back at the start of a paragraph goes to the previous paragraph start', () => {
    expect(navigateParagraph(t, 7, -1)).toBe(3);
    expect(navigateParagraph(t, 3, -1)).toBe(0);
    expect(navigateParagraph(t, 0, -1)).toBe(0);
  });
  it('handles empty token lists', () => {
    expect(navigateParagraph([], 0, 1)).toBe(0);
  });
});
