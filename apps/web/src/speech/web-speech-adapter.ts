// Web Speech API adapter (spec §7.2).
import { SpeechEmitter } from './types';
import type { SpeechAdapter, SpeechErrorCode } from './types';

/* Minimal typings for the (still prefixed) Web Speech API. */
interface SRResultAlt {
  transcript: string;
}
interface SRResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SRResultAlt;
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [index: number]: SRResult };
}
interface SRErrorEvent {
  error: string;
  message?: string;
}
interface SRInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRConstructor = new () => SRInstance;

declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

const ERROR_MAP: Record<string, SpeechErrorCode> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'service-not-allowed',
  'audio-capture': 'audio-capture',
  aborted: 'aborted',
  network: 'network',
  'language-not-supported': 'language-not-supported',
  'no-speech': 'no-speech',
};

export function getSpeechRecognitionCtor(): SRConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/** How long stop() may take before the instance is aborted and treated as ended. */
export const STOP_TIMEOUT_MS = 1500;

export class WebSpeechAdapter extends SpeechEmitter implements SpeechAdapter {
  readonly supported: boolean;
  private readonly Ctor: SRConstructor | undefined;
  private recognition: SRInstance | null = null;
  private locale = 'en-US';
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctor: SRConstructor | undefined = getSpeechRecognitionCtor()) {
    super();
    this.Ctor = ctor;
    this.supported = !!ctor;
  }

  get running(): boolean {
    return this.recognition !== null;
  }

  setLanguage(locale: string): void {
    if (locale === this.locale) return;
    this.locale = locale;
    if (this.recognition) {
      this.stop();
      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        try {
          this.start();
        } catch {
          /* host restarts via onEnd */
        }
      }, 400);
    }
  }

  start(): void {
    if (!this.Ctor) throw new Error('SpeechRecognition unsupported');
    if (this.recognition) throw new Error('already started');
    // A new instance per start: Safari misbehaves when one is reused after an error.
    const r = new this.Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = this.locale;
    // Every handler ignores events from an instance that is no longer the current one.
    r.onresult = (e) => {
      if (this.recognition !== r) return;
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++)
        text += e.results[i]?.[0]?.transcript ?? '';
      const last = e.results[e.results.length - 1];
      this.emitTranscript({ text, isFinal: !!last?.isFinal });
    };
    r.onerror = (e) => {
      if (this.recognition !== r) return;
      this.emitError(ERROR_MAP[e.error] ?? 'unknown', e);
    };
    r.onend = () => {
      if (this.recognition !== r) return;
      this.finish(r);
    };
    this.recognition = r;
    try {
      r.start();
    } catch (err) {
      this.recognition = null;
      throw err;
    }
  }

  stop(): void {
    const r = this.recognition;
    if (!r) return;
    try {
      r.stop();
    } catch {
      /* ignore */
    }
    // Some engines never fire `end` after stop(); abort and report the end ourselves.
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => {
      this.stopTimer = null;
      if (this.recognition !== r) return;
      try {
        r.abort();
      } catch {
        /* ignore */
      }
      this.finish(r);
    }, STOP_TIMEOUT_MS);
  }

  private finish(r: SRInstance): void {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    this.recognition = null;
    this.emitEnd();
  }
}
