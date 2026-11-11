// Deterministic scenario replay used by the golden fixtures (docs/ENGINE_SPEC.md §10).
// Both the TypeScript and Swift test suites implement exactly these semantics.
import { AutoScroller } from './autoscroller.js';
import { commandTargetIndex, createCommandState, detectCommand } from './commands.js';
import { Matcher } from './matcher.js';
import { tokenize } from './tokenizer.js';
import type { AutoScrollMode, CommandName, ScriptToken } from './types.js';

export type ScenarioEvent =
  | { transcript: string }
  | { tap: number }
  | { command: CommandName }
  | { tick: number; sound?: boolean };

export interface ScenarioOptions {
  preserveFormatting?: boolean; // default true
  lookaheadWords?: number; // default 5
  voiceCommands?: boolean; // default true
  locale?: string;
  autoscroll?: { mode: AutoScrollMode; scrollSpeed: number; soundHoldMs?: number };
  /** Token boundaries depend on the platform word segmenter (CJK); the Swift suite compares loosely. */
  segmenterDependent?: boolean;
}

export interface Scenario {
  script: string;
  options?: ScenarioOptions;
  events: ScenarioEvent[];
}

export interface ReplayResult {
  tokens: ScriptToken[];
  expectIndexAfterEach: number[];
  expectResults: string[];
}

export function replayScenario(scenario: Scenario): ReplayResult {
  const o = scenario.options ?? {};
  const preserveFormatting = o.preserveFormatting ?? true;
  const tokenizeOpts =
    o.locale === undefined ? { preserveFormatting } : { preserveFormatting, locale: o.locale };
  const tokens = tokenize(scenario.script, tokenizeOpts);
  const matcherOpts =
    o.locale === undefined
      ? { lookaheadWords: o.lookaheadWords ?? 5 }
      : { lookaheadWords: o.lookaheadWords ?? 5, locale: o.locale };
  const matcher = new Matcher(tokens, matcherOpts);
  const cmdState = createCommandState();
  const voiceCommands = o.voiceCommands ?? true;
  const scroller = o.autoscroll
    ? new AutoScroller(
        tokens,
        () => matcher.currentIndex,
        (i) => matcher.setIndex(i),
        o.autoscroll,
      )
    : null;
  let now = 0;
  const indices: number[] = [];
  const results: string[] = [];

  for (const ev of scenario.events) {
    if ('transcript' in ev) {
      let handled = false;
      if (voiceCommands) {
        const cmd = detectCommand(ev.transcript, cmdState, tokens, matcher.currentIndex, o.locale);
        if (cmd) {
          matcher.setIndex(commandTargetIndex(cmd.command, tokens, matcher.currentIndex));
          results.push(`command:${cmd.command}`);
          handled = true;
        }
      }
      if (!handled) results.push(matcher.feedTranscript(ev.transcript).type);
    } else if ('tap' in ev) {
      matcher.setIndex(ev.tap);
      results.push('tap');
    } else if ('command' in ev) {
      matcher.setIndex(commandTargetIndex(ev.command, tokens, matcher.currentIndex));
      results.push(`command:${ev.command}`);
    } else {
      if (!scroller) throw new Error('tick event without autoscroll options');
      now += ev.tick;
      if (ev.sound) scroller.noteSound(now);
      results.push(scroller.tick(now, ev.tick) ? 'tick:advanced' : 'tick:held');
    }
    indices.push(matcher.currentIndex);
  }
  return { tokens, expectIndexAfterEach: indices, expectResults: results };
}
