import { tokenize } from '@gotoprompter/prompter-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoScroller } from '../src/scroll/autoscroller';
import { DEFAULT_SETTINGS } from '../src/state/settings';
import type { Settings } from '../src/state/settings';

function fakeController(script: string) {
  const tokens = tokenize(script, { preserveFormatting: true });
  let index = 0;
  return {
    tokens,
    get index() {
      return index;
    },
    get finished() {
      return index >= tokens.length;
    },
    setIndexFromScroller(i: number) {
      index = i;
    },
  };
}

describe('AutoScroller (web wrapper)', () => {
  const settings: Settings = { ...DEFAULT_SETTINGS, scrollingMode: 'constant', scrollSpeed: 6 };
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('advances in constant mode and calls onEnd at the end', async () => {
    const controller = fakeController('aaa bbb');
    const onEnd = vi.fn();
    const s = new AutoScroller({
      controller: () => controller as never,
      getSettings: () => settings,
      getAudioDeviceId: () => null,
      onEnd,
    });
    expect(await s.start()).toBe(true);
    expect(s.running).toBe(true);
    vi.advanceTimersByTime(1000); // 30 chars/s → both words
    expect(controller.index).toBe(2);
    expect(onEnd).toHaveBeenCalled();
    expect(s.running).toBe(false);
  });

  it('refuses to start in voice mode and when there is no controller', async () => {
    const s = new AutoScroller({
      controller: () => null,
      getSettings: () => settings,
      getAudioDeviceId: () => null,
      onEnd: vi.fn(),
    });
    expect(await s.start()).toBe(false);
    const s2 = new AutoScroller({
      controller: () => fakeController('a') as never,
      getSettings: () => ({ ...settings, scrollingMode: 'voice' }),
      getAudioDeviceId: () => null,
      onEnd: vi.fn(),
    });
    expect(await s2.start()).toBe(false);
  });

  it('returns false when the microphone is denied in sound mode', async () => {
    const soundSettings: Settings = { ...settings, scrollingMode: 'sound' };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const s = new AutoScroller({
      controller: () => fakeController('a b') as never,
      getSettings: () => soundSettings,
      getAudioDeviceId: () => null,
      onEnd: vi.fn(),
    });
    expect(await s.start()).toBe(false);
    expect(s.running).toBe(false);
  });

  it('stop() invalidates an in-flight start (session id)', async () => {
    const soundSettings: Settings = { ...settings, scrollingMode: 'sound' };
    let resolve!: (v: MediaStream) => void;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockReturnValue(new Promise<MediaStream>((r) => (resolve = r))),
      },
    });
    const s = new AutoScroller({
      controller: () => fakeController('a b') as never,
      getSettings: () => soundSettings,
      getAudioDeviceId: () => null,
      onEnd: vi.fn(),
    });
    const p = s.start();
    s.stop();
    const stream = { getTracks: () => [], getAudioTracks: () => [] } as unknown as MediaStream;
    // AudioContext is not available in jsdom; the gate's start would throw and start() returns false
    resolve(stream);
    expect(await p).toBe(false);
    expect(s.running).toBe(false);
  });
});
