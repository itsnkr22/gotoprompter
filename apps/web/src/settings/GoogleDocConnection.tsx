// Google Doc connection section (spec §9.1, §12.4).
import { useState } from 'react';
import { track } from '../analytics';
import { COPY } from '../modals/copy';
import { fetchGoogleDocText } from '../script/gdoc';
import { loadScript } from '../script/load-script';
import { services } from '../services';
import { useRuntimeStore } from '../state/runtime';

export function GoogleDocConnection() {
  const googleDocUrl = useRuntimeStore((r) => r.googleDocUrl);
  const showToast = useRuntimeStore((r) => r.showToast);
  const [state, setState] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [copied, setCopied] = useState(false);
  if (!googleDocUrl) return null;

  const resync = async (): Promise<void> => {
    track('refresh-google-doc-click');
    setState('syncing');
    try {
      const text = await fetchGoogleDocText(googleDocUrl);
      track('refresh-google-doc-success');
      useRuntimeStore.getState().setScriptText(text);
      loadScript(text, googleDocUrl, { restoreIndex: services.controller?.index ?? 0 });
      setState('synced');
      setTimeout(() => setState('idle'), 1500);
    } catch (e) {
      const message = e instanceof Error ? e.message : COPY.gdocUnavailable;
      track('refresh-google-doc-error', { error: message });
      showToast('generic', message, 6000);
      setState('idle');
    }
  };

  return (
    <div id="refreshGoogleDocContainer" className="mb-4 border-b border-line pb-4">
      <label className="mb-2 block text-xs text-muted">Google Doc Connection</label>
      <div className="flex w-full gap-2">
        <button
          id="refreshGoogleDocBtn"
          type="button"
          disabled={state === 'syncing'}
          className="flex flex-grow items-center gap-2 rounded-lg border border-line bg-raised py-2 pl-4 text-xs font-bold text-fg/90 hover:bg-line disabled:opacity-60"
          onClick={() => void resync()}
        >
          {state === 'syncing' ? 'Syncing…' : state === 'synced' ? 'Synced!' : 'Resync Google Doc'}
        </button>
        <button
          id="copyGoogleDocUrlBtn"
          type="button"
          aria-label="Copy link"
          title="Copy link"
          className="flex items-center justify-center rounded-lg border border-line bg-raised p-2 text-fg/90 hover:bg-line"
          onClick={() => {
            track('copy-google-doc-url-click');
            void navigator.clipboard.writeText(googleDocUrl).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
                showToast('generic', COPY.linkCopied, 2000);
              },
              () => showToast('generic', COPY.copyFailed, 4000),
            );
          }}
        >
          <svg
            className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            {copied ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
