// Test hooks for Playwright and dev tooling (spec §18.3). Never shipped in production builds.
import { env } from './env';
import type { PrompterController } from './prompter/prompter-controller';
import { services } from './services';
import type { FakeSpeechAdapter } from './speech/fake-speech-adapter';
import { useHistoryStore } from './state/history';
import { useRuntimeStore } from './state/runtime';
import { useSettingsStore } from './state/settings';

export interface TestHooks {
  speechAdapter?: FakeSpeechAdapter;
  runtime: typeof useRuntimeStore;
  settings: typeof useSettingsStore;
  history: typeof useHistoryStore;
  controller: () => PrompterController | null;
}

declare global {
  interface Window {
    __vpTestHooks?: TestHooks;
    /** Set by a test before the app boots to inject a fake adapter. */
    __vpFakeSpeech?: boolean;
  }
}

export function installTestHooks(adapter: FakeSpeechAdapter | undefined): void {
  if (!env.TEST_HOOKS || typeof window === 'undefined') return;
  window.__vpTestHooks = {
    ...(adapter ? { speechAdapter: adapter } : {}),
    runtime: useRuntimeStore,
    settings: useSettingsStore,
    history: useHistoryStore,
    controller: () => services.controller,
  };
}
