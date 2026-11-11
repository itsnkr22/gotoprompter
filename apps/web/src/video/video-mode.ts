// Video mode orchestration (spec §11): enter/exit, layout, flip camera, device switching.
import { track } from '../analytics';
import { COPY } from '../modals/copy';
import { isAndroid } from '../platform';
import { applyDockOpacity } from '../prompter/mic-state';
import { services } from '../services';
import { useRuntimeStore } from '../state/runtime';
import { useSettingsStore } from '../state/settings';
import type { VideoLayout } from '../state/runtime';
import { VideoRecorder, recordingSupported } from './recorder';

export const recorder = new VideoRecorder({
  onStart: () => {
    useRuntimeStore.getState().setRecording(true);
    applyDockOpacity();
    track('video-record-start');
  },
  onStop: ({ durationSec, mime }) => {
    useRuntimeStore.getState().setRecording(false);
    applyDockOpacity();
    track('video-record-stop', { durationSec, mime });
  },
  onEmpty: () => useRuntimeStore.getState().showToast('generic', 'Nothing was recorded.', 4000),
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

async function attachStream(stream: MediaStream): Promise<void> {
  const v = previewEl();
  recorder.attach(stream);
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
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
  } catch {
    runtime.showToast('generic', COPY.cameraDenied, 6000);
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
  if (!runtime.videoMode) return;
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
