// Autoscroller (Sound & Constant modes) from docs/ENGINE_SPEC.md §7.
import { nextSpeakable } from './navigation.js';
import type { AutoScrollerOptions, ScriptToken } from './types.js';

export const DEFAULT_SOUND_HOLD_MS = 250;
/** Chars per "word" unit: scrollSpeed (words/s) × 5 = chars/s. */
export const CHARS_PER_WORD = 5;
export const MIN_WORD_COST = 3;
export const EMPTY_WORD_COST = 5;

export function wordCost(token: ScriptToken): number {
  return Math.max(MIN_WORD_COST, token.clean.length || EMPTY_WORD_COST);
}

export class AutoScroller {
  private accumulator = 0;
  private lastSoundAt = -Infinity;

  constructor(
    private readonly tokens: readonly ScriptToken[],
    private readonly getIndex: () => number,
    private readonly setIndex: (i: number) => void,
    private opts: AutoScrollerOptions,
  ) {}

  get mode(): AutoScrollerOptions['mode'] {
    return this.opts.mode;
  }

  get scrollSpeed(): number {
    return this.opts.scrollSpeed;
  }

  reset(): void {
    this.accumulator = 0;
    this.lastSoundAt = -Infinity;
  }

  setSpeed(wordsPerSecond: number): void {
    this.opts = { ...this.opts, scrollSpeed: wordsPerSecond };
  }

  setMode(mode: AutoScrollerOptions['mode']): void {
    this.opts = { ...this.opts, mode };
    this.reset();
  }

  /** Record that sound above threshold was detected at `nowMs`. */
  noteSound(nowMs: number): void {
    this.lastSoundAt = nowMs;
  }

  /** Advance for an elapsed slice. Returns true if the index changed. Hosts call every 100 ms. */
  tick(nowMs: number, elapsedMs: number): boolean {
    let idx = this.getIndex();
    if (idx >= this.tokens.length) return false;
    const hold = this.opts.soundHoldMs ?? DEFAULT_SOUND_HOLD_MS;
    if (this.opts.mode === 'sound' && nowMs - this.lastSoundAt > hold) return false;
    this.accumulator += (elapsedMs / 1000) * this.opts.scrollSpeed * CHARS_PER_WORD;
    let advanced = false;
    while (idx < this.tokens.length) {
      const cost = wordCost(this.tokens[idx]!);
      if (this.accumulator < cost) break;
      this.accumulator -= cost;
      idx = nextSpeakable(this.tokens, idx + 1); // skipped tokens are free
      advanced = true;
    }
    if (advanced) this.setIndex(idx);
    return advanced;
  }
}
