import { describe, expect, it } from 'vitest';
import { AutoScroller, wordCost } from '../src/autoscroller.js';
import { tokenize } from '../src/tokenizer.js';

function harness(script: string, opts: { mode: 'sound' | 'constant'; scrollSpeed: number }) {
  const tokens = tokenize(script, { preserveFormatting: true });
  let index = 0;
  const s = new AutoScroller(
    tokens,
    () => index,
    (i) => (index = i),
    opts,
  );
  return {
    tokens,
    s,
    get index() {
      return index;
    },
    set index(v: number) {
      index = v;
    },
  };
}

describe('wordCost', () => {
  it('is max(3, length) and 5 for empty clean', () => {
    const t = tokenize('a abcd —', { preserveFormatting: true });
    expect(wordCost(t[0]!)).toBe(3);
    expect(wordCost(t[1]!)).toBe(4);
    expect(wordCost(t[2]!)).toBe(5);
  });
});

describe('AutoScroller constant mode', () => {
  it('advances by accumulated characters at scrollSpeed*5 chars per second', () => {
    const h = harness('aaa bbb ccc ddd', { mode: 'constant', scrollSpeed: 2 }); // 10 chars/s
    // 100 ms → 1 char: no advance
    expect(h.s.tick(100, 100)).toBe(false);
    expect(h.s.tick(200, 100)).toBe(false);
    expect(h.s.tick(300, 100)).toBe(true); // 3 chars → first word (cost 3)
    expect(h.index).toBe(1);
    // 600 ms more → 6 chars → two more words
    expect(h.s.tick(900, 600)).toBe(true);
    expect(h.index).toBe(3);
  });

  it('skips skipped tokens for free and stops at the end', () => {
    const h = harness('aaa [note here] bbb', { mode: 'constant', scrollSpeed: 6 }); // 30 chars/s
    expect(h.s.tick(100, 100)).toBe(true); // 3 chars → past 'aaa' and the notes
    expect(h.index).toBe(3);
    h.s.tick(200, 100); // 3 more → past bbb → end
    expect(h.index).toBe(4);
    expect(h.s.tick(300, 100)).toBe(false);
  });

  it('setSpeed and reset work', () => {
    const h = harness('aaa bbb', { mode: 'constant', scrollSpeed: 1 });
    h.s.setSpeed(6);
    expect(h.s.scrollSpeed).toBe(6);
    h.s.tick(50, 50); // 1.5 chars
    h.s.reset();
    expect(h.s.tick(100, 50)).toBe(false); // accumulator cleared: 1.5 again < 3
  });
});

describe('AutoScroller sound mode', () => {
  it('holds while no sound was detected within 250 ms', () => {
    const h = harness('aaa bbb', { mode: 'sound', scrollSpeed: 6 });
    expect(h.s.tick(100, 100)).toBe(false);
    h.s.noteSound(100);
    expect(h.s.tick(200, 100)).toBe(true);
    expect(h.index).toBe(1);
    expect(h.s.tick(360, 160)).toBe(false); // 260 ms since sound → held, nothing accumulates
    h.s.noteSound(400);
    expect(h.s.tick(500, 100)).toBe(true);
  });
});
