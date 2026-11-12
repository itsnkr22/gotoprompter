import { afterEach, describe, expect, it, vi } from 'vitest';
import { setWakeLock, wakeLockHeld } from '../src/prompter/wake-lock';

function installWakeLock() {
  const sentinels: Array<{ released: boolean; fire: () => void }> = [];
  const request = vi.fn(async () => {
    let onRelease = (): void => {};
    const s = {
      released: false,
      release: vi.fn(async () => {
        s.released = true;
        onRelease();
      }),
      addEventListener: (_: 'release', cb: () => void) => {
        onRelease = cb;
      },
      fire: () => {
        s.released = true;
        onRelease();
      },
    };
    sentinels.push(s);
    return s;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinels };
}

describe('wake lock', () => {
  afterEach(() => {
    setWakeLock(false);
    delete (navigator as unknown as Record<string, unknown>)['wakeLock'];
  });

  it('does nothing where the API is missing', async () => {
    setWakeLock(true);
    await Promise.resolve();
    expect(wakeLockHeld()).toBe(false);
  });

  it('acquires once, releases, and re-acquires when the tab becomes visible again', async () => {
    const { request, sentinels } = installWakeLock();
    setWakeLock(true);
    setWakeLock(true);
    await vi.waitFor(() => expect(wakeLockHeld()).toBe(true));
    expect(request).toHaveBeenCalledWith('screen');

    // The browser drops the lock when the tab is hidden.
    sentinels[0]!.fire();
    expect(wakeLockHeld()).toBe(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(wakeLockHeld()).toBe(true));

    setWakeLock(false);
    expect(wakeLockHeld()).toBe(false);
    expect(sentinels.at(-1)!.released).toBe(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(wakeLockHeld()).toBe(false);
  });
});
