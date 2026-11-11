import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MIME_PREFERENCE,
  VideoRecorder,
  pickMimeType,
  recordingFilename,
  recordingSupported,
} from '../src/video/recorder';

class FakeMediaRecorder {
  static isTypeSupported = (m: string): boolean =>
    m === 'video/webm;codecs=vp9,opus' || m === 'video/webm';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_s: MediaStream, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? 'video/webm';
  }
  start(): void {
    this.state = 'recording';
  }
  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['x'], { type: 'video/webm' }) });
    this.onstop?.();
  }
}

describe('recorder', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.MediaRecorder;
  });

  it('reports support and picks the first supported mime in order', () => {
    expect(recordingSupported()).toBe(false);
    expect(pickMimeType()).toBe('');
    globalThis.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder;
    expect(recordingSupported()).toBe(true);
    expect(pickMimeType()).toBe('video/webm;codecs=vp9,opus');
    expect(pickMimeType(() => true)).toBe(MIME_PREFERENCE[0]);
    expect(pickMimeType(() => false)).toBe('');
  });

  it('builds the filename from the mime and local time', () => {
    const d = new Date(2026, 0, 5, 9, 7);
    expect(recordingFilename('video/mp4;codecs=avc1', d)).toBe(
      'gotoprompter-recording-2026-01-05_09-07.mp4',
    );
    expect(recordingFilename('video/webm', d)).toBe('gotoprompter-recording-2026-01-05_09-07.webm');
  });

  it('records, downloads on stop, and reports empty recordings', () => {
    globalThis.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder;
    const download = vi.fn();
    const onStop = vi.fn();
    const onEmpty = vi.fn();
    const r = new VideoRecorder({ download, onStop, onEmpty });
    r.attach({} as MediaStream);
    r.start();
    expect(r.recording).toBe(true);
    r.stop();
    expect(download).toHaveBeenCalledTimes(1);
    expect(download.mock.calls[0]![1]).toMatch(/^gotoprompter-recording-.*\.webm$/);
    expect(onStop).toHaveBeenCalledWith(
      expect.objectContaining({ mime: 'video/webm;codecs=vp9,opus', chunks: 1 }),
    );

    // Empty: a recorder whose stop produces no data
    class EmptyRecorder extends FakeMediaRecorder {
      override stop(): void {
        this.state = 'inactive';
        this.onstop?.();
      }
    }
    globalThis.MediaRecorder = EmptyRecorder as unknown as typeof MediaRecorder;
    const r2 = new VideoRecorder({ download, onEmpty });
    r2.attach({} as MediaStream);
    r2.start();
    r2.stop();
    expect(onEmpty).toHaveBeenCalled();
    expect(download).toHaveBeenCalledTimes(1);
  });
});
