// Default FAQs + per-page overrides with placeholder substitution (03-site.md §4.3).
import { APP_NAME } from '../brand';

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export const OFFLINE_OR_PRIVACY =
  'Everything happens on your Mac; no audio is sent anywhere. It works offline.';

export function fillPlatform(
  s: string,
  platformName: string,
  offline = OFFLINE_OR_PRIVACY,
): string {
  return s
    .replace(/\{\{PLATFORM_NAME\}\}/g, platformName)
    .replace(/\{\{APP_NAME\}\}/g, APP_NAME)
    .replace(/\{\{FAQ_OFFLINE_OR_PRIVACY\}\}/g, offline);
}

export function mergeFaqs(
  defaults: FaqItem[],
  overrides: Record<string, { q?: string; a?: string }>,
  extras: FaqItem[],
  platformName: string,
  offline = OFFLINE_OR_PRIVACY,
): FaqItem[] {
  const merged = defaults
    .map((f) => (overrides[f.id] ? { ...f, ...overrides[f.id] } : f))
    .concat(extras);
  return merged.map((f) => ({
    id: f.id,
    q: fillPlatform(f.q, platformName, offline),
    a: fillPlatform(f.a, platformName, offline),
  }));
}

/** Pulls the `<li>` texts out of a how-to answer for the HowTo JSON-LD. */
export function howToSteps(html: string): string[] {
  return [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((m) => (m[1] ?? '').replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}
