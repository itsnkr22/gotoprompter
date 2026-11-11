// Imperative DOM controller for the prompter (spec §6.3). React never re-renders per word.
import {
  Matcher,
  commandTargetIndex,
  createCommandState,
  detectCommand,
  firstSpeakable,
  navigateParagraph,
  nextSpeakable,
  prevSpeakable,
} from '@gotoprompter/prompter-core';
import type {
  CommandName,
  CommandState,
  MatchResult,
  ScriptToken,
} from '@gotoprompter/prompter-core';
import { prefersReducedMotion } from '../platform';
import type { Settings } from '../state/settings';
import { installTapDelegation, renderTokens } from './render-tokens';

export interface ControllerOptions {
  container: HTMLElement;
  scrollEl: HTMLElement;
  getSettings: () => Settings;
  onIndexChange: (index: number) => void;
  onTap?: (index: number) => void;
}

export interface MatcherConfig {
  locale?: string;
}

export class PrompterController {
  private tokensValue: ScriptToken[] = [];
  private spans: HTMLElement[] = [];
  private matcher: Matcher | null = null;
  private cmdState: CommandState = createCommandState();
  private prevIndex = 0;
  private raf = 0;
  private locale: string | undefined;
  private readonly uninstallTap: () => void;

  constructor(private readonly opts: ControllerOptions) {
    this.uninstallTap = installTapDelegation(
      opts.container,
      () => this.tokensValue,
      (i) => {
        this.setIndex(i);
        opts.onTap?.(i);
      },
    );
  }

  get tokens(): ScriptToken[] {
    return this.tokensValue;
  }

  get index(): number {
    return this.matcher?.currentIndex ?? 0;
  }

  get finished(): boolean {
    return this.matcher?.isFinished() ?? true;
  }

  load(tokens: ScriptToken[], config: MatcherConfig = {}): void {
    this.tokensValue = tokens;
    this.locale = config.locale;
    this.spans = renderTokens(this.opts.container, tokens);
    this.buildMatcher(firstSpeakable(tokens));
    this.prevIndex = this.index;
    this.applyClasses(0, tokens.length - 1);
    this.opts.onIndexChange(this.index);
  }

  /** Rebuild the matcher (lookahead or locale change) keeping the current index. */
  configureMatcher(config: MatcherConfig = {}): void {
    if (config.locale !== undefined) this.locale = config.locale;
    if (!this.matcher) return;
    this.buildMatcher(this.index);
  }

  private buildMatcher(index: number): void {
    const settings = this.opts.getSettings();
    this.matcher = new Matcher(this.tokensValue, {
      lookaheadWords: settings.lookaheadWords,
      ...(this.locale ? { locale: this.locale } : {}),
    });
    this.matcher.setIndex(index);
    this.cmdState = createCommandState();
  }

  setIndex(i: number, opts: { animate?: boolean } = {}): void {
    if (!this.matcher) return;
    const max = Math.max(0, this.tokensValue.length - 1);
    this.matcher.setIndex(Math.min(Math.max(0, i), max));
    this.afterIndexChange(opts);
  }

  /** Move to the previous/next speakable token (ArrowUp/ArrowDown). */
  step(dir: 1 | -1): void {
    if (!this.matcher) return;
    const cur = this.index;
    const target =
      dir === 1
        ? nextSpeakable(this.tokensValue, cur + 1)
        : prevSpeakable(this.tokensValue, cur - 1);
    if (target < 0 || target >= this.tokensValue.length) return;
    this.setIndex(target);
  }

  restart(): void {
    this.setIndex(0);
  }

  navigateParagraph(dir: 1 | -1): void {
    this.setIndex(navigateParagraph(this.tokensValue, this.index, dir));
  }

  applyCommand(command: CommandName): void {
    this.setIndex(commandTargetIndex(command, this.tokensValue, this.index));
  }

  /**
   * Feed a recognition update. Returns the command executed or the match result.
   * Voice commands are only detected when enabled in settings (spec §7.3).
   */
  feedTranscript(text: string): { command: CommandName } | MatchResult {
    if (!this.matcher) return { type: 'none' };
    if (this.opts.getSettings().voiceCommandsEnabled) {
      const cmd = detectCommand(text, this.cmdState, this.tokensValue, this.index, this.locale);
      if (cmd) {
        this.applyCommand(cmd.command);
        return cmd;
      }
    }
    const result = this.matcher.feedTranscript(text);
    if (result.type === 'near' || result.type === 'jump') this.afterIndexChange({});
    return result;
  }

  /** Used by the autoscroller: set the index without clearing anything else. */
  setIndexFromScroller(i: number): void {
    if (!this.matcher) return;
    this.matcher.setIndex(i);
    this.afterIndexChange({});
  }

  private afterIndexChange(opts: { animate?: boolean }): void {
    this.updateHighlight();
    this.scrollToCurrent(opts);
    this.opts.onIndexChange(this.index);
  }

  updateHighlight(): void {
    const index = this.index;
    const lo = Math.min(this.prevIndex, index);
    const hi = Math.max(this.prevIndex, index);
    this.applyClasses(lo, hi);
    this.prevIndex = index;
  }

  private applyClasses(lo: number, hi: number): void {
    const index = this.index;
    for (let i = Math.max(0, lo); i <= Math.min(hi, this.spans.length - 1); i++) {
      const t = this.tokensValue[i];
      const span = this.spans[i];
      if (!t || !span || t.skip) continue;
      span.classList.remove('vp-word-past', 'vp-word-current', 'vp-word-future');
      span.classList.add(
        i < index ? 'vp-word-past' : i === index ? 'vp-word-current' : 'vp-word-future',
      );
    }
  }

  scrollToCurrent(opts: { animate?: boolean } = {}): void {
    const span = this.spans[this.index];
    if (!span) return;
    const settings = this.opts.getSettings();
    const el = this.opts.scrollEl;
    const target = Math.max(
      0,
      span.offsetTop - (el.clientHeight * settings.activeLinePosition) / 100,
    );
    const animate = (opts.animate ?? settings.smoothAnimations) && !prefersReducedMotion();
    this.cancelAnimation();
    if (animate) this.animateScroll(el, target, 600);
    else el.scrollTop = target;
  }

  private animateScroll(el: HTMLElement, target: number, duration: number): void {
    const start = el.scrollTop;
    const change = target - start;
    const t0 = performance.now();
    const frame = (now: number): void => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      el.scrollTop = start + change * ease;
      if (p < 1) this.raf = requestAnimationFrame(frame);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(frame);
  }

  private cancelAnimation(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  destroy(): void {
    this.cancelAnimation();
    this.uninstallTap();
    this.opts.container.replaceChildren();
    this.tokensValue = [];
    this.spans = [];
    this.matcher = null;
  }
}
