// Mic / play button state machine (spec §6.5).
import { track } from '../analytics';
import { COPY } from '../modals/copy';
import { services } from '../services';
import { useRuntimeStore } from '../state/runtime';
import { useSettingsStore } from '../state/settings';

export function applyDockOpacity(): void {
  const dock = document.getElementById('mainControlsDock');
  if (!dock) return;
  const r = useRuntimeStore.getState();
  const active = r.listening || r.autoscrollRunning || r.recording;
  dock.style.opacity = active ? String(useSettingsStore.getState().dockOpacity / 100) : '';
}

export async function handleMicClick(): Promise<void> {
  const runtime = useRuntimeStore.getState();
  const mode = useSettingsStore.getState().scrollingMode;
  if (runtime.isStarting) {
    services.autoscroller?.stop();
    runtime.setIsStarting(false);
    applyDockOpacity();
    return;
  }
  if (mode === 'voice') {
    if (runtime.listening) {
      track('mic-stop');
      services.speech?.stop();
    } else {
      track('mic-start');
      services.speech?.start();
    }
  } else if (runtime.autoscrollRunning) {
    track('autoscroll-stop');
    services.autoscroller?.stop();
    runtime.setAutoscrollRunning(false);
  } else {
    runtime.setIsStarting(true);
    const ok = (await services.autoscroller?.start()) ?? false;
    useRuntimeStore.getState().setIsStarting(false);
    if (!ok) {
      if (mode === 'sound')
        useRuntimeStore.getState().showToast('generic', COPY.soundNeedsMic, 5000);
      applyDockOpacity();
      return;
    }
    track('autoscroll-start');
    useRuntimeStore.getState().setAutoscrollRunning(true);
  }
  applyDockOpacity();
}

/** Called when the scrolling mode changes: stop everything and reset the button. */
export function stopAllScrolling(): void {
  services.autoscroller?.stop();
  services.speech?.stop();
  const r = useRuntimeStore.getState();
  r.setIsStarting(false);
  r.setListening(false);
  r.setAutoscrollRunning(false);
  applyDockOpacity();
}
