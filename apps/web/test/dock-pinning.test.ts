import { describe, expect, it } from 'vitest';
import {
  DOCK_BOTTOM_MARGIN,
  computeDockTop,
  updateDockPosition,
} from '../src/prompter/dock-pinning';

describe('dock pinning', () => {
  it('computes top from the visual viewport', () => {
    expect(computeDockTop({ offsetTop: 10, height: 600 }, 64)).toBe(
      10 + 600 - 64 - DOCK_BOTTOM_MARGIN,
    );
  });

  it('clears positioning when rotated and skips hidden docks', () => {
    const dock = document.createElement('div');
    dock.style.top = '5px';
    document.body.classList.add('vp-rotated');
    updateDockPosition(dock);
    expect(dock.style.top).toBe('');
    document.body.classList.remove('vp-rotated');
    updateDockPosition(dock); // offsetHeight 0 in jsdom → untouched
    expect(dock.style.top).toBe('');
  });
});
