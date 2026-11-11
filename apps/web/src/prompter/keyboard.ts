// Prompter keyboard shortcuts (spec §6.6).
import { useEffect } from 'react';
import { resetApp, restartScript } from '../script/load-script';
import { services } from '../services';
import { useRuntimeStore } from '../state/runtime';
import { handleMicClick } from './mic-state';

const EDITABLE = 'input, textarea, select, [contenteditable]';

export function isEditableTarget(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.closest?.(EDITABLE);
}

/** Returns true when the key was handled. Exported for unit tests. */
export function handlePrompterKey(event: KeyboardEvent): boolean {
  const runtime = useRuntimeStore.getState();
  if (runtime.phase !== 'prompter' || runtime.openModal) return false;
  if (isEditableTarget(event.target)) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const c = services.controller;
  switch (event.key) {
    case ' ':
      event.preventDefault();
      void handleMicClick();
      return true;
    case 'r':
    case 'R':
      restartScript();
      return true;
    case 'Escape':
      if (runtime.settingsOpen) runtime.toggleSettings(false);
      else resetApp();
      return true;
    case 's':
    case 'S':
      runtime.toggleSettings();
      return true;
    case 'ArrowLeft':
      event.preventDefault();
      c?.navigateParagraph(-1);
      return true;
    case 'ArrowRight':
      event.preventDefault();
      c?.navigateParagraph(1);
      return true;
    case 'ArrowUp':
      event.preventDefault();
      c?.step(-1);
      return true;
    case 'ArrowDown':
      event.preventDefault();
      c?.step(1);
      return true;
    default:
      return false;
  }
}

export function usePrompterShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      handlePrompterKey(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
