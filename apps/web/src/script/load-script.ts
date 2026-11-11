// Script loading pipeline (spec §5).
import { tokenize } from '@gotoprompter/prompter-core';
import { sendStatsEvent } from '../analytics';
import { detectLanguage } from '../languages';
import { COPY } from '../modals/copy';
import { services } from '../services';
import { useHistoryStore } from '../state/history';
import { useRuntimeStore } from '../state/runtime';
import { useSettingsStore } from '../state/settings';

export interface LoadOptions {
  restoreIndex?: number;
}

export function loadScript(
  text: string,
  googleDocUrl: string | null = null,
  opts: LoadOptions = {},
): boolean {
  const scriptText = text.trim();
  if (!scriptText) return false;
  const runtime = useRuntimeStore.getState();
  const settings = useSettingsStore.getState();
  const isReload = opts.restoreIndex !== undefined;

  runtime.setGoogleDocUrl(googleDocUrl);
  if (!isReload) {
    useHistoryStore.getState().save(scriptText, googleDocUrl);
    sendStatsEvent('script_started');
  }

  if (settings.languageSetting === 'auto') {
    const { locale, confidence } = detectLanguage(scriptText);
    runtime.setLanguages({ detected: locale, selected: locale });
    if (confidence < 0.5)
      runtime.showToast('langDetectionWarning', COPY.langDetectionWarning, 6000);
  } else {
    runtime.setLanguages({ detected: null, selected: settings.languageSetting });
  }
  services.speech?.setLanguage(useRuntimeStore.getState().selectedLanguage);

  const tokens = tokenize(scriptText, {
    preserveFormatting: settings.preserveFormatting,
    locale: useRuntimeStore.getState().selectedLanguage,
  });
  services.tokens = tokens;
  services.pendingRestoreIndex = isReload
    ? Math.min(opts.restoreIndex!, Math.max(0, tokens.length - 1))
    : null;

  if (services.controller && runtime.phase === 'prompter') {
    // Already prompting (re-tokenize or resync): load in place.
    services.controller.load(tokens, { locale: useRuntimeStore.getState().selectedLanguage });
    if (services.pendingRestoreIndex !== null) {
      services.controller.setIndex(services.pendingRestoreIndex, { animate: false });
      services.pendingRestoreIndex = null;
    } else {
      services.controller.scrollToCurrent({ animate: false });
    }
  } else {
    runtime.setPhase('prompter');
  }
  return true;
}

/** Re-tokenize the current script after a `preserveFormatting` change (spec §5.2). */
export function reloadCurrentScript(): void {
  const runtime = useRuntimeStore.getState();
  if (runtime.phase !== 'prompter' || !services.controller) return;
  loadScript(runtime.scriptText, runtime.googleDocUrl, { restoreIndex: services.controller.index });
}

/** Back to the editor (spec §5.3). */
export function resetApp(): void {
  services.speech?.stop();
  services.autoscroller?.stop();
  const runtime = useRuntimeStore.getState();
  runtime.setIsStarting(false);
  runtime.setListening(false);
  runtime.setAutoscrollRunning(false);
  if (runtime.videoMode) runtime.exitVideo();
  runtime.toggleSettings(false);
  runtime.setPhase('setup');
}

/** Restart from the first word (spec §5.4). Does not stop listening. */
export function restartScript(): void {
  services.controller?.restart();
}
