// Deterministic adapter for unit and e2e tests (spec §7.6).
import { SpeechEmitter } from './types';
import type { SpeechAdapter, SpeechErrorCode } from './types';

export class FakeSpeechAdapter extends SpeechEmitter implements SpeechAdapter {
  supported = true;
  started = false;
  language = 'en-US';
  startCount = 0;
  /** Set to make start() throw once (InvalidStateError simulation). */
  throwOnStart: Error | null = null;

  setLanguage(locale: string): void {
    this.language = locale;
  }

  start(): void {
    if (this.throwOnStart) {
      const e = this.throwOnStart;
      this.throwOnStart = null;
      throw e;
    }
    if (this.started) throw new Error('already started');
    this.started = true;
    this.startCount++;
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.emitEnd();
  }

  emit(text: string, isFinal = false): void {
    this.emitTranscript({ text, isFinal });
  }

  override emitError(code: SpeechErrorCode, raw?: unknown): void {
    super.emitError(code, raw);
  }

  override emitEnd(): void {
    this.started = false;
    super.emitEnd();
  }
}
