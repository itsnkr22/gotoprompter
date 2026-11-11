// Cookie-less analytics (spec §15). Never throws, never blocks, never sends script content.
import { env } from './env';

type Data = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Data) => unknown };
  }
}

export function installAnalytics(): void {
  if (!env.UMAMI_SRC || !env.UMAMI_WEBSITE_ID || typeof document === 'undefined') return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = env.UMAMI_SRC;
  s.dataset['websiteId'] = env.UMAMI_WEBSITE_ID;
  document.head.appendChild(s);
}

export function track(name: string, data?: Data): void {
  try {
    const r = window.umami?.track(name, data);
    if (r && typeof (r as Promise<unknown>).catch === 'function')
      (r as Promise<unknown>).catch(() => {});
  } catch {
    /* analytics must never interrupt the app */
  }
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** `settings-change` is debounced 1 s per key (Registry D). */
export function trackDebounced(name: string, key: string, data?: Data, ms = 1000): void {
  const id = `${name}:${key}`;
  const prev = debounceTimers.get(id);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    id,
    setTimeout(() => {
      debounceTimers.delete(id);
      track(name, { key, ...data });
    }, ms),
  );
}

/** Anonymous counter beacon per script start (04-api.md §8). */
export function sendStatsEvent(event: 'script_started'): void {
  if (!env.API_BASE || typeof fetch === 'undefined') return;
  try {
    void fetch(`${env.API_BASE}/stats/event`, {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
