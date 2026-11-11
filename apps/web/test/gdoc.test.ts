import { describe, expect, it, vi } from 'vitest';
import { COPY } from '../src/modals/copy';
import {
  extractDocId,
  fetchGoogleDocText,
  looksLikeHtml,
  messageForStatus,
} from '../src/script/gdoc';

vi.mock('../src/env', () => ({
  env: { API_BASE: 'https://api.test', TEST_HOOKS: false, UMAMI_SRC: '', UMAMI_WEBSITE_ID: '' },
}));

const ID = 'a'.repeat(44);
const URL_OK = `https://docs.google.com/document/d/${ID}/edit`;

function fakeFetch(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as Response);
}

describe('gdoc', () => {
  it('extracts ids from the supported URL shapes', () => {
    expect(extractDocId(URL_OK)).toBe(ID);
    expect(extractDocId(`https://docs.google.com/document/d/${ID}/export?format=txt`)).toBe(ID);
    expect(extractDocId('https://example.com')).toBeNull();
    expect(extractDocId('https://docs.google.com/document/d/short/edit')).toBeNull();
  });

  it('maps statuses to copy', () => {
    expect(messageForStatus(400)).toBe(COPY.gdocInvalidUrl);
    expect(messageForStatus(403)).toBe(COPY.gdocNotPublic);
    expect(messageForStatus(404)).toBe(COPY.gdocNotPublic);
    expect(messageForStatus(429)).toBe(COPY.gdocRateLimited);
    expect(messageForStatus(500)).toBe(COPY.gdocUnavailable);
    expect(looksLikeHtml('<!DOCTYPE html><html>')).toBe(true);
    expect(looksLikeHtml('plain text')).toBe(false);
  });

  it('returns the text and throws the right messages', async () => {
    await expect(fetchGoogleDocText('nope', fakeFetch(200, 'x'))).rejects.toThrow(
      COPY.gdocInvalidUrl,
    );
    await expect(fetchGoogleDocText(URL_OK, fakeFetch(200, 'hello doc'))).resolves.toBe(
      'hello doc',
    );
    await expect(fetchGoogleDocText(URL_OK, fakeFetch(403, ''))).rejects.toThrow(
      COPY.gdocNotPublic,
    );
    await expect(fetchGoogleDocText(URL_OK, fakeFetch(200, '   '))).rejects.toThrow(COPY.gdocEmpty);
    await expect(fetchGoogleDocText(URL_OK, fakeFetch(200, '<html>login</html>'))).rejects.toThrow(
      COPY.gdocNotPublic,
    );
    const failing = vi.fn().mockRejectedValue(new Error('timeout'));
    await expect(fetchGoogleDocText(URL_OK, failing)).rejects.toThrow(COPY.gdocUnavailable);
    const call = fakeFetch(200, 'x') as ReturnType<typeof vi.fn>;
    await fetchGoogleDocText(URL_OK, call as unknown as typeof fetch);
    expect(call.mock.calls[0]![0]).toBe(`https://api.test/gdoc?id=${ID}`);
  });
});
