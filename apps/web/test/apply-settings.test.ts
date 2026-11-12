import { describe, expect, it } from 'vitest';
import { applySettingsToDom, effectiveTextLayout } from '../src/prompter/apply-settings';
import { DEFAULT_SETTINGS, useSettingsStore } from '../src/state/settings';

describe('text direction', () => {
  it("'auto' follows the script's language", () => {
    const s = { textDirection: 'auto', textAlign: 'left' } as const;
    expect(effectiveTextLayout(s, 'en-US')).toEqual({ direction: 'ltr', textAlign: 'left' });
    expect(effectiveTextLayout(s, undefined)).toEqual({ direction: 'ltr', textAlign: 'left' });
    for (const rtl of ['ar-SA', 'he-IL', 'fa-IR', 'ur-PK'])
      expect(effectiveTextLayout(s, rtl)).toEqual({ direction: 'rtl', textAlign: 'right' });
    expect(effectiveTextLayout({ textDirection: 'auto', textAlign: 'center' }, 'ar-SA')).toEqual({
      direction: 'rtl',
      textAlign: 'center',
    });
  });

  it('an explicit direction always wins and leaves the alignment alone', () => {
    expect(effectiveTextLayout({ textDirection: 'ltr', textAlign: 'left' }, 'ar-SA')).toEqual({
      direction: 'ltr',
      textAlign: 'left',
    });
    expect(effectiveTextLayout({ textDirection: 'rtl', textAlign: 'left' }, 'en-US')).toEqual({
      direction: 'rtl',
      textAlign: 'left',
    });
  });

  it('applies direction, alignment and both mirror classes to the DOM', () => {
    const scrollContainer = document.createElement('div');
    const scriptContent = document.createElement('div');
    const els = { appRoot: null, prompterContainer: null, scrollContainer, scriptContent };
    applySettingsToDom(
      { ...DEFAULT_SETTINGS, mirrorVertical: true, mirrorHorizontal: true },
      { ...els, language: 'he-IL' },
    );
    expect(scriptContent.style.direction).toBe('rtl');
    expect(scriptContent.style.textAlign).toBe('right');
    expect(scrollContainer).toHaveClass('vp-mirror-v', 'vp-mirror-h');
    applySettingsToDom(DEFAULT_SETTINGS, { ...els, language: 'en-US' });
    expect(scriptContent.style.direction).toBe('ltr');
    expect(scrollContainer).not.toHaveClass('vp-mirror-v');
    expect(scrollContainer).not.toHaveClass('vp-mirror-h');
  });

  it('keeps the camera visible in overlay video mode instead of repainting the background', () => {
    const scrollContainer = document.createElement('div');
    const els = { appRoot: null, prompterContainer: null, scrollContainer, scriptContent: null };
    applySettingsToDom(DEFAULT_SETTINGS, { ...els, overlayVideo: true });
    expect(scrollContainer.style.backgroundColor).toBe('');
    applySettingsToDom(DEFAULT_SETTINGS, els);
    expect(scrollContainer.style.backgroundColor).not.toBe('');
  });

  it("migrates a stored v1 'ltr' to 'auto' and keeps an explicit 'rtl'", async () => {
    const migrate = useSettingsStore.persist.getOptions().migrate!;
    const run = async (state: object, version: number): Promise<unknown> =>
      ((await migrate(state, version)) as { textDirection: string }).textDirection;
    expect(await run({ textDirection: 'ltr', fontSize: 50 }, 1)).toBe('auto');
    expect(await run({ textDirection: 'rtl' }, 1)).toBe('rtl');
    expect(await run({ textDirection: 'ltr' }, 2)).toBe('ltr');
  });
});
