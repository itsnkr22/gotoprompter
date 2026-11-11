import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSpeechAdapter } from '../src/speech/fake-speech-adapter';
import { RESTART_LIMIT, SpeechSession } from '../src/speech/speech-session';
import { useRuntimeStore } from '../src/state/runtime';
import { DEFAULT_SETTINGS } from '../src/state/settings';

function make(opts: { supported?: boolean } = {}) {
  const adapter = new FakeSpeechAdapter();
  adapter.supported = opts.supported ?? true;
  const controller = { feedTranscript: vi.fn().mockReturnValue({ type: 'near', index: 1 }) };
  const onListeningChange = vi.fn();
  let now = 0;
  const session = new SpeechSession(adapter, {
    controller: () => controller as never,
    getSettings: () => ({ ...DEFAULT_SETTINGS }),
    runtime: () => useRuntimeStore.getState(),
    onListeningChange,
    now: () => now,
  });
  return { adapter, controller, session, onListeningChange, tick: (ms: number) => (now += ms) };
}

describe('SpeechSession', () => {
  beforeEach(() => useRuntimeStore.getState().reset());

  it('opens the unsupported modal when the API is missing', () => {
    const { session } = make({ supported: false });
    session.start();
    expect(useRuntimeStore.getState().openModal).toBe('browserUnsupported');
  });

  it('starts, forwards transcripts and stops', () => {
    const { session, adapter, controller, onListeningChange } = make();
    session.start();
    expect(onListeningChange).toHaveBeenLastCalledWith(true);
    adapter.emit('hello');
    expect(controller.feedTranscript).toHaveBeenCalledWith('hello');
    session.stop();
    expect(onListeningChange).toHaveBeenLastCalledWith(false);
    expect(adapter.started).toBe(false);
  });

  it('silent fail on first start (end with no result) opens the unsupported modal', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emitEnd();
    expect(useRuntimeStore.getState().openModal).toBe('browserUnsupported');
    expect(session.listening).toBe(false);
  });

  it('first-start errors in the legitimate list do not open the modal', () => {
    for (const code of [
      'not-allowed',
      'service-not-allowed',
      'audio-capture',
      'aborted',
    ] as const) {
      useRuntimeStore.getState().reset();
      const { session, adapter } = make();
      session.start();
      adapter.emitError(code);
      expect(useRuntimeStore.getState().openModal, code).toBeNull();
      expect(session.listening).toBe(false);
    }
    const { session, adapter } = make();
    session.start();
    adapter.emitError('network');
    expect(useRuntimeStore.getState().openModal).toBe('browserUnsupported');
  });

  it('restarts after end while listening and throttles runaway restarts', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emit('first word');
    for (let i = 0; i < RESTART_LIMIT; i++) adapter.emitEnd();
    expect(adapter.startCount).toBe(1 + RESTART_LIMIT);
    adapter.emitEnd();
    expect(adapter.startCount).toBe(1 + RESTART_LIMIT);
    expect(
      useRuntimeStore.getState().toasts.some((t) => t.message.includes('keeps stopping')),
    ).toBe(true);
    expect(session.listening).toBe(false);
  });

  it('language-not-supported falls back to English with a toast', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emit('x');
    adapter.emitError('language-not-supported');
    expect(adapter.language).toBe('en-US');
    expect(useRuntimeStore.getState().selectedLanguage).toBe('en-US');
    expect(
      useRuntimeStore.getState().toasts.some((t) => t.message.includes('Switched to English')),
    ).toBe(true);
  });

  it('a later aborted error blocks restarts', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emit('x');
    adapter.emitError('aborted');
    expect(session.listening).toBe(false);
    adapter.emitEnd();
    expect(adapter.startCount).toBe(1);
  });
});
