// Controls dock (spec §6.4).
import { useEffect } from 'react';
import { resetApp, restartScript } from '../script/load-script';
import { useRuntimeStore } from '../state/runtime';
import { useSettingsStore } from '../state/settings';
import { applyDockOpacity, handleMicClick } from './mic-state';

const iconBtn =
  'pointer-events-auto min-h-[44px] min-w-[44px] rounded-full bg-surface/80 p-3 text-muted backdrop-blur transition-all hover:bg-raised hover:text-fg';

const Icon = ({ d, className = 'h-6 w-6' }: { d: string; className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
  </svg>
);

const MIC =
  'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z';
const PLAY = 'M8 5v14l11-7z';
const PAUSE = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';

interface Props {
  onVideo: () => void;
}

export function ControlsDock({ onVideo }: Props) {
  const mode = useSettingsStore((s) => s.scrollingMode);
  const dockOpacity = useSettingsStore((s) => s.dockOpacity);
  const listening = useRuntimeStore((s) => s.listening);
  const autoscrollRunning = useRuntimeStore((s) => s.autoscrollRunning);
  const recording = useRuntimeStore((s) => s.recording);
  const isStarting = useRuntimeStore((s) => s.isStarting);
  const toggleSettings = useRuntimeStore((s) => s.toggleSettings);
  const videoMode = useRuntimeStore((s) => s.videoMode);

  const voice = mode === 'voice';
  const active = voice ? listening : autoscrollRunning;
  const status = voice
    ? active
      ? 'Listening…'
      : 'Tap mic to start'
    : active
      ? 'Scrolling…'
      : 'Tap play to start';
  const label = voice
    ? active
      ? 'Stop listening'
      : 'Start listening'
    : active
      ? 'Pause scrolling'
      : 'Start scrolling';

  useEffect(() => {
    applyDockOpacity();
  }, [listening, autoscrollRunning, recording, dockOpacity]);

  return (
    <div
      id="mainControlsDock"
      className="pointer-events-none fixed right-0 bottom-8 left-0 z-[9999] flex items-center justify-center gap-6 transition-opacity duration-300"
    >
      <button
        id="resetAppBtn"
        type="button"
        aria-label="Back to editor"
        title="Back to editor"
        className={iconBtn}
        onClick={resetApp}
      >
        <Icon d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </button>

      <button
        id="micButton"
        type="button"
        aria-label={label}
        title={label}
        aria-busy={isStarting}
        className={`pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-xl transition-all hover:scale-105 active:scale-95 ${
          active
            ? 'animate-pulse border-red-500 bg-red-600 text-white'
            : 'border-line bg-raised text-fg hover:text-accent'
        }`}
        onClick={() => void handleMicClick()}
      >
        <Icon className="h-8 w-8" d={voice ? MIC : active ? PAUSE : PLAY} />
        <span
          id="statusIndicator"
          aria-live="polite"
          className={`absolute -bottom-6 text-xs whitespace-nowrap ${active ? 'text-red-400' : 'text-muted'}`}
        >
          {isStarting ? 'Starting…' : status}
        </span>
      </button>

      <button
        id="restartScriptBtn"
        type="button"
        aria-label="Restart script"
        title="Restart script"
        className={iconBtn}
        onClick={restartScript}
      >
        <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </button>

      <button
        id="videoModeBtn"
        type="button"
        aria-label={videoMode ? 'Exit video mode' : 'Video mode'}
        title={videoMode ? 'Exit video mode' : 'Video mode'}
        aria-pressed={videoMode}
        className={`${iconBtn} ${videoMode ? 'text-accent' : ''}`}
        onClick={onVideo}
      >
        <Icon d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </button>

      <button
        id="toggleSettingsBtn"
        type="button"
        aria-label="Settings"
        title="Settings"
        className={iconBtn}
        onClick={() => toggleSettings()}
      >
        <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </button>
    </div>
  );
}
