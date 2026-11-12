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
  /** The recorder failed mid-recording; whatever was captured is still saved. */
  onError?: () => void;
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
  // Generous: some browsers read the blob lazily, and a large file revoked early is truncated.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

  /** Epoch ms when the current recording started (0 when idle). */
  get startTime(): number {
    return this.recording ? this.startedAt : 0;
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
    // A stream whose tracks have all ended (camera unplugged) records nothing.
    const tracks = typeof stream.getTracks === 'function' ? stream.getTracks() : null;
    if (tracks && tracks.length > 0 && !tracks.some((t) => t.readyState === 'live')) return;
    this.chunks = [];
    this.mime = pickMimeType();
    let r: MediaRecorder;
    try {
      r = this.mime
        ? new MediaRecorder(stream, { mimeType: this.mime })
        : new MediaRecorder(stream);
    } catch {
      try {
        r = new MediaRecorder(stream);
      } catch {
        this.events.onError?.();
        return;
      }
      this.mime = r.mimeType;
    }
    r.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    r.onstop = () => {
      if (this.recorder === r) this.finish();
    };
    r.onerror = () => {
      if (this.recorder !== r) return;
      this.events.onError?.();
      this.stop();
    };
    this.recorder = r;
    this.startedAt = Date.now();
    try {
      r.start(1000);
    } catch {
      this.recorder = null;
      this.events.onError?.();
      return;
    }
    this.events.onStart?.();
  }

  stop(): void {
    const r = this.recorder;
    if (!r) return;
    if (r.state !== 'inactive') {
      try {
        r.stop();
      } catch {
        this.finish();
      }
    } else this.finish();
  }

  private finish(): void {
    const r = this.recorder;
    if (!r) return; // already finished
    const mime = r.mimeType || this.mime;
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
