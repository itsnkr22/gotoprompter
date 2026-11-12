import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadScript, resetApp } from '../src/script/load-script';
import { services } from '../src/services';
import { useHistoryStore } from '../src/state/history';
import { useRuntimeStore } from '../src/state/runtime';
import { DEFAULT_SETTINGS, useSettingsStore } from '../src/state/settings';

describe('loadScript', () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.setState({ items: [] });
    useRuntimeStore.getState().reset();
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
    services.controller = null;
    services.speech = null;
    services.tokens = [];
    services.pendingRestoreIndex = null;
  });

  it('ignores empty text', () => {
    expect(loadScript('   ')).toBe(false);
    expect(useRuntimeStore.getState().phase).toBe('setup');
  });

  it('saves history, detects the language, tokenizes and enters the prompter', () => {
    expect(loadScript('  bonjour tout le monde, comment allez vous aujourd hui  ')).toBe(true);
    const r = useRuntimeStore.getState();
    expect(r.phase).toBe('prompter');
    expect(r.selectedLanguage).toBe('fr-FR');
    expect(r.detectedLanguage).toBe('fr-FR');
    expect(useHistoryStore.getState().items[0]!.text).toBe(
      'bonjour tout le monde, comment allez vous aujourd hui',
    );
    expect(services.tokens.length).toBeGreaterThan(5);
  });

  it('shows the low-confidence toast and uses a manual language when set', () => {
    loadScript('asdf qwer zxcv');
    const toasts = useRuntimeStore.getState().toasts.map((t) => t.id);
    expect(toasts).toContain('langDetectionWarning');
    useRuntimeStore.getState().reset();
    useSettingsStore.getState().set('languageSetting', 'de-DE');
    loadScript('asdf qwer zxcv');
    expect(useRuntimeStore.getState().selectedLanguage).toBe('de-DE');
    expect(useRuntimeStore.getState().detectedLanguage).toBeNull();
  });

  it('restoreIndex reloads in place without saving history', () => {
    loadScript('one two three\nfour five six');
    const before = useHistoryStore.getState().items.length;
    const controller = { load: vi.fn(), setIndex: vi.fn(), scrollToCurrent: vi.fn(), index: 4 };
    services.controller = controller as unknown as typeof services.controller;
    loadScript('one two three\nfour five six', null, { restoreIndex: 4 });
    expect(useHistoryStore.getState().items.length).toBe(before);
    expect(controller.load).toHaveBeenCalled();
    expect(controller.setIndex).toHaveBeenCalledWith(4, { animate: false });
  });

  it('resetApp returns to setup and stops services', () => {
    const stop = vi.fn();
    services.speech = { stop, setLanguage: vi.fn() } as unknown as typeof services.speech;
    services.autoscroller = { stop } as unknown as typeof services.autoscroller;
    loadScript('hello there');
    useRuntimeStore.getState().toggleSettings(true);
    resetApp();
    expect(useRuntimeStore.getState().phase).toBe('setup');
    expect(useRuntimeStore.getState().settingsOpen).toBe(false);
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('resetApp turns the camera off and saves a recording in progress', async () => {
    const { recorder } = await import('../src/video/video-mode');
    const track = { stop: vi.fn(), readyState: 'live' };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const stopRecording = vi.spyOn(recorder, 'stop');
    vi.spyOn(recorder, 'recording', 'get').mockReturnValue(true);
    recorder.attach(stream);
    loadScript('hello there');
    useRuntimeStore.getState().enterVideo();
    resetApp();
    expect(stopRecording).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(recorder.stream).toBeNull();
    expect(useRuntimeStore.getState().videoMode).toBe(false);
    vi.restoreAllMocks();
  });
});
