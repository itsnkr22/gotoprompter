import { tokenize } from '@gotoprompter/prompter-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_CONFIRM_MS, PrompterController } from '../src/prompter/prompter-controller';
import { DEFAULT_SETTINGS } from '../src/state/settings';
import type { Settings } from '../src/state/settings';

function setup(script: string, overrides: Partial<Settings> = {}) {
  const container = document.createElement('div');
  const scrollEl = document.createElement('div');
  Object.defineProperty(scrollEl, 'clientHeight', { value: 600 });
  scrollEl.appendChild(container);
  document.body.appendChild(scrollEl);
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  const onIndexChange = vi.fn();
  const onCommand = vi.fn();
  const c = new PrompterController({
    container,
    scrollEl,
    getSettings: () => settings,
    onIndexChange,
    onCommand,
  });
  c.load(tokenize(script, { preserveFormatting: true }));
  return { c, container, scrollEl, settings, onIndexChange, onCommand };
}

describe('PrompterController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders spans with the right classes', () => {
    const { container } = setup('Hello [note] world\n🛑');
    const spans = container.querySelectorAll('span');
    expect(spans[0]!.className).toBe('vp-word vp-word-current');
    expect(spans[1]!.className).toBe('vp-word vp-note');
    expect(spans[2]!.className).toBe('vp-word vp-word-future');
    expect(spans[3]!.className).toBe('vp-break');
    expect(spans[4]!.className).toBe('vp-word vp-note');
  });

  it('starts at the first speakable token and reports index changes', () => {
    const { c, onIndexChange } = setup('[intro] one two');
    expect(c.index).toBe(1);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('setIndex clamps, skips notes, and touches only the changed range', () => {
    const { c, container } = setup('a b c d e');
    const spans = Array.from(container.querySelectorAll('span'));
    c.setIndex(3);
    expect(spans.map((s) => s.className.replace('vp-word ', ''))).toEqual([
      'vp-word-past',
      'vp-word-past',
      'vp-word-past',
      'vp-word-current',
      'vp-word-future',
    ]);
    c.setIndex(99);
    expect(c.index).toBe(4);
    c.setIndex(-1);
    expect(c.index).toBe(0);
  });

  it('tap on a word moves the index; taps on notes are ignored', () => {
    const { c, container } = setup('a [x] b c');
    container.querySelector<HTMLElement>('#w-3')!.click();
    expect(c.index).toBe(3);
    container.querySelector<HTMLElement>('#w-1')!.click();
    expect(c.index).toBe(3);
  });

  it('scrollToCurrent uses the active-line formula without animation', () => {
    const { c, container, scrollEl } = setup('a b c', {
      activeLinePosition: 35,
      smoothAnimations: false,
    });
    const span = container.querySelector<HTMLElement>('#w-2')!;
    Object.defineProperty(span, 'offsetTop', { value: 1000 });
    c.setIndex(2);
    expect(scrollEl.scrollTop).toBe(1000 - 600 * 0.35);
  });

  it('feedTranscript advances, routes commands when enabled, and navigates paragraphs', () => {
    const { c, settings } = setup('one two three.\nfour five six.');
    expect(c.feedTranscript('one')).toEqual({ type: 'near', index: 1 });
    settings.voiceCommandsEnabled = true;
    expect(c.feedTranscript('go next', true)).toEqual({ command: 'go next' });
    expect(c.index).toBe(4);
    c.navigateParagraph(-1);
    expect(c.index).toBe(0);
    c.step(1);
    expect(c.index).toBe(1);
    c.restart();
    expect(c.index).toBe(0);
  });

  describe('voice commands', () => {
    const SCRIPT = 'alpha beta gamma.\ndelta epsilon the zeta.\neta theta iota.';
    // alpha0 beta1 gamma.2 br3 delta4 epsilon5 the6 zeta.7 br8 eta9 theta10 iota.11
    const on = { voiceCommandsEnabled: true };

    it('holds an interim command, then runs it once the pause confirms it', () => {
      vi.useFakeTimers();
      try {
        const { c, onCommand } = setup(SCRIPT, on);
        expect(c.feedTranscript('go forward')).toEqual({ type: 'pending' });
        expect(c.index).toBe(0);
        vi.advanceTimersByTime(COMMAND_CONFIRM_MS - 1);
        expect(c.index).toBe(0);
        vi.advanceTimersByTime(1);
        expect(c.index).toBe(4);
        expect(onCommand).toHaveBeenCalledExactlyOnceWith('go next');
      } finally {
        vi.useRealTimers();
      }
    });

    it('a final result confirms at once, and repeats of the same phrase never fire twice', () => {
      vi.useFakeTimers();
      try {
        const { c, onCommand } = setup(SCRIPT, on);
        expect(c.feedTranscript('go forward')).toEqual({ type: 'pending' });
        expect(c.feedTranscript('go forward')).toEqual({ type: 'pending' });
        expect(c.feedTranscript('go forward', true)).toEqual({ command: 'go next' });
        expect(c.feedTranscript('go forward', true)).toEqual({ type: 'none' });
        vi.advanceTimersByTime(COMMAND_CONFIRM_MS * 2);
        expect(c.index).toBe(4);
        expect(onCommand).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('drops the command when more words follow: it was speech', () => {
      vi.useFakeTimers();
      try {
        const { c, onCommand } = setup(SCRIPT, on);
        expect(c.feedTranscript('we should go back')).toEqual({ type: 'pending' });
        c.feedTranscript('we should go back to basics');
        vi.advanceTimersByTime(COMMAND_CONFIRM_MS * 2);
        expect(onCommand).not.toHaveBeenCalled();
        expect(c.index).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('words spoken before a command never move the script after it', () => {
      const { c } = setup(SCRIPT, on);
      c.setIndex(9);
      // "the" was said before the command; the paragraph we jump back to contains "the".
      expect(c.feedTranscript('eta the theta go back', true)).toEqual({ command: 'go back' });
      expect(c.index).toBe(4);
      expect(c.feedTranscript('eta the theta go back')).toEqual({ type: 'none' });
      expect(c.index).toBe(4);
      // The utterance continues: only the new words are matched.
      expect(c.feedTranscript('eta the theta go back delta')).toEqual({ type: 'near', index: 5 });
      // A new utterance is matched in full again.
      expect(c.feedTranscript('epsilon')).toEqual({ type: 'near', index: 6 });
    });

    it('cancelPendingCommand drops a held command; disabled commands are plain text', () => {
      vi.useFakeTimers();
      try {
        const { c, settings, onCommand } = setup(SCRIPT, on);
        c.feedTranscript('go to the end');
        c.cancelPendingCommand();
        vi.advanceTimersByTime(COMMAND_CONFIRM_MS * 2);
        expect(c.index).toBe(0);
        settings.voiceCommandsEnabled = false;
        expect(c.feedTranscript('go to the end', true)).toEqual({ type: 'none' });
        expect(onCommand).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('configureMatcher keeps the index and destroy clears the DOM', () => {
    const { c, container } = setup('a b c');
    c.setIndex(2);
    c.configureMatcher({ locale: 'en-US' });
    expect(c.index).toBe(2);
    c.destroy();
    expect(container.children).toHaveLength(0);
  });
});
