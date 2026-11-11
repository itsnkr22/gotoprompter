// Data model and option types from docs/ENGINE_SPEC.md §1–§2, §4–§8.

export type TokenKind = 'word' | 'break' | 'stop';

export interface ScriptToken {
  /** Position in the token array. */
  index: number;
  /** Displayed text ('' for break, '🛑' for stop). */
  raw: string;
  /** Matching key: lowercase letters + digits only; '' when nothing remains. */
  clean: string;
  kind: TokenKind;
  /** Never matched by voice, never costs autoscroll time, never highlighted. */
  skip: boolean;
  /** Inside [square brackets]. */
  isNote: boolean;
  /** Raw ends a sentence (. ! ? 。 ！ ？ ؟ with optional closing quotes/brackets). */
  isSentenceEnd: boolean;
}

export interface TokenizeOptions {
  /** true: every '\n' becomes a break token; false: every run of '\n' becomes one stop token. */
  preserveFormatting: boolean;
  /** BCP-47 locale; enables word segmentation for scripts without spaces (CJK, Thai). */
  locale?: string;
}

export interface MatcherOptions {
  /** 1..10 — size of the near window (number of speakable tokens inspected). */
  lookaheadWords: number;
  locale?: string;
  /** Words that may not, on their own, trigger a whole-script jump. */
  stopwords?: ReadonlySet<string>;
}

export type MatchResult =
  | { type: 'near'; index: number }
  | { type: 'jump'; index: number; from: number }
  | { type: 'none' }
  | { type: 'finished' };

export type CommandName = 'go start' | 'go finish' | 'go next' | 'go back';
export type CommandResult = { command: CommandName } | null;

export interface CommandState {
  /** Initially true. Set to false after a command fires; re-armed when a non-command update arrives. */
  armed: boolean;
}

export type AutoScrollMode = 'sound' | 'constant';

export interface AutoScrollerOptions {
  mode: AutoScrollMode;
  /** Words per second, 1.0..6.0. */
  scrollSpeed: number;
  /** Sound mode: how long after the last detected sound scrolling keeps going. Default 250. */
  soundHoldMs?: number;
}

export interface LanguageEntry {
  /** BCP-47 recognition locale, e.g. 'en-US'. */
  id: string;
  /** English display name. */
  name: string;
  group: 'auto' | 'manual';
  /** ISO 639-1 code. */
  iso: string;
  rtl?: true;
}

/** Internal engine state shape (exposed for hosts that want to snapshot it). */
export interface EngineState {
  tokens: ScriptToken[];
  currentIndex: number;
  lastMatchedClean: string;
  recentSpoken: string[];
  commandArmed: boolean;
}
