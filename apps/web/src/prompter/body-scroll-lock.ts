// iOS body scroll lock (spec §5.6).
// Reason: iOS standalone/landscape can leave a negative visual-viewport offset so taps land
// ~60 px away from the painted control. Pinning the body at scroll 0 keeps the layout and
// visual coordinate systems aligned while the full-screen prompter is open.
import { isIOS } from '../platform';

let locked = false;
let installed = false;

export function isBodyScrollLocked(): boolean {
  return locked;
}

export function lockBodyScroll(): void {
  if (locked || !isIOS()) return;
  locked = true;
  const b = document.body;
  const h = document.documentElement;
  h.style.overflow = 'hidden';
  Object.assign(b.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    overscrollBehavior: 'none',
  });
  b.classList.add('vp-locked');
  window.scrollTo(0, 0);
  installListeners();
}

export function unlockBodyScroll(): void {
  if (!locked) return;
  locked = false;
  const b = document.body;
  document.documentElement.style.overflow = '';
  for (const k of [
    'position',
    'inset',
    'width',
    'height',
    'overflow',
    'overscrollBehavior',
  ] as const) {
    b.style[k] = '';
  }
  b.classList.remove('vp-locked');
  window.scrollTo(0, 0);
}

export function keepScrollZeroWhileLocked(): void {
  if (locked && Math.round(window.scrollY) !== 0) window.scrollTo(0, 0);
}

function installListeners(): void {
  if (installed) return;
  installed = true;
  window.visualViewport?.addEventListener('resize', keepScrollZeroWhileLocked);
  window.visualViewport?.addEventListener('scroll', keepScrollZeroWhileLocked);
  window.addEventListener('orientationchange', () => setTimeout(keepScrollZeroWhileLocked, 60));
}
