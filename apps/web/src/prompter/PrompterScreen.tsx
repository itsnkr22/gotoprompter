// Prompter screen (spec §6). Owns the controller lifetime and applies settings to the DOM.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { services } from '../services';
import { SettingsPanel } from '../settings/SettingsPanel';
import { useRuntimeStore } from '../state/runtime';
import { getSettings, useSettingsStore } from '../state/settings';
import { ControlsDock } from './ControlsDock';
import { applySettingsToDom } from './apply-settings';
import { lockBodyScroll, unlockBodyScroll } from './body-scroll-lock';
import { pinDockToVisualViewport } from './dock-pinning';
import { usePrompterShortcuts } from './keyboard';
import { PrompterController } from './prompter-controller';
import { VideoContainer, VideoControls } from '../video/VideoLayer';
import { enterVideoMode, exitVideoMode } from '../video/video-mode';

let videoBusy = false;
async function toggleVideoMode(): Promise<void> {
  if (videoBusy) return;
  videoBusy = true;
  try {
    if (useRuntimeStore.getState().videoMode) exitVideoMode();
    else await enterVideoMode();
  } finally {
    videoBusy = false;
  }
}

export function PrompterScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  const settingsOpen = useRuntimeStore((r) => r.settingsOpen);
  const settings = useSettingsStore();
  usePrompterShortcuts();

  // Controller lifetime = screen lifetime.
  useLayoutEffect(() => {
    const container = scriptRef.current;
    const scrollEl = scrollRef.current;
    const prompter = containerRef.current;
    if (!container || !scrollEl || !prompter) return;
    const controller = new PrompterController({
      container,
      scrollEl,
      getSettings,
      onIndexChange: (i) => useRuntimeStore.getState().setCurrentIndex(i),
    });
    services.controller = controller;
    controller.load(services.tokens, { locale: useRuntimeStore.getState().selectedLanguage });
    applySettingsToDom(getSettings(), {
      appRoot: document.getElementById('appRoot'),
      prompterContainer: prompter,
      scrollContainer: scrollEl,
      scriptContent: container,
    });
    if (services.pendingRestoreIndex !== null) {
      controller.setIndex(services.pendingRestoreIndex, { animate: false });
      services.pendingRestoreIndex = null;
    } else {
      controller.scrollToCurrent({ animate: false });
    }
    lockBodyScroll();
    const dock = document.getElementById('mainControlsDock');
    const unpin = dock ? pinDockToVisualViewport(dock, prompter) : () => {};
    return () => {
      exitVideoMode();
      unpin();
      unlockBodyScroll();
      controller.destroy();
      if (services.controller === controller) services.controller = null;
      document.body.classList.remove('vp-rotated');
    };
  }, []);

  // Live settings application.
  useEffect(() => {
    applySettingsToDom(settings, {
      appRoot: document.getElementById('appRoot'),
      prompterContainer: containerRef.current,
      scrollContainer: scrollRef.current,
      scriptContent: scriptRef.current,
    });
    document.getElementById('mainControlsDock')?.dispatchEvent(new Event('vp-relayout'));
  }, [settings]);

  return (
    <div ref={containerRef} id="prompterContainer" className="fixed inset-0 z-50 h-full w-full">
      <div id="scrollWrapper" className="relative flex h-full w-full min-h-0 flex-grow flex-col">
        <div
          ref={scrollRef}
          id="scrollContainer"
          className="vp-no-scrollbar relative h-full w-full flex-grow overflow-y-auto"
          style={{ touchAction: 'pan-y' }}
        >
          <div id="topSpacer" className="h-[45vh]" />
          <div
            ref={scriptRef}
            id="scriptContent"
            role="document"
            aria-live="off"
            className="mx-auto max-w-5xl px-8 pb-[50vh] outline-none"
          />
        </div>
        <VideoControls />
      </div>
      <VideoContainer />
      <ControlsDock onVideo={() => void toggleVideoMode()} />
      {settingsOpen ? <SettingsPanel /> : null}
    </div>
  );
}
