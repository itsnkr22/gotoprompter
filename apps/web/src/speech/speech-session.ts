// Owns start/stop, auto-restart, silent-fail detection and routing of transcripts (spec §7.3).
import { track } from '../analytics';
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
}

/** Error codes on the first start that do NOT mean the browser lacks support. */
const LEGIT_FIRST_ERRORS: ReadonlySet<SpeechErrorCode> = new Set([
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'aborted',
]);

export const RESTART_LIMIT = 5;
export const RESTART_WINDOW_MS = 10_000;

export class SpeechSession {
  private wantListening = false;
  private isFirstStart = true;
  private gotResultOnFirstStart = false;
  private blocked = false;
  private restartTimes: number[] = [];
  private readonly now: () => number;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(
    private readonly adapter: SpeechAdapter,
    private readonly deps: SpeechSessionDeps,
  ) {
    this.now = deps.now ?? (() => Date.now());
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
    try {
      this.adapter.start();
      this.deps.onListeningChange(true);
    } catch {
      this.wantListening = false;
      this.deps.onListeningChange(false);
    }
  }

  stop(): void {
    this.stopInternal();
  }

  setLanguage(locale: string): void {
    this.adapter.setLanguage(locale);
  }

  destroy(): void {
    for (const u of this.unsubscribe) u();
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private stopInternal(): void {
    this.wantListening = false;
    this.adapter.stop();
    this.deps.onListeningChange(false);
  }

  private onTranscript(u: TranscriptUpdate): void {
    if (this.isFirstStart) this.gotResultOnFirstStart = true;
    this.restartTimes = []; // real speech arrived: reset the restart throttle
    const controller = this.deps.controller();
    if (!controller) return;
    const r = controller.feedTranscript(u.text);
    if ('command' in r) track('voice-command', { command: r.command });
  }

  private onError(code: SpeechErrorCode): void {
    if (this.isFirstStart && !this.gotResultOnFirstStart) {
      this.isFirstStart = false;
      if (!LEGIT_FIRST_ERRORS.has(code)) this.deps.runtime().openModalId('browserUnsupported');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        this.deps.runtime().showToast('generic', COPY.micDenied, 6000);
      }
      if (code === 'aborted') this.handleAborted();
      this.stopInternal();
      return;
    }
    switch (code) {
      case 'aborted':
        this.handleAborted();
        this.stopInternal();
        return;
      case 'language-not-supported':
        this.deps.runtime().showToast('generic', COPY.languageNotSupported, 6000);
        this.deps
          .runtime()
          .setLanguages({ detected: this.deps.runtime().detectedLanguage, selected: 'en-US' });
        this.adapter.setLanguage('en-US');
        return;
      case 'not-allowed':
      case 'service-not-allowed':
        this.deps.runtime().showToast('generic', COPY.micDenied, 6000);
        this.stopInternal();
        return;
      default:
        return; // 'no-speech', 'network', 'unknown', 'audio-capture': onEnd restarts
    }
  }

  private handleAborted(): void {
    this.blocked = true;
    if (isIPad() && isStandalone()) this.deps.runtime().openModalId('ipadPwaBlocked');
  }

  private onEnd(): void {
    if (this.isFirstStart && !this.gotResultOnFirstStart) {
      this.isFirstStart = false;
      if (this.wantListening) {
        // Ended immediately with no result and no error: silent failure (e.g. Arc).
        this.deps.runtime().openModalId('browserUnsupported');
        this.stopInternal();
      }
      return;
    }
    this.isFirstStart = false;
    if (this.blocked) return;
    if (!this.wantListening) {
      this.deps.onListeningChange(false);
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return; // restart on visible
    this.tryRestart();
  }

  private tryRestart(): void {
    const now = this.now();
    this.restartTimes = this.restartTimes.filter((t) => now - t < RESTART_WINDOW_MS);
    if (this.restartTimes.length >= RESTART_LIMIT) {
      this.deps.runtime().showToast('generic', COPY.recognitionUnstable, 6000);
      this.stopInternal();
      return;
    }
    this.restartTimes.push(now);
    try {
      this.adapter.start();
    } catch {
      this.stopInternal();
    }
  }

  private onVisibility = (): void => {
    if (document.visibilityState === 'visible' && this.wantListening && !this.blocked) {
      try {
        this.adapter.start();
      } catch {
        /* already running or restarting */
      }
    }
  };
}
