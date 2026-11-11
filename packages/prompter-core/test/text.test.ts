import { describe, expect, it } from 'vitest';
import {
  cleanWord,
  isEmoji,
  isSentenceEnd,
  needsSegmentation,
  segmentIfNeeded,
  splitSpoken,
} from '../src/text.js';

describe('text utilities', () => {
  it('cleanWord strips punctuation, lowercases and NFC-normalises', () => {
    expect(cleanWord('Hello,')).toBe('hello');
    expect(cleanWord("don't")).toBe('dont');
    expect(cleanWord('—')).toBe('');
    expect(cleanWord('Ünïcode')).toBe('ünïcode');
    expect(cleanWord('é')).toBe('é');
  });
  it('splitSpoken drops empties', () => {
    expect(splitSpoken('  Hello, —  world! ')).toEqual(['hello', 'world']);
  });
  it('emoji and sentence end detection', () => {
    expect(isEmoji('🎉')).toBe(true);
    expect(isEmoji('a')).toBe(false);
    expect(isSentenceEnd('end.')).toBe(true);
    expect(isSentenceEnd('end.")')).toBe(true);
    expect(isSentenceEnd('mid')).toBe(false);
    expect(isSentenceEnd('終わり。')).toBe(true);
    expect(isSentenceEnd('نعم؟')).toBe(true);
  });
  it('needsSegmentation follows the locale when known', () => {
    expect(needsSegmentation('hello', 'ja-JP')).toBe(true);
    expect(needsSegmentation('今日は', 'en-US')).toBe(false);
    expect(needsSegmentation('今日は晴れ', undefined)).toBe(true);
    expect(needsSegmentation('mostly latin 日', undefined)).toBe(false);
    expect(needsSegmentation('123', undefined)).toBe(false);
  });
  it('segmentIfNeeded keeps punctuation attached', () => {
    const out = segmentIfNeeded('今日は晴れです。', 'ja-JP');
    expect(out.endsWith('。')).toBe(true);
    expect(out.includes(' ')).toBe(true);
    expect(segmentIfNeeded('plain text', 'en-US')).toBe('plain text');
  });
});
