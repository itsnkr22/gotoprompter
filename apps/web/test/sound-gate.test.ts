import { describe, expect, it } from 'vitest';
import { SOUND_HOLD_MS, rmsOf, soundThreshold } from '../src/scroll/sound-gate';

describe('sound gate maths', () => {
  it('threshold follows the engine formula', () => {
    expect(soundThreshold(1)).toBeCloseTo(0.002);
    expect(soundThreshold(0)).toBeCloseTo(0.05);
    expect(soundThreshold(0.75)).toBeCloseTo(0.014);
    expect(SOUND_HOLD_MS).toBe(250);
  });

  it('rms of silence is 0 and of a square wave is 1', () => {
    expect(rmsOf(new Uint8Array(256).fill(128))).toBe(0);
    const square = new Uint8Array(256);
    for (let i = 0; i < 256; i++) square[i] = i % 2 ? 0 : 256 - 1;
    expect(rmsOf(square)).toBeGreaterThan(0.98);
    expect(rmsOf(new Uint8Array(0))).toBe(0);
  });
});
