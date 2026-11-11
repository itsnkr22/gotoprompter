// Public API — docs/ENGINE_SPEC.md §1.

/** Revision of docs/ENGINE_SPEC.md this package implements. Bumped when the spec changes. */
export const ENGINE_SPEC_VERSION = 1;

export type {
  AutoScrollMode,
  AutoScrollerOptions,
  CommandName,
  CommandResult,
  CommandState,
  EngineState,
  LanguageEntry,
  MatchResult,
  MatcherOptions,
  ScriptToken,
  TokenKind,
  TokenizeOptions,
} from './types.js';

export { tokenize } from './tokenizer.js';
export { Matcher, SPOKEN_WINDOW, FAR_BACKWARD_DISTANCE } from './matcher.js';
export { detectCommand, commandTargetIndex, createCommandState } from './commands.js';
export {
  AutoScroller,
  wordCost,
  DEFAULT_SOUND_HOLD_MS,
  CHARS_PER_WORD,
  MIN_WORD_COST,
  EMPTY_WORD_COST,
} from './autoscroller.js';
export {
  paragraphBoundaries,
  navigateParagraph,
  firstSpeakable,
  lastSpeakable,
  nextSpeakable,
  prevSpeakable,
} from './navigation.js';
export {
  cleanWord,
  splitSpoken,
  segmentIfNeeded,
  needsSegmentation,
  isEmoji,
  isSentenceEnd,
  languageOf,
} from './text.js';
export {
  LANGUAGES_AUTO,
  LANGUAGES_MANUAL,
  ALL_LANGUAGES,
  ISO_TO_LOCALE,
  ISO3_TO_ISO1,
  DEFAULT_LOCALE,
  resolveLanguage,
  languageById,
} from './languages.js';
export { STOPWORDS_EN, STOPWORDS_GENERIC, DEFAULT_STOPWORDS, isStopword } from './stopwords.js';
export { replayScenario } from './harness.js';
export type { Scenario, ScenarioEvent, ScenarioOptions, ReplayResult } from './harness.js';
