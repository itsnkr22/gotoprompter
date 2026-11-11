// Camera preview and video controls (spec §11.1–§11.2).
import { useRuntimeStore } from '../state/runtime';
import { recordingSupported } from './recorder';
import { flipCamera, startRecording, stopRecording, toggleVideoLayout } from './video-mode';

const pill =
  'pointer-events-auto rounded-full bg-surface/90 px-4 py-2 text-sm font-medium text-fg/90 backdrop-blur transition-all hover:bg-raised hover:text-fg';

export function VideoControls() {
  const videoMode = useRuntimeStore((r) => r.videoMode);
  const layout = useRuntimeStore((r) => r.videoLayout);
  const recording = useRuntimeStore((r) => r.recording);
  const canRecord = recordingSupported();
  return (
    <div
      id="videoControls"
      className={`${videoMode ? 'flex' : 'hidden'} pointer-events-none absolute right-6 bottom-6 z-[9000] items-center justify-end gap-3`}
    >
      <button
        id="videoFlipCameraBtn"
        type="button"
        aria-label="Flip camera"
        title="Flip camera"
        disabled={recording}
        className="pointer-events-auto rounded-full bg-surface/90 p-2.5 text-fg/90 backdrop-blur hover:bg-raised hover:text-fg disabled:opacity-40"
        onClick={() => void flipCamera()}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
      <button
        id="videoLayoutToggleBtn"
        type="button"
        title="Switch layout"
        className={pill}
        onClick={toggleVideoLayout}
      >
        {layout === 'split' ? '⬜ Overlay' : '⬜ Split'}
      </button>
      {canRecord ? (
        <>
          <button
            id="videoRecordBtn"
            type="button"
            title="Start recording"
            className={`${recording ? 'hidden' : 'flex'} pointer-events-auto items-center gap-2 rounded-full bg-red-600/90 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-red-700`}
            onClick={startRecording}
          >
            <span className="h-3 w-3 rounded-full bg-white" />
            Record
          </button>
          <button
            id="videoStopBtn"
            type="button"
            title="Stop recording"
            className={`${recording ? 'flex' : 'hidden'} vp-recording-pulse pointer-events-auto items-center gap-2 rounded-full bg-red-600/90 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-red-700`}
            onClick={stopRecording}
          >
            <span className="h-3 w-3 rounded-sm bg-white" />
            Stop
          </button>
        </>
      ) : null}
      <div
        id="videoRecordingIndicator"
        className={`${recording ? 'flex' : 'hidden'} pointer-events-none items-center gap-2`}
      >
        <span className="vp-recording-pulse h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="text-xs font-medium text-red-400">REC</span>
      </div>
    </div>
  );
}

export function VideoContainer() {
  const videoMode = useRuntimeStore((r) => r.videoMode);
  return (
    <div id="videoContainer" className={videoMode ? '' : 'hidden'}>
      <video id="videoPreview" className="video-preview" playsInline muted />
    </div>
  );
}
