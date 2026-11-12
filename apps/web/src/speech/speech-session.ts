// Owns start/stop, auto-restart, silent-fail detection and routing of transcripts (spec §7.3).
import { COPY } from '../modals/copy';
import { isIPad, isStandalone } from '../platform';
import type { PrompterController } from '../prompter/prompter-controller';
import type { RuntimeStore } from '../state/runtime';
import type { Settings } from '../state/settings';
import type { SpeechAdapter, SpeechErrorCode, TranscriptUpdate } from './types';

export interface SpeechSessionDeps {
  controller: () => PrompterController | null;
  getSettings: () => Settings;
  runtime: () => RuntimeStore;
  onListeningChange: (listening: boolean) => void;
  /** Injected for tests. */
  now?: () => number;
  /** Injected for tests; defaults to navigator.onLine. */
  isOnline?: () => boolean;
}

export const RESTART_LIMIT = 5;
export const RESTART_WINDOW_MS = 10_000;
/** A first start that ends sooner than this with no result and no error is a silent failure. */
export const SILENT_FAIL_MS = 3000;
/** Delay before retrying a start() that threw, and before a throttled quiet restart. */
export const RETRY_MS = 300;
export const QUIET_RESTART_MS = 1000;
export const START_RETRIES = 3;

export class SpeechSession {
  private wantListening = false;
  /** False until the engine has proved it works here (a result, or a plain "no speech"). */
  private verified = false;
  private blocked = false;
  private restartTimes: number[] = [];
  private startedAt = 0;
  /** Error reported since the last start, if any: decides how the following `end` is handled. */
  private lastError: SpeechErrorCode | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly now: () => number;
  private readonly isOnline: () => boolean;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(
    private readonly adapter: SpeechAdapter,
    private readonly deps: SpeechSessionDeps,
  ) {
    this.now = deps.now ?? (() => Date.now());
    this.isOnline =
      deps.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false);
    this.unsubscribe.push(
      adapter.onTranscript((u) => this.onTranscript(u)),
      adapter.onError((code) => this.onError(code)),
      adapter.onEnd(() => this.onEnd()),
    );
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
  }

  get listening(): boolean {
    return this.wantListening;
  }

  start(): void {
    if (!this.adapter.supported) {
      this.deps.runtime().openModalId('browserUnsupported');
      return;
    }
    if (this.wantListening) return;
    this.wantListening = true;
    this.blocked = false;
    this.restartTimes = [];
    this.deps.onListeningChange(true);
    // If the previous session is still winding down, start() throws; startAdapter retries.
    this.startAdapter(0);
  }

  stop(): void {
    this.stopInternal();
  }

  setLanguage(locale: string): void {
    this.adapter.setLanguage(locale);
  }

  destroy(): void {
    this.clearRetry();
    for (const u of this.unsubscribe) u();
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private stopInternal(): void {
    this.wantListening = false;
    this.clearRetry();
    this.adapter.stop();
    this.deps.controller()?.cancelPendingCommand();
    this.deps.onListeningChange(false);
  }

  /** start() can throw while the engine is still shutting down: retry a few times, then give up. */
  private startAdapter(attempt: number): void {
    this.clearRetry();
    if (!this.wantListening) return;
    try {
      this.adapter.start();
      this.startedAt = this.now();
      this.lastError = null;
    } catch {
      if (attempt >= START_RETRIES) {
        this.deps.runtime().showToast('generic', COPY.recognitionUnstable, 6000);
        this.stopInternal();
        return;
      }
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.startAdapter(attempt + 1);
      }, RETRY_MS);
    }
  }

  private onTranscript(u: TranscriptUpdate): void {
    this.verified = true;
    this.restartTimes = []; // real speech arrived: reset the restart throttle
    if (!this.wantListening) return; // a late result after stop must not move the script
    const controller = this.deps.controller();
    if (!controller) return;
    controller.feedTranscript(u.text, u.isFinal);
  }

  private onError(code: SpeechErrorCode): void {
    this.lastError = code;
    const runtime = this.deps.runtime();
    switch (code) {
      case 'no-speech':
        this.verified = true; // the engine listened and heard silence: it works
        return; // onEnd restarts
      case 'language-not-supported':
        runtime.showToast('generic', COPY.languageNotSupported, 6000);
        runtime.setLanguages({ detected: runtime.detectedLanguage, selected: 'en-US' });
        this.deps.controller()?.configureMatcher({ locale: 'en-US' });
        this.adapter.setLanguage('en-US');
        return; // onEnd restarts in English
      case 'not-allowed':
      case 'service-not-allowed':
        runtime.showToast('generic', COPY.micDenied, 6000);
        this.stopInternal();
        return;
      case 'audio-capture':
        runtime.showToast('generic', COPY.noMicrophone, 6000);
        this.stopInternal();
        return;
      case 'aborted':
        this.blocked = true;
        if (isIPad() && isStandalone()) runtime.openModalId('ipadPwaBlocked');
        this.stopInternal();
        return;
      case 'network':
        if (!this.isOnline()) {
          runtime.showToast('generic', COPY.speechOffline, 8000);
          this.stopInternal();
        } else if (!this.verified) {
          // Online, yet the very first start cannot reach a recogniser (e.g. Brave).
          runtime.openModalId('browserUnsupported');
          this.stopInternal();
        }
        return; // verified + online: a blip, onEnd restarts
      default:
        if (!this.verified) {
          runtime.openModalId('browserUnsupported');
          this.stopInternal();
        }
        return;
    }
  }

  private onEnd(): void {
    if (this.blocked) return;
    if (!this.wantListening) {
      this.deps.onListeningChange(false);
      return;
    }
    if (!this.verified && this.lastError === null) {
      if (this.now() - this.startedAt < SILENT_FAIL_MS) {
        // Ended at once with no result and no error: silent failure (e.g. Arc).
        this.deps.runtime().openModalId('browserUnsupported');
        this.stopInternal();
        return;
      }
      this.verified = true; // it listened for a while and timed out on silence
    }
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return; // restart on visible
    this.tryRestart();
  }

  private tryRestart(): void {
    const now = this.now();
    this.restartTimes = this.restartTimes.filter((t) => now - t < RESTART_WINDOW_MS);
    if (this.restartTimes.length >= RESTART_LIMIT) {
      const quiet = this.lastError === null || this.lastError === 'no-speech';
      if (quiet) {
        // The engine keeps timing out on silence (a long pause): keep listening, just slower.
        this.clearRetry();
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.startAdapter(0);
        }, QUIET_RESTART_MS);
        return;
      }
      this.deps.runtime().showToast('generic', COPY.recognitionUnstable, 6000);
      this.stopInternal();
      return;
    }
    this.restartTimes.push(now);
    this.startAdapter(0);
  }

  private onVisibility = (): void => {
    if (document.visibilityState !== 'visible' || !this.wantListening || this.blocked) return;
    if (this.retryTimer) return; // a restart is already scheduled
    try {
      this.adapter.start();
      this.startedAt = this.now();
      this.lastError = null;
    } catch {
      /* already running */
    }
  };
}
