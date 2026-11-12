// Keeps the screen awake while the prompter is in use: a display that dims or locks mid-read
// stops the scroll and, on phones, the microphone.
interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', cb: () => void): void;
}
interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

let wanted = false;
let sentinel: WakeLockSentinelLike | null = null;
let listening = false;
let acquiring = false;

function api(): WakeLockLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock;
}

async function acquire(): Promise<void> {
  const wakeLock = api();
  if (!wakeLock || !wanted || sentinel || acquiring) return;
  if (document.visibilityState !== 'visible') return;
  acquiring = true;
  try {
    const s = await wakeLock.request('screen');
    acquiring = false;
    if (!wanted) {
      void s.release().catch(() => {});
      return;
    }
    sentinel = s;
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null;
    });
  } catch {
    acquiring = false;
    /* denied (battery saver, no user gesture yet): try again on the next change */
  }
}

// The browser releases the lock whenever the tab is hidden; take it back when it returns.
const onVisibility = (): void => {
  if (document.visibilityState === 'visible') void acquire();
};

/** Hold or release the screen wake lock. Safe to call repeatedly and where unsupported. */
export function setWakeLock(on: boolean): void {
  wanted = on;
  if (typeof document === 'undefined') return;
  if (on) {
    if (!listening) {
      document.addEventListener('visibilitychange', onVisibility);
      listening = true;
    }
    void acquire();
  } else {
    const s = sentinel;
    sentinel = null;
    if (s && !s.released) void s.release().catch(() => {});
  }
}

export function wakeLockHeld(): boolean {
  return sentinel !== null;
}
