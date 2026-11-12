// Sound / Constant scrolling wrapper around the core AutoScroller (spec §8.1).
import { AutoScroller as CoreAutoScroller } from '@gotoprompter/prompter-core';
import type { PrompterController } from '../prompter/prompter-controller';
import type { Settings } from '../state/settings';
import { SoundGate } from './sound-gate';

export interface AutoScrollerDeps {
  controller: () => PrompterController | null;
  getSettings: () => Settings;
  getAudioDeviceId: () => string | null;
  onEnd: () => void;
  onTrackEnded?: () => void;
}

export const TICK_MS = 100;
/** A background tab fires timers rarely; never credit more than this to one tick. */
export const MAX_TICK_ELAPSED_MS = 1000;

export class AutoScroller {
  private sessionId = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private core: CoreAutoScroller | null = null;
  private lastTickAt = 0;
  private lastSoundSeen = -Infinity;
  readonly gate: SoundGate;

  constructor(private readonly deps: AutoScrollerDeps) {
    this.gate = new SoundGate(() => deps.getSettings().soundSensitivity);
  }

  get running(): boolean {
    return this.timer !== null;
  }

  /** Returns false when the mode needs a microphone and permission was denied. */
  async start(): Promise<boolean> {
    this.stop();
    const sessionId = this.sessionId;
    const settings = this.deps.getSettings();
    const mode = settings.scrollingMode;
    if (mode === 'voice') return false;
    const controller = this.deps.controller();
    if (!controller) return false;

    if (mode === 'sound') {
      try {
        const stream = await this.gate.start(this.deps.getAudioDeviceId());
        stream.getAudioTracks()[0]?.addEventListener('ended', () => {
          this.stop();
          this.deps.onTrackEnded?.();
        });
      } catch {
        return false;
      }
      // The mode may have changed while the permission prompt was open.
      if (sessionId !== this.sessionId || this.deps.getSettings().scrollingMode !== 'sound') {
        this.gate.stop();
        return false;
      }
    }

    this.core = new CoreAutoScroller(
      controller.tokens,
      () => controller.index,
      (i) => controller.setIndexFromScroller(i),
      { mode, scrollSpeed: settings.scrollSpeed },
    );
    this.lastTickAt = performance.now();
    this.lastSoundSeen = -Infinity;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    return true;
  }

  stop(): void {
    this.sessionId++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.gate.stop();
    this.core = null;
  }

  /** Live speed changes from the settings slider. */
  setSpeed(wordsPerSecond: number): void {
    this.core?.setSpeed(wordsPerSecond);
  }

  private tick(): void {
    const core = this.core;
    const controller = this.deps.controller();
    if (!core || !controller) return;
    const now = performance.now();
    if (
      this.deps.getSettings().scrollingMode === 'sound' &&
      this.gate.lastSoundTime !== this.lastSoundSeen
    ) {
      this.lastSoundSeen = this.gate.lastSoundTime;
      core.noteSound(this.gate.lastSoundTime);
    }
    core.tick(now, Math.min(now - this.lastTickAt, MAX_TICK_ELAPSED_MS));
    this.lastTickAt = now;
    if (controller.finished) {
      this.stop();
      this.deps.onEnd();
    }
  }
}
