// Matcher from docs/ENGINE_SPEC.md §4.
import { nextSpeakable, prevSpeakable } from './navigation.js';
import { DEFAULT_STOPWORDS } from './stopwords.js';
import { splitSpoken } from './text.js';
import type { MatchResult, MatcherOptions, ScriptToken } from './types.js';

/** Number of most recent spoken tokens inspected per update. */
export const SPOKEN_WINDOW = 5;
/** Backward jumps farther than this need a 4-token match instead of 3. */
export const FAR_BACKWARD_DISTANCE = 40;

export class Matcher {
  readonly tokens: readonly ScriptToken[];
  /** Next token to be spoken; equals tokens.length when finished. */
  currentIndex = 0;
  /** Repeat protection: last clean word matched by the near window. */
  lastMatchedClean = '';

  private readonly opts: MatcherOptions;
  private readonly stopwords: ReadonlySet<string>;
  private readonly positions = new Map<string, number[]>();

  constructor(tokens: readonly ScriptToken[], opts: MatcherOptions) {
    this.tokens = tokens;
    this.opts = { ...opts, lookaheadWords: clampLookahead(opts.lookaheadWords) };
    this.stopwords = opts.stopwords ?? DEFAULT_STOPWORDS;
    for (const t of tokens) {
      if (t.skip || t.clean === '') continue;
      const list = this.positions.get(t.clean);
      if (list) list.push(t.index);
      else this.positions.set(t.clean, [t.index]);
    }
    this.setIndex(0);
  }

  get lookaheadWords(): number {
    return this.opts.lookaheadWords;
  }

  isFinished(): boolean {
    return this.currentIndex >= this.tokens.length;
  }

  /** Clamp, then advance past skipped tokens. Clears repeat protection. */
  setIndex(i: number): void {
    this.currentIndex = nextSpeakable(this.tokens, Math.max(0, i));
    this.lastMatchedClean = '';
  }

  restart(): void {
    this.setIndex(0);
  }

  /** Feed the latest transcript window (interim + final text of the current segment). */
  feedTranscript(transcript: string): MatchResult {
    if (this.isFinished()) return { type: 'finished' };
    const spoken = splitSpoken(transcript, this.opts.locale).slice(-SPOKEN_WINDOW);
    if (spoken.length === 0) return { type: 'none' };
    const near = this.matchNear(spoken);
    if (near) return near;
    return this.reanchor(spoken) ?? { type: 'none' };
  }

  // §4.1 — near-window match (fast path)
  private matchNear(spoken: readonly string[]): MatchResult | null {
    const spokenSet = new Set(spoken);
    let ptr = this.currentIndex;
    let checked = 0;
    while (ptr < this.tokens.length && checked < this.opts.lookaheadWords) {
      const t = this.tokens[ptr]!;
      if (t.skip) {
        ptr++;
        continue;
      }
      if (spokenSet.has(t.clean)) {
        if (t.clean === this.lastMatchedClean && checked > 0) {
          ptr++;
          checked++;
          continue;
        }
        this.lastMatchedClean = t.clean;
        this.currentIndex = nextSpeakable(this.tokens, ptr + 1);
        return { type: 'near', index: this.currentIndex };
      }
      ptr++;
      checked++;
    }
    return null;
  }

  // §4.2 — whole-script re-anchor (only when the near window fails)
  private reanchor(spoken: readonly string[]): MatchResult | null {
    const n = spoken.length;
    if (n < 3) return null;
    const tri = spoken.slice(n - 3) as [string, string, string];
    const nonStop = tri.filter((w) => !this.stopwords.has(w)).length;
    if (nonStop < 2) return null;
    const starts = this.positions.get(tri[0]) ?? [];
    let best: { r: number; dist: number } | null = null;
    for (const p of starts) {
      const q = nextSpeakable(this.tokens, p + 1);
      const r = nextSpeakable(this.tokens, q + 1);
      if (r >= this.tokens.length) continue;
      if (this.tokens[q]!.clean !== tri[1] || this.tokens[r]!.clean !== tri[2]) continue;
      const target = nextSpeakable(this.tokens, r + 1);
      if (target === this.currentIndex) continue; // already there: not a jump
      const dist = Math.abs(target - this.currentIndex);
      const backward = target < this.currentIndex;
      if (backward && dist > FAR_BACKWARD_DISTANCE) {
        if (n < 4) continue;
        const o = prevSpeakable(this.tokens, p - 1);
        if (o < 0 || this.tokens[o]!.clean !== spoken[n - 4]) continue;
      }
      if (!best || dist < best.dist) best = { r, dist };
    }
    if (!best) return null;
    const from = this.currentIndex;
    this.lastMatchedClean = tri[2];
    this.currentIndex = nextSpeakable(this.tokens, best.r + 1);
    return { type: 'jump', index: this.currentIndex, from };
  }
}

function clampLookahead(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, Math.round(n)));
}
