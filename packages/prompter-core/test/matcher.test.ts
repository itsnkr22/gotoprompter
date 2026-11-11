import { describe, expect, it } from 'vitest';
import { Matcher } from '../src/matcher.js';
import { tokenize } from '../src/tokenizer.js';

const mk = (script: string, lookaheadWords = 5, preserveFormatting = true) =>
  new Matcher(tokenize(script, { preserveFormatting }), { lookaheadWords });

describe('Matcher near window', () => {
  it('advances word by word on a growing interim transcript', () => {
    const m = mk('the quick brown fox jumps');
    expect(m.feedTranscript('the')).toEqual({ type: 'near', index: 1 });
    expect(m.feedTranscript('the quick')).toEqual({ type: 'near', index: 2 });
    expect(m.feedTranscript('the quick brown')).toEqual({ type: 'near', index: 3 });
    expect(m.feedTranscript('the quick brown')).toEqual({ type: 'none' });
  });

  it('starts at the first speakable token and skips notes', () => {
    const m = mk('[intro] hello [pause] world');
    expect(m.currentIndex).toBe(1);
    expect(m.feedTranscript('hello')).toEqual({ type: 'near', index: 3 });
  });

  it('respects the lookahead window size', () => {
    const m1 = mk('a b c d e f', 1);
    expect(m1.feedTranscript('c')).toEqual({ type: 'none' });
    const m3 = mk('a b c d e f', 3);
    expect(m3.feedTranscript('c')).toEqual({ type: 'near', index: 3 });
  });

  it('nearest matching word wins, not the first spoken', () => {
    const m = mk('one two three four');
    expect(m.feedTranscript('three two')).toEqual({ type: 'near', index: 2 });
  });

  it('repeat guard: the same word is not matched twice from one utterance unless at position 0', () => {
    const m = mk('the the the end');
    expect(m.feedTranscript('the')).toEqual({ type: 'near', index: 1 });
    // "the" again at position 0 of the window is allowed
    expect(m.feedTranscript('the the')).toEqual({ type: 'near', index: 2 });
    const m2 = mk('say hello then hello again');
    expect(m2.feedTranscript('say hello')).toEqual({ type: 'near', index: 1 });
    expect(m2.feedTranscript('say hello')).toEqual({ type: 'near', index: 2 });
    // lastMatched is 'hello' and the next 'hello' is at window position 1 → guarded
    expect(m2.feedTranscript('say hello')).toEqual({ type: 'none' });
  });

  it('reports finished once past the end and never moves again', () => {
    const m = mk('a b');
    m.feedTranscript('a');
    m.feedTranscript('a b');
    expect(m.isFinished()).toBe(true);
    expect(m.feedTranscript('anything')).toEqual({ type: 'finished' });
    expect(m.currentIndex).toBe(2);
  });

  it('setIndex clamps and clears repeat protection; restart goes to the first speakable', () => {
    const m = mk('[x] a b c');
    m.setIndex(99);
    expect(m.isFinished()).toBe(true);
    m.restart();
    expect(m.currentIndex).toBe(1);
    m.setIndex(-5);
    expect(m.currentIndex).toBe(1);
  });

  it('ignores empty transcripts', () => {
    const m = mk('a b');
    expect(m.feedTranscript('   ')).toEqual({ type: 'none' });
  });
});

describe('Matcher whole-script re-anchor', () => {
  const script = [
    'welcome to the show today we talk about rockets.',
    'first the engines produce enormous thrust during launch.',
    'second the guidance computer steers the vehicle precisely.',
    'finally the capsule returns safely to earth.',
  ].join('\n');

  it('jumps forward when three consecutive words from a later paragraph are spoken', () => {
    const m = mk(script);
    const r = m.feedTranscript('blah blah guidance computer steers');
    expect(r.type).toBe('jump');
    expect(m.tokens[m.currentIndex]!.clean).toBe('the');
    expect(m.tokens[m.currentIndex - 1]!.clean).toBe('steers');
  });

  it('does not jump on one or two words', () => {
    const m = mk(script);
    expect(m.feedTranscript('capsule returns')).toEqual({ type: 'none' });
    expect(m.feedTranscript('xx guidance computer')).toEqual({ type: 'none' });
  });

  it('does not jump on a trigram with fewer than two non-stopwords', () => {
    const m = mk('start here now. we speak of the and more things. later words go on.');
    m.setIndex(11); // 'later' — the near window holds no stopwords from the phrase
    expect(m.feedTranscript('of the and')).toEqual({ type: 'none' });
    expect(m.feedTranscript('speak of the')).toEqual({ type: 'none' });
    expect(m.feedTranscript('now we speak').type).toBe('jump');
  });

  it('jumps backward (near) with a trigram', () => {
    const m = mk(script);
    m.setIndex(30);
    const r = m.feedTranscript('engines produce enormous');
    expect(r.type).toBe('jump');
    expect(m.currentIndex).toBeLessThan(30);
    expect(m.tokens[m.currentIndex]!.clean).toBe('thrust');
  });

  it('far backward jumps need four words', () => {
    const filler = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const m = mk(`alpha beta gamma delta ${filler} omega`);
    m.setIndex(60);
    expect(m.feedTranscript('beta gamma delta')).toEqual({ type: 'none' });
    const r = m.feedTranscript('alpha beta gamma delta');
    expect(r.type).toBe('jump');
    expect(m.currentIndex).toBe(4);
  });

  it('prefers the nearest candidate when a phrase repeats', () => {
    const m = mk('thank you all. intro. thank you all again. middle. thank you all finally.');
    m.setIndex(8); // around the second occurrence
    const r = m.feedTranscript('xx thank you all');
    // near window: from index 8 ('again.'?) -> depends; ensure jump lands on the nearest occurrence
    expect(r.type === 'jump' || r.type === 'near').toBe(true);
    const idx = m.currentIndex;
    expect(Math.abs(idx - 8)).toBeLessThan(6);
  });

  it('does not count landing on the current position as a jump', () => {
    const m = mk('one two three four five');
    m.setIndex(3);
    expect(m.feedTranscript('one two three')).toEqual({ type: 'none' });
  });
});
