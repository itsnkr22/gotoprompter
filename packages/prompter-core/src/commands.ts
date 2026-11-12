// Voice commands from docs/ENGINE_SPEC.md §5.
import { lastSpeakable, navigateParagraph } from './navigation.js';
import { splitSpoken } from './text.js';
import type { CommandName, CommandResult, CommandState, ScriptToken } from './types.js';

/** Word spoken after "go" (optionally "go to" / "go to the") → command. */
export const COMMAND_KEYWORDS: Readonly<Record<string, CommandName>> = {
  start: 'go start',
  restart: 'go start',
  beginning: 'go start',
  top: 'go start',
  finish: 'go finish',
  end: 'go finish',
  bottom: 'go finish',
  next: 'go next',
  forward: 'go next',
  back: 'go back',
  previous: 'go back',
};

/** Longest phrase is "go to the <keyword>". */
export const MAX_COMMAND_WORDS = 4;

export interface CommandPhrase {
  command: CommandName;
  /** The words as spoken, e.g. ['go', 'to', 'the', 'end']. */
  words: string[];
}

/**
 * The command phrase the cleaned spoken words END with, or null.
 * Accepted forms: "go X", "go to X", "go the X", "go to the X", X being a COMMAND_KEYWORDS key.
 */
export function matchCommandPhrase(words: readonly string[]): CommandPhrase | null {
  const n = words.length;
  if (n < 2) return null;
  const command = COMMAND_KEYWORDS[words[n - 1]!];
  if (!command) return null;
  for (let len = 2; len <= Math.min(MAX_COMMAND_WORDS, n); len++) {
    const phrase = words.slice(n - len);
    if (phrase[0] !== 'go') continue;
    const filler = phrase.slice(1, -1);
    const ok =
      filler.length === 0 ||
      (filler.length === 1 && (filler[0] === 'to' || filler[0] === 'the')) ||
      (filler.length === 2 && filler[0] === 'to' && filler[1] === 'the');
    if (ok) return { command, words: phrase };
  }
  return null;
}

/** Context window around the reading position used for conflict suppression. */
const CONFLICT_BEFORE = 4;
const CONFLICT_AFTER = 10;

function containsSequence(haystack: readonly string[], needle: readonly string[]): boolean {
  outer: for (let j = 0; j + needle.length <= haystack.length; j++) {
    for (let k = 0; k < needle.length; k++) if (haystack[j + k] !== needle[k]) continue outer;
    return true;
  }
  return false;
}

export function createCommandState(): CommandState {
  return { armed: true };
}

/**
 * Call BEFORE Matcher.feedTranscript. Returns a command to execute, or null. Mutates state.armed.
 * If the script itself says the phrase near the reading position, it is script text, not a command.
 */
export function detectCommand(
  transcript: string,
  state: CommandState,
  tokens: readonly ScriptToken[],
  currentIndex: number,
  locale?: string,
): CommandResult {
  const phrase = matchCommandPhrase(splitSpoken(transcript, locale));
  if (!phrase) {
    state.armed = true;
    return null;
  }

  const lo = Math.max(0, currentIndex - CONFLICT_BEFORE);
  const hi = Math.min(tokens.length, currentIndex + CONFLICT_AFTER);
  const win: string[] = [];
  for (let i = lo; i < hi; i++) {
    const t = tokens[i]!;
    if (!t.skip) win.push(t.clean);
  }
  const keyword = phrase.words[phrase.words.length - 1]!;
  if (
    containsSequence(win, phrase.command.split(' ')) || // canonical bigram, e.g. go next
    containsSequence(win, ['go', keyword]) || // spoken alias, e.g. go forward
    containsSequence(win, phrase.words) // exactly as spoken, e.g. go to the end
  ) {
    state.armed = true;
    return null;
  }

  if (!state.armed) return null;
  state.armed = false;
  return { command: phrase.command };
}

/** Index a command moves to; the caller passes it to Matcher.setIndex. */
export function commandTargetIndex(
  command: CommandName,
  tokens: readonly ScriptToken[],
  currentIndex: number,
): number {
  switch (command) {
    case 'go start':
      return 0;
    case 'go finish':
      return Math.max(0, lastSpeakable(tokens));
    case 'go next':
      return navigateParagraph(tokens, currentIndex, 1);
    case 'go back':
      return navigateParagraph(tokens, currentIndex, -1);
  }
}
