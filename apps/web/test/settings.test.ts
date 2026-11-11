import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SESSION_ONLY_KEYS,
  clampRange,
  clampSettings,
  useSettingsStore,
} from '../src/state/settings';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  });

  it('has the Registry A defaults', () => {
    expect(DEFAULT_SETTINGS.fontSize).toBe(40);
    expect(DEFAULT_SETTINGS.activeLinePosition).toBe(35);
    expect(DEFAULT_SETTINGS.scrollingMode).toBe('voice');
    expect(DEFAULT_SETTINGS.voiceCommandsEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.highlightActiveWord).toBe(true);
    expect(DEFAULT_SETTINGS.languageSetting).toBe('auto');
  });

  it('clampRange clamps and snaps to step', () => {
    expect(clampRange('fontSize', 500)).toBe(100);
    expect(clampRange('fontSize', 1)).toBe(20);
    expect(clampRange('margin', 9)).toBe(8);
    expect(clampRange('margin', 11)).toBe(12);
    expect(clampRange('lineHeight', 1.04)).toBe(1.0);
    expect(clampRange('scrollSpeed', 3.57)).toBe(3.6);
    expect(clampRange('lookaheadWords', Number.NaN)).toBe(5);
  });

  it('clampSettings validates enums, hex colours, language and drops unknown keys', () => {
    const out = clampSettings({
      fontSize: 72,
      textAlign: 'middle',
      fontFamily: 'dyslexic',
      textColor: 'red',
      bgColor: '#ABCDEF',
      languageSetting: 'xx-XX',
      lookaheadWords: 99,
      bogus: 1,
      preserveFormatting: 'yes',
    });
    expect(out.fontSize).toBe(72);
    expect(out.textAlign).toBe('left');
    expect(out.fontFamily).toBe('dyslexic');
    expect(out.textColor).toBe('#ffffff');
    expect(out.bgColor).toBe('#abcdef');
    expect(out.languageSetting).toBe('auto');
    expect(out.lookaheadWords).toBe(10);
    expect(out.preserveFormatting).toBe(true);
    expect('bogus' in out).toBe(false);
    expect(clampSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('does not persist session-only keys', async () => {
    useSettingsStore.getState().set('mirrorVertical', true);
    useSettingsStore.getState().set('fontSize', 60);
    await Promise.resolve();
    const raw = JSON.parse(localStorage.getItem('vp.settings.v1') ?? '{}') as {
      state: Record<string, unknown>;
    };
    for (const k of SESSION_ONLY_KEYS) expect(k in raw.state).toBe(false);
    expect(raw.state['fontSize']).toBe(60);
  });

  it('applyTheme and reset keep session-only values', () => {
    const s = useSettingsStore.getState();
    s.applyTheme('light');
    expect(useSettingsStore.getState().bgColor).toBe('#ffffff');
    s.set('screenRotated', true);
    s.set('fontSize', 80);
    s.reset();
    expect(useSettingsStore.getState().fontSize).toBe(40);
    expect(useSettingsStore.getState().screenRotated).toBe(true);
  });
});
