import { tokenize } from '@gotoprompter/prompter-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrompterController } from '../src/prompter/prompter-controller';
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
  const c = new PrompterController({
    container,
    scrollEl,
    getSettings: () => settings,
    onIndexChange,
  });
  c.load(tokenize(script, { preserveFormatting: true }));
  return { c, container, scrollEl, settings, onIndexChange };
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
    expect(c.feedTranscript('go next')).toEqual({ command: 'go next' });
    expect(c.index).toBe(4);
    c.navigateParagraph(-1);
    expect(c.index).toBe(0);
    c.step(1);
    expect(c.index).toBe(1);
    c.restart();
    expect(c.index).toBe(0);
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
