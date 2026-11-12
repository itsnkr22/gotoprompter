import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSpeechAdapter } from '../src/speech/fake-speech-adapter';
import {
  QUIET_RESTART_MS,
  RESTART_LIMIT,
  RETRY_MS,
  SILENT_FAIL_MS,
  START_RETRIES,
  SpeechSession,
} from '../src/speech/speech-session';
import { useRuntimeStore } from '../src/state/runtime';
import { DEFAULT_SETTINGS } from '../src/state/settings';

function make(opts: { supported?: boolean; online?: boolean } = {}) {
  const adapter = new FakeSpeechAdapter();
  adapter.supported = opts.supported ?? true;
  const controller = {
    feedTranscript: vi.fn().mockReturnValue({ type: 'near', index: 1 }),
    cancelPendingCommand: vi.fn(),
    configureMatcher: vi.fn(),
  };
  const onListeningChange = vi.fn();
  let now = 0;
  let online = opts.online ?? true;
  const session = new SpeechSession(adapter, {
    controller: () => controller as never,
    getSettings: () => ({ ...DEFAULT_SETTINGS }),
    runtime: () => useRuntimeStore.getState(),
    onListeningChange,
    now: () => now,
    isOnline: () => online,
  });
  return {
    adapter,
    controller,
    session,
    onListeningChange,
    tick: (ms: number) => (now += ms),
    setOnline: (b: boolean) => (online = b),
  };
}

const toastsInclude = (text: string): boolean =>
  useRuntimeStore.getState().toasts.some((t) => t.message.includes(text));

describe('SpeechSession', () => {
  beforeEach(() => {
    useRuntimeStore.getState().reset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('opens the unsupported modal when the API is missing', () => {
    const { session } = make({ supported: false });
    session.start();
    expect(useRuntimeStore.getState().openModal).toBe('browserUnsupported');
  });

  it('starts, forwards transcripts with their final flag, and stops', () => {
    const { session, adapter, controller, onListeningChange } = make();
    session.start();
    expect(onListeningChange).toHaveBeenLastCalledWith(true);
    adapter.emit('hello');
    expect(controller.feedTranscript).toHaveBeenCalledWith('hello', false);
    adapter.emit('hello there', true);
    expect(controller.feedTranscript).toHaveBeenLastCalledWith('hello there', true);
    session.stop();
    expect(onListeningChange).toHaveBeenLastCalledWith(false);
    expect(adapter.started).toBe(false);
    expect(controller.cancelPendingCommand).toHaveBeenCalled();
  });

  it('ignores a late transcript that arrives after stop', () => {
    const { session, adapter, controller } = make();
    session.start();
    adapter.emit('one');
    session.stop();
    adapter.emit('two');
    expect(controller.feedTranscript).toHaveBeenCalledTimes(1);
  });

  it('silent fail: an instant end with no result and no error opens the unsupported modal', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emitEnd();
    expect(useRuntimeStore.getState().openModal).toBe('browserUnsupported');
    expect(session.listening).toBe(false);
  });

  it('a first start that listened for a while and then ended is not a failure', () => {
    const { session, adapter, tick } = make();
    session.start();
    tick(SILENT_FAIL_MS + 1);
    adapter.emitEnd();
    expect(useRuntimeStore.getState().openModal).toBeNull();
    expect(session.listening).toBe(true);
    expect(adapter.startCount).toBe(2);
  });

  it('silence on the very first start keeps listening instead of blaming the browser', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emitError('no-speech');
    adapter.emitEnd();
    expect(useRuntimeStore.getState().openModal).toBeNull();
    expect(session.listening).toBe(true);
    expect(adapter.startCount).toBe(2);
  });

  it('first-start permission and device errors explain themselves without the modal', () => {
    const cases = [
      ['not-allowed', 'Microphone access was blocked'],
      ['service-not-allowed', 'Microphone access was blocked'],
      ['audio-capture', 'No microphone was found'],
    ] as const;
    for (const [code, text] of cases) {
      useRuntimeStore.getState().reset();
      const { session, adapter } = make();
      session.start();
      adapter.emitError(code);
      expect(useRuntimeStore.getState().openModal, code).toBeNull();
      expect(toastsInclude(text), code).toBe(true);
      expect(session.listening).toBe(false);
    }
    useRuntimeStore.getState().reset();
    const { session, adapter } = make();
    session.start();
    adapter.emitError('aborted');
    expect(useRuntimeStore.getState().openModal).toBeNull();
    expect(session.listening).toBe(false);
  });

  it('network error: unsupported modal when online and unproven, offline toast when offline', () => {
    const a = make();
    a.session.start();
    a.adapter.emitError('network');
    expect(useRuntimeStore.getState().openModal).toBe('browserUnsupported');

    useRuntimeStore.getState().reset();
    const b = make({ online: false });
    b.session.start();
    b.adapter.emitError('network');
    expect(useRuntimeStore.getState().openModal).toBeNull();
    expect(toastsInclude("You're offline")).toBe(true);
    expect(b.session.listening).toBe(false);

    useRuntimeStore.getState().reset();
    const c = make();
    c.session.start();
    c.adapter.emit('working');
    c.adapter.emitError('network'); // a blip while online: just restart
    c.adapter.emitEnd();
    expect(c.session.listening).toBe(true);
    expect(c.adapter.startCount).toBe(2);
  });

  it('an error loop is throttled and stops with a toast', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emit('first word');
    for (let i = 0; i < RESTART_LIMIT; i++) {
      adapter.emitError('unknown');
      adapter.emitEnd();
    }
    expect(adapter.startCount).toBe(1 + RESTART_LIMIT);
    adapter.emitError('unknown');
    adapter.emitEnd();
    expect(adapter.startCount).toBe(1 + RESTART_LIMIT);
    expect(toastsInclude('keeps stopping')).toBe(true);
    expect(session.listening).toBe(false);
  });

  it('repeated silence time-outs slow the restarts down but never stop listening', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emit('first word');
    for (let i = 0; i < RESTART_LIMIT; i++) adapter.emitEnd();
    expect(adapter.startCount).toBe(1 + RESTART_LIMIT);
    adapter.emitEnd(); // over the limit, but only silence: wait, then carry on
    expect(adapter.startCount).toBe(1 + RESTART_LIMIT);
    expect(session.listening).toBe(true);
    vi.advanceTimersByTime(QUIET_RESTART_MS);
    expect(adapter.startCount).toBe(2 + RESTART_LIMIT);
    expect(toastsInclude('keeps stopping')).toBe(false);
  });

  it('retries a start() that throws, then gives up with a toast', () => {
    const { session, adapter } = make();
    adapter.throwOnStart = new Error('InvalidStateError');
    session.start();
    expect(session.listening).toBe(true);
    expect(adapter.startCount).toBe(0);
    vi.advanceTimersByTime(RETRY_MS);
    expect(adapter.startCount).toBe(1);

    const b = make();
    b.adapter.start = () => {
      throw new Error('InvalidStateError');
    };
    b.session.start();
    vi.advanceTimersByTime(RETRY_MS * (START_RETRIES + 1));
    expect(b.session.listening).toBe(false);
    expect(toastsInclude('keeps stopping')).toBe(true);
  });

  it('stop then start in quick succession ends up listening', () => {
    const { session, adapter } = make();
    session.start();
    adapter.emit('x');
    // The engine has not finished shutting down when the user taps the mic again.
    adapter.stop = () => {};
    session.stop();
    session.start(); // adapter.start() throws "already started"
    expect(session.listening).toBe(true);
    adapter.emitEnd(); // the old session finally ends
    expect(adapter.started).toBe(true);
    expect(session.listening).toBe(true);
  });

  it('language-not-supported falls back to English with a toast', () => {
    const { session, adapter, controller } = make();
    session.start();
    adapter.emit('x');
    adapter.emitError('language-not-supported');
    expect(adapter.language).toBe('en-US');
    expect(useRuntimeStore.getState().selectedLanguage).toBe('en-US');
    expect(controller.configureMatcher).toHaveBeenCalledWith({ locale: 'en-US' });
    expect(toastsInclude('Switched to English')).toBe(true);
    adapter.emitEnd();
    expect(session.listening).toBe(true);
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
