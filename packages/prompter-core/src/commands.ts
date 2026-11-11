// Voice commands from docs/ENGINE_SPEC.md §5.
import { lastSpeakable, navigateParagraph } from './navigation.js';
import { splitSpoken } from './text.js';
import type { CommandName, CommandResult, CommandState, ScriptToken } from './types.js';

const TWO: Readonly<Record<string, CommandName>> = {
  'go start': 'go start',
  'go finish': 'go finish',
  'go next': 'go next',
  'go back': 'go back',
};
const THREE: Readonly<Record<string, CommandName>> = {
  'go to start': 'go start',
  'go to finish': 'go finish',
  'go to next': 'go next',
  'go to back': 'go back',
};

/** Context window around the reading position used for conflict suppression. */
const CONFLICT_BEFORE = 4;
const CONFLICT_AFTER = 10;

export function createCommandState(): CommandState {
  return { armed: true };
}

/**
 * Call BEFORE Matcher.feedTranscript. Returns a command to execute, or null. Mutates state.armed.
 * If the script itself contains the command bigram near the reading position, it is script
 * text, not a command.
 */
export function detectCommand(
  transcript: string,
  state: CommandState,
  tokens: readonly ScriptToken[],
  currentIndex: number,
  locale?: string,
): CommandResult {
  const words = splitSpoken(transcript, locale);
  if (words.length < 2) {
    state.armed = true;
    return null;
  }
  const two = words.slice(-2).join(' ');
  const three = words.length >= 3 ? words.slice(-3).join(' ') : '';
  const cmd = TWO[two] ?? (three ? THREE[three] : undefined);
  if (!cmd) {
    state.armed = true;
    return null;
  }

  const bigram = cmd.split(' ');
  const lo = Math.max(0, currentIndex - CONFLICT_BEFORE);
  const hi = Math.min(tokens.length, currentIndex + CONFLICT_AFTER);
  const win: string[] = [];
  for (let i = lo; i < hi; i++) {
    const t = tokens[i]!;
    if (!t.skip) win.push(t.clean);
  }
  for (let j = 0; j + 1 < win.length; j++) {
    if (win[j] === bigram[0] && win[j + 1] === bigram[1]) {
      state.armed = true;
      return null;
    }
  }

  if (!state.armed) return null;
  state.armed = false;
  return { command: cmd };
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
