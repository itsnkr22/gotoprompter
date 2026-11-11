// Service worker registration and "update available" toast (spec §14.4).
import { registerSW } from 'virtual:pwa-register';
import { track } from '../analytics';
import { COPY } from '../modals/copy';
import { useFlagsStore } from '../state/flags';
import { useRuntimeStore } from '../state/runtime';

const SUPPRESS_MS = 24 * 60 * 60 * 1000;

export function installServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      const dismissedAt = useFlagsStore.getState().swUpdateDismissedAt;
      if (dismissedAt && Date.now() - Date.parse(dismissedAt) < SUPPRESS_MS) return;
      useRuntimeStore.getState().showToast('swUpdate', COPY.swUpdate, Infinity, {
        label: COPY.swUpdateReload,
        onClick: () => {
          track('sw-update-reload');
          void updateSW(true);
        },
      });
    },
  });
  window.addEventListener('appinstalled', () => track('pwa-installed'));
}

/** Called when the user dismisses the update toast. */
export function dismissSwUpdate(): void {
  useFlagsStore.getState().set({ swUpdateDismissedAt: new Date().toISOString() });
}
