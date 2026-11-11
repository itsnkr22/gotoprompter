// Google Docs import (spec §12.2).
import { env } from '../env';
import { COPY } from '../modals/copy';

const DOC_ID_RE = /\/document\/d\/([a-zA-Z0-9-_]{25,110})/;
export const GDOC_TIMEOUT_MS = 6000;

export function extractDocId(url: string): string | null {
  const m = DOC_ID_RE.exec(url);
  return m?.[1] ?? null;
}

export function messageForStatus(status: number): string {
  if (status === 400) return COPY.gdocInvalidUrl;
  if (status === 403 || status === 404) return COPY.gdocNotPublic;
  if (status === 429) return COPY.gdocRateLimited;
  return COPY.gdocUnavailable;
}

export function looksLikeHtml(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('<!DOCTYPE html') || t.startsWith('<!doctype html') || t.includes('<html');
}

export async function fetchGoogleDocText(
  docUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const id = extractDocId(docUrl.trim());
  if (!id) throw new Error(COPY.gdocInvalidUrl);
  if (!env.API_BASE) throw new Error(COPY.gdocUnavailable);
  let res: Response;
  try {
    res = await fetchImpl(`${env.API_BASE}/gdoc?id=${encodeURIComponent(id)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(GDOC_TIMEOUT_MS),
    });
  } catch {
    throw new Error(COPY.gdocUnavailable);
  }
  if (!res.ok) throw new Error(messageForStatus(res.status));
  const text = await res.text();
  if (looksLikeHtml(text)) throw new Error(COPY.gdocNotPublic);
  if (text.trim() === '') throw new Error(COPY.gdocEmpty);
  return text;
}
