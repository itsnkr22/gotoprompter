// MediaRecorder wrapper (spec §11.4).
import { APP_NAME } from '../brand';

export const MIME_PREFERENCE = [
  'video/mp4;codecs=avc1,opus',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

export function recordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

export function pickMimeType(
  isSupported: (m: string) => boolean = (m) => MediaRecorder.isTypeSupported(m),
): string {
  if (!recordingSupported()) return '';
  for (const m of MIME_PREFERENCE) if (isSupported(m)) return m;
  return '';
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function recordingFilename(mime: string, now: Date = new Date()): string {
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `${APP_NAME.toLowerCase()}-recording-${stamp}.${ext}`;
}

export interface RecorderEvents {
  onStart?: () => void;
  onStop?: (info: { durationSec: number; mime: string; chunks: number }) => void;
  onEmpty?: () => void;
  download?: (blob: Blob, filename: string) => void;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class VideoRecorder {
  private streamValue: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private mime = '';

  constructor(private readonly events: RecorderEvents = {}) {}

  get stream(): MediaStream | null {
    return this.streamValue;
  }

  get recording(): boolean {
    return this.recorder !== null && this.recorder.state !== 'inactive';
  }

  attach(stream: MediaStream): void {
    this.streamValue = stream;
  }

  detach(): void {
    this.streamValue = null;
  }

  start(): void {
    const stream = this.streamValue;
    if (!stream || !recordingSupported() || this.recording) return;
    this.chunks = [];
    this.mime = pickMimeType();
    try {
      this.recorder = this.mime
        ? new MediaRecorder(stream, { mimeType: this.mime })
        : new MediaRecorder(stream);
    } catch {
      this.recorder = new MediaRecorder(stream);
      this.mime = this.recorder.mimeType;
    }
    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => this.finish();
    this.startedAt = Date.now();
    this.recorder.start(1000);
    this.events.onStart?.();
  }

  stop(): void {
    const r = this.recorder;
    if (!r) return;
    if (r.state !== 'inactive') r.stop();
    else this.finish();
  }

  private finish(): void {
    const r = this.recorder;
    const mime = r?.mimeType || this.mime;
    this.recorder = null;
    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    if (this.chunks.length === 0) {
      this.events.onEmpty?.();
    } else {
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(this.chunks, { type: `video/${ext}` });
      (this.events.download ?? downloadBlob)(blob, recordingFilename(mime));
    }
    this.events.onStop?.({ durationSec, mime, chunks: this.chunks.length });
    this.chunks = [];
  }
}
