// Video mode orchestration (spec §11): enter/exit, layout, flip camera, device switching.
import { track } from '../analytics';
import { COPY } from '../modals/copy';
import { isAndroid, isIOS, isStandalone } from '../platform';
import { applyDockOpacity } from '../prompter/mic-state';
import { services } from '../services';
import { useRuntimeStore } from '../state/runtime';
import { useSettingsStore } from '../state/settings';
import type { VideoLayout } from '../state/runtime';
import { VideoRecorder, downloadBlob, recordingSupported } from './recorder';

/** Asks before the tab closes while a recording would be lost. */
const warnBeforeUnload = (e: BeforeUnloadEvent): void => {
  e.preventDefault();
  e.returnValue = COPY.recordingLeaveWarning;
};

/**
 * Hand the finished file to the user. An iOS home-screen app cannot download a blob, so there
 * the file goes through the share sheet, opened from a button because sharing needs a tap.
 */
export function deliverRecording(blob: Blob, filename: string): void {
  const canShareFiles =
    isIOS() &&
    isStandalone() &&
    typeof File !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';
  if (canShareFiles) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      const runtime = useRuntimeStore.getState();
      runtime.showToast('recordingReady', COPY.recordingReady, Infinity, {
        label: COPY.recordingSave,
        onClick: () => {
          navigator
            .share({ files: [file] })
            .then(() => useRuntimeStore.getState().dismissToast('recordingReady'))
            .catch(() => {
              /* sheet dismissed: the toast stays so the file can still be saved */
            });
        },
      });
      return;
    }
  }
  downloadBlob(blob, filename);
}

export const recorder = new VideoRecorder({
  onStart: () => {
    useRuntimeStore.getState().setRecording(true);
    applyDockOpacity();
    window.addEventListener('beforeunload', warnBeforeUnload);
    track('video-record-start');
  },
  onStop: ({ durationSec, mime }) => {
    useRuntimeStore.getState().setRecording(false);
    applyDockOpacity();
    window.removeEventListener('beforeunload', warnBeforeUnload);
    track('video-record-stop', { durationSec, mime });
  },
  onEmpty: () => useRuntimeStore.getState().showToast('generic', 'Nothing was recorded.', 4000),
  onError: () => useRuntimeStore.getState().showToast('generic', COPY.recordingFailed, 6000),
  download: deliverRecording,
});

function previewEl(): HTMLVideoElement | null {
  return document.getElementById('videoPreview') as HTMLVideoElement | null;
}

export function getMediaConstraints(): MediaStreamConstraints {
  const s = useSettingsStore.getState();
  const r = useRuntimeStore.getState();
  const video: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (s.selectedVideoDeviceId) video.deviceId = { exact: s.selectedVideoDeviceId };
  else video.facingMode = r.facingMode;
  return {
    video,
    audio: s.selectedAudioDeviceId ? { deviceId: { exact: s.selectedAudioDeviceId } } : true,
  };
}

export function applyPreviewMirror(): void {
  const v = previewEl();
  if (!v) return;
  const mirror =
    !useSettingsStore.getState().selectedVideoDeviceId &&
    useRuntimeStore.getState().facingMode === 'user';
  v.style.transform = mirror ? 'scaleX(-1)' : 'none';
}

export function applyVideoLayout(layout: VideoLayout): void {
  const prompter = document.getElementById('prompterContainer');
  const scroll = document.getElementById('scrollContainer');
  if (!prompter) return;
  prompter.classList.toggle('vp-video-split', layout === 'split');
  prompter.classList.toggle('vp-video-overlay', layout === 'overlay');
  if (scroll)
    scroll.style.backgroundColor = layout === 'split' ? useSettingsStore.getState().bgColor : '';
}

/** The camera vanished (unplugged, permission revoked): save what exists and leave Video mode. */
function onCameraEnded(stream: MediaStream): void {
  if (recorder.stream !== stream) return; // an old stream we already replaced
  const wasRecording = recorder.recording;
  exitVideoMode();
  useRuntimeStore
    .getState()
    .showToast('generic', wasRecording ? COPY.cameraDisconnected : COPY.cameraLost, 6000);
}

function errorName(err: unknown): string {
  return typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : '';
}

/**
 * Open the camera and microphone, degrading instead of failing: a remembered device that is
 * gone falls back to the default one, and a missing or blocked microphone still gives a
 * (silent) camera. Returns null after telling the user why.
 */
async function acquireStream(): Promise<MediaStream | null> {
  const runtime = useRuntimeStore.getState();
  const md = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
  if (!md?.getUserMedia) {
    runtime.showToast('generic', COPY.cameraUnavailable, 6000);
    return null;
  }
  let lastError: unknown;
  try {
    return await md.getUserMedia(getMediaConstraints());
  } catch (err) {
    lastError = err;
  }
  const settings = useSettingsStore.getState();
  const stale =
    errorName(lastError) === 'OverconstrainedError' || errorName(lastError) === 'NotFoundError';
  if (stale && (settings.selectedVideoDeviceId || settings.selectedAudioDeviceId)) {
    settings.patch({ selectedVideoDeviceId: null, selectedAudioDeviceId: null });
    try {
      return await md.getUserMedia(getMediaConstraints());
    } catch {
      /* fall through to camera-only */
    }
  }
  try {
    const stream = await md.getUserMedia({ ...getMediaConstraints(), audio: false });
    runtime.showToast('generic', COPY.videoNoAudio, 6000);
    return stream;
  } catch (err) {
    lastError = err;
  }
  const name = errorName(lastError);
  const message =
    name === 'NotFoundError' || name === 'OverconstrainedError'
      ? COPY.cameraNotFound
      : name === 'NotReadableError' || name === 'AbortError'
        ? COPY.cameraBusy
        : COPY.cameraDenied;
  runtime.showToast('generic', message, 6000);
  return null;
}

async function attachStream(stream: MediaStream): Promise<void> {
  const v = previewEl();
  recorder.attach(stream);
  stream.getVideoTracks?.()[0]?.addEventListener('ended', () => onCameraEnded(stream));
  if (!v) return;
  v.srcObject = stream;
  v.muted = true;
  applyPreviewMirror();
  try {
    await v.play();
  } catch {
    /* autoplay restrictions: the preview still shows the first frame */
  }
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export async function enterVideoMode(): Promise<boolean> {
  const runtime = useRuntimeStore.getState();
  if (runtime.videoMode) return true;
  if (!useSettingsStore.getState().selectedVideoDeviceId) runtime.setFacing('user');
  const stream = await acquireStream();
  if (!stream) return false;
  // The prompter may have been closed while the permission prompt was open.
  if (useRuntimeStore.getState().phase !== 'prompter' || !previewEl()) {
    stopStream(stream);
    return false;
  }
  useRuntimeStore.getState().enterVideo();
  await attachStream(stream);
  applyVideoLayout('split');
  setTimeout(() => services.controller?.scrollToCurrent({ animate: false }), 50);
  if (isAndroid()) {
    useRuntimeStore.getState().openModalId('androidVideoLimit');
    services.speech?.stop();
  }
  if (!recordingSupported())
    useRuntimeStore.getState().showToast('generic', COPY.recordingUnsupported, 5000);
  track('video-mode-enter');
  return true;
}

export function exitVideoMode(): void {
  const runtime = useRuntimeStore.getState();
  // Also runs when only a stream is left over, so the camera light never stays on.
  if (!runtime.videoMode && !recorder.stream) return;
  if (recorder.recording) recorder.stop(); // still downloads
  stopStream(recorder.stream);
  recorder.detach();
  const v = previewEl();
  if (v) v.srcObject = null;
  const prompter = document.getElementById('prompterContainer');
  prompter?.classList.remove('vp-video-split', 'vp-video-overlay');
  const scroll = document.getElementById('scrollContainer');
  if (scroll) scroll.style.backgroundColor = useSettingsStore.getState().bgColor;
  runtime.setFacing('user');
  runtime.exitVideo();
  setTimeout(() => services.controller?.scrollToCurrent({ animate: false }), 50);
  applyDockOpacity();
  track('video-mode-exit');
}

export function toggleVideoLayout(): void {
  const r = useRuntimeStore.getState();
  const next: VideoLayout = r.videoLayout === 'split' ? 'overlay' : 'split';
  r.setVideoLayout(next);
  applyVideoLayout(next);
  setTimeout(() => services.controller?.scrollToCurrent({ animate: false }), 50);
  track('video-layout-toggle', { layout: next });
}

/** Acquire a new stream with the current constraints and swap it in; returns false on failure. */
export async function swapStream(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
    stopStream(recorder.stream);
    await attachStream(stream);
    return true;
  } catch {
    return false;
  }
}

export async function flipCamera(): Promise<void> {
  const r = useRuntimeStore.getState();
  if (!r.videoMode || r.recording) return;
  const prev = r.facingMode;
  r.setFacing(prev === 'user' ? 'environment' : 'user');
  useSettingsStore.getState().set('selectedVideoDeviceId', null);
  const ok = await swapStream();
  if (!ok) {
    useRuntimeStore.getState().setFacing(prev);
    useRuntimeStore.getState().showToast('generic', 'This device has only one camera.', 4000);
    return;
  }
  track('video-flip-camera', { facing: useRuntimeStore.getState().facingMode });
}

/** Settings selects changed (spec §9.12). */
export async function handleDeviceChange(): Promise<void> {
  const r = useRuntimeStore.getState();
  const mode = useSettingsStore.getState().scrollingMode;
  if (r.videoMode && !r.recording) {
    const ok = await swapStream();
    if (!ok)
      useRuntimeStore.getState().showToast('generic', "Couldn't switch to that device.", 4000);
  }
  if (r.autoscrollRunning && mode === 'sound' && services.autoscroller) {
    services.autoscroller.stop();
    const ok = await services.autoscroller.start();
    if (!ok) useRuntimeStore.getState().setAutoscrollRunning(false);
  } else if (r.listening && mode === 'voice' && services.speech) {
    services.speech.stop();
    setTimeout(() => services.speech?.start(), 400);
  }
}

export function startRecording(): void {
  if (!recordingSupported()) {
    useRuntimeStore.getState().showToast('generic', COPY.recordingUnsupported, 5000);
    return;
  }
  recorder.start();
}

export function stopRecording(): void {
  recorder.stop();
}
