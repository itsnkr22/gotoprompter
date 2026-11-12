// Microphone RMS gate for Sound scrolling (spec §8.2, ENGINE_SPEC §7).
import { DEFAULT_SOUND_HOLD_MS } from '@gotoprompter/prompter-core';

export const SOUND_HOLD_MS = DEFAULT_SOUND_HOLD_MS;

export function soundThreshold(sensitivity: number): number {
  return 0.002 + (1 - sensitivity) * 0.048;
}

export function rmsOf(bytes: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) {
    const v = ((bytes[i] ?? 128) - 128) / 128;
    sum += v * v;
  }
  return bytes.length ? Math.sqrt(sum / bytes.length) : 0;
}

export class SoundGate {
  lastSoundTime = -Infinity;
  level = 0;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private data: Uint8Array | null = null;
  private raf = 0;
  private running = false;

  constructor(private readonly getSensitivity: () => number) {}

  get active(): boolean {
    return this.running;
  }

  async start(deviceId: string | null): Promise<MediaStream> {
    this.stop();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    // Safari creates the context suspended; without this the analyser only ever hears silence.
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.ctx.createMediaStreamSource(stream).connect(this.analyser);
    this.stream = stream;
    this.running = true;
    this.poll();
    return stream;
  }

  private poll = (): void => {
    if (!this.running || !this.analyser || !this.data) return;
    this.analyser.getByteTimeDomainData(this.data as Uint8Array<ArrayBuffer>);
    const rms = rmsOf(this.data);
    this.level = rms;
    if (rms > soundThreshold(this.getSensitivity())) this.lastSoundTime = performance.now();
    this.raf = requestAnimationFrame(this.poll);
  };

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
    this.data = null;
  }
}
