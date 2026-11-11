// Navigation helpers from docs/ENGINE_SPEC.md §6.
import type { ScriptToken } from './types.js';

/** First index >= i whose token is not skipped, or tokens.length. */
export function nextSpeakable(tokens: readonly ScriptToken[], i: number): number {
  let p = Math.max(0, i);
  while (p < tokens.length && tokens[p]!.skip) p++;
  return p;
}

/** Last index <= i whose token is not skipped, or -1. */
export function prevSpeakable(tokens: readonly ScriptToken[], i: number): number {
  let p = Math.min(i, tokens.length - 1);
  while (p >= 0 && tokens[p]!.skip) p--;
  return p;
}

export function firstSpeakable(tokens: readonly ScriptToken[]): number {
  return nextSpeakable(tokens, 0);
}

/** Index of the last speakable token, or -1 when there is none. */
export function lastSpeakable(tokens: readonly ScriptToken[]): number {
  return prevSpeakable(tokens, tokens.length - 1);
}

/**
 * Indices of paragraph boundaries. Runs of consecutive break/stop tokens (ignoring skipped
 * tokens between them) collapse to the LAST index of the run. If there are none, sentence ends.
 */
export function paragraphBoundaries(tokens: readonly ScriptToken[]): number[] {
  const out: number[] = [];
  let inRun = false;
  for (const t of tokens) {
    if (t.kind === 'break' || t.kind === 'stop') {
      if (inRun) out[out.length - 1] = t.index;
      else {
        out.push(t.index);
        inRun = true;
      }
    } else if (!t.skip) {
      inRun = false;
    }
  }
  if (out.length > 0) return out;
  return tokens.filter((t) => !t.skip && t.isSentenceEnd).map((t) => t.index);
}

/**
 * Target index for "go next" (+1) / "go back" (-1). The caller passes the result to
 * Matcher.setIndex, which advances past skipped tokens.
 * "go back" first returns to the start of the current paragraph; when already there, to the
 * start of the previous one (like "previous track" in a music player).
 */
export function navigateParagraph(
  tokens: readonly ScriptToken[],
  currentIndex: number,
  dir: 1 | -1,
): number {
  if (tokens.length === 0) return 0;
  const b = paragraphBoundaries(tokens);
  if (dir === 1) {
    const next = b.find((i) => i >= currentIndex);
    const last = lastSpeakable(tokens);
    if (next === undefined) return Math.max(0, last);
    return Math.min(next + 1, Math.max(0, last));
  }
  const before = b.filter((i) => i < currentIndex);
  if (before.length === 0) return 0;
  const prevEnd = before[before.length - 1]!;
  const prevPrevEnd = before.length >= 2 ? before[before.length - 2]! : -1;
  const startOfCurrent = prevEnd + 1;
  return nextSpeakable(tokens, startOfCurrent) === currentIndex ? prevPrevEnd + 1 : startOfCurrent;
}
