import { tokenize } from '@gotoprompter/prompter-core';
import { describe, expect, it, vi } from 'vitest';
import { PrompterController } from '../src/prompter/prompter-controller';
import { DEFAULT_SETTINGS } from '../src/state/settings';
import { __resetStorageForTests, safeLocalStorage } from '../src/state/storage';

function mount(script: string) {
  const container = document.createElement('div');
  const scrollEl = document.createElement('div');
  scrollEl.appendChild(container);
  document.body.appendChild(scrollEl);
  const c = new PrompterController({
    container,
    scrollEl,
    getSettings: () => DEFAULT_SETTINGS,
    onIndexChange: vi.fn(),
  });
  c.load(tokenize(script, { preserveFormatting: true }));
  return { c, container };
}

describe('edge cases', () => {
  it('a script of only notes renders, is finished, and never throws', () => {
    const { c, container } = mount('[note only] [another]');
    expect(container.querySelectorAll('.vp-note')).toHaveLength(3);
    expect(c.finished).toBe(true);
    expect(c.feedTranscript('note only')).toEqual({ type: 'finished' });
    expect(() => c.scrollToCurrent()).not.toThrow();
    expect(() => c.restart()).not.toThrow();
  });

  it('20,000 words render in one pass and a far setIndex touches only the delta', () => {
    const words = Array.from({ length: 20000 }, (_, i) => `w${i}`).join(' ');
    const t0 = performance.now();
    const { c, container } = mount(words);
    expect(container.children).toHaveLength(20000);
    c.setIndex(19999);
    expect(container.querySelector('#w-19999')).toHaveClass('vp-word-current');
    expect(container.querySelector('#w-0')).toHaveClass('vp-word-past');
    expect(performance.now() - t0).toBeLessThan(5000);
  });

  it('a 200-character word still matches on its clean form', () => {
    const long = 'x'.repeat(200);
    const { c } = mount(`start ${long} end`);
    c.feedTranscript('start');
    expect(c.feedTranscript(long)).toEqual({ type: 'near', index: 2 });
  });

  it('storage falls back to memory when localStorage throws', () => {
    __resetStorageForTests();
    const original = Storage.prototype.setItem;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    safeLocalStorage.setItem('k', 'v');
    expect(safeLocalStorage.getItem('k')).toBe('v');
    expect(warn).toHaveBeenCalledTimes(1);
    Storage.prototype.setItem = original;
    __resetStorageForTests();
    warn.mockRestore();
  });
});
