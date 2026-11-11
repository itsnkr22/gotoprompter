// Speech adapter contract (spec §7.1).

export interface TranscriptUpdate {
  text: string;
  isFinal: boolean;
}

export type SpeechErrorCode =
  | 'not-supported'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'audio-capture'
  | 'aborted'
  | 'network'
  | 'language-not-supported'
  | 'no-speech'
  | 'silent-fail'
  | 'unknown';

export interface SpeechAdapter {
  readonly supported: boolean;
  setLanguage(locale: string): void;
  /** Throws if already started. */
  start(): void;
  stop(): void;
  onTranscript(cb: (u: TranscriptUpdate) => void): () => void;
  onError(cb: (code: SpeechErrorCode, raw?: unknown) => void): () => void;
  onEnd(cb: () => void): () => void;
}

/** Minimal emitter shared by the real and fake adapters. */
export class SpeechEmitter {
  private transcriptCbs = new Set<(u: TranscriptUpdate) => void>();
  private errorCbs = new Set<(code: SpeechErrorCode, raw?: unknown) => void>();
  private endCbs = new Set<() => void>();

  onTranscript(cb: (u: TranscriptUpdate) => void): () => void {
    this.transcriptCbs.add(cb);
    return () => this.transcriptCbs.delete(cb);
  }
  onError(cb: (code: SpeechErrorCode, raw?: unknown) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }
  onEnd(cb: () => void): () => void {
    this.endCbs.add(cb);
    return () => this.endCbs.delete(cb);
  }
  protected emitTranscript(u: TranscriptUpdate): void {
    for (const cb of this.transcriptCbs) cb(u);
  }
  protected emitError(code: SpeechErrorCode, raw?: unknown): void {
    for (const cb of this.errorCbs) cb(code, raw);
  }
  protected emitEnd(): void {
    for (const cb of this.endCbs) cb();
  }
}
