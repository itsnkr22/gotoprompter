// App boot sequence (spec §4.8, §10.3, §15, §14): runs once before the first render.
import { installAnalytics } from './analytics';
import { onFullDetectorReady } from './languages';
import { redetectLanguage } from './script/load-script';
import { env } from './env';
import { DEMO_SCRIPT } from './script/demo-script';
import { AutoScroller } from './scroll/autoscroller';
import { services } from './services';
import { FakeSpeechAdapter } from './speech/fake-speech-adapter';
import { SpeechSession } from './speech/speech-session';
import { WebSpeechAdapter } from './speech/web-speech-adapter';
import { useFlagsStore } from './state/flags';
import { useHistoryStore } from './state/history';
import { useRuntimeStore } from './state/runtime';
import { getSettings, useSettingsStore } from './state/settings';
import { installTestHooks } from './test-hooks';
import { COPY } from './modals/copy';

export function boot(): void {
  if (typeof window === 'undefined') return;

  // Beta flag (§10.3)
  if (new URLSearchParams(window.location.search).get('beta') === 'hmirror') {
    useFlagsStore.getState().set({ betaHMirror: true });
  }

  // First run (§4.8)
  const history = useHistoryStore.getState();
  if (history.items.length === 0) {
    history.seedDemo(DEMO_SCRIPT);
    useRuntimeStore.getState().setScriptText(DEMO_SCRIPT);
  } else {
    useRuntimeStore.getState().setScriptText(history.items[0]!.text);
  }

  // Services (§7, §8)
  const fake = env.TEST_HOOKS && window.__vpFakeSpeech ? new FakeSpeechAdapter() : undefined;
  const adapter = fake ?? new WebSpeechAdapter();
  services.speech = new SpeechSession(adapter, {
    controller: () => services.controller,
    getSettings,
    runtime: () => useRuntimeStore.getState(),
    onListeningChange: (b) => useRuntimeStore.getState().setListening(b),
  });
  services.autoscroller = new AutoScroller({
    controller: () => services.controller,
    getSettings,
    getAudioDeviceId: () => useSettingsStore.getState().selectedAudioDeviceId,
    onEnd: () => useRuntimeStore.getState().setAutoscrollRunning(false),
    onTrackEnded: () => {
      useRuntimeStore.getState().setAutoscrollRunning(false);
      useRuntimeStore.getState().showToast('generic', COPY.micDisconnected, 5000);
    },
  });

  onFullDetectorReady(redetectLanguage);
  installAnalytics();
  installTestHooks(fake);
}
