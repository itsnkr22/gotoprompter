// Umami wrapper (docs/spec/03-site.md §9). No-op when analytics is not configured.
export function track(name: string, data?: Record<string, unknown>): void {
  try {
    window.umami?.track(name, data);
  } catch {
    /* ignore */
  }
}
