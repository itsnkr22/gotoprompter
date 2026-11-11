// Pin the controls dock to the visual viewport (spec §6.4.5). iOS Safari paints position:fixed
// elements near the visual viewport's bottom but hit-tests them at the layout position.

export const DOCK_BOTTOM_MARGIN = 32; // matches `bottom-8`

export function computeDockTop(
  vv: { offsetTop: number; height: number },
  dockHeight: number,
): number {
  return vv.offsetTop + vv.height - dockHeight - DOCK_BOTTOM_MARGIN;
}

export function updateDockPosition(dock: HTMLElement): void {
  if (document.body.classList.contains('vp-rotated')) {
    dock.style.top = '';
    dock.style.bottom = '';
    return;
  }
  if (dock.offsetHeight === 0) return;
  const vv = window.visualViewport;
  if (!vv) return;
  dock.style.bottom = 'auto';
  dock.style.top = `${computeDockTop(vv, dock.offsetHeight)}px`;
}

/** Installs listeners and runs one update. Returns an uninstaller. */
export function pinDockToVisualViewport(
  dock: HTMLElement,
  prompterContainer: HTMLElement,
): () => void {
  const update = (): void => updateDockPosition(dock);
  const vv = window.visualViewport;
  vv?.addEventListener('resize', update);
  vv?.addEventListener('scroll', update);
  const onOrientation = (): void => {
    requestAnimationFrame(update);
    setTimeout(update, 300);
  };
  window.addEventListener('orientationchange', onOrientation);
  window.addEventListener('pageshow', update);
  const observer = new MutationObserver(() => requestAnimationFrame(update));
  observer.observe(prompterContainer, { attributes: true, attributeFilter: ['class', 'style'] });
  requestAnimationFrame(update);
  return () => {
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    window.removeEventListener('orientationchange', onOrientation);
    window.removeEventListener('pageshow', update);
    observer.disconnect();
  };
}
