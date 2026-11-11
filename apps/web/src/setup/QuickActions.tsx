// Paste / Copy / Clear / Google Docs buttons (spec §4.3).
import { useState } from 'react';
import { track } from '../analytics';
import { COPY } from '../modals/copy';
import { useRuntimeStore } from '../state/runtime';

const Icon = ({ d }: { d: string }) => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
  </svg>
);

const btn =
  'flex min-h-[44px] items-center gap-1.5 rounded border border-line bg-raised px-3 py-1.5 text-xs text-fg/90 transition-colors hover:bg-line short-landscape:min-h-0 short-landscape:px-2 short-landscape:py-1';

interface Props {
  onFocusTextarea: () => void;
}

export function QuickActions({ onFocusTextarea }: Props) {
  const scriptText = useRuntimeStore((s) => s.scriptText);
  const setScriptText = useRuntimeStore((s) => s.setScriptText);
  const showToast = useRuntimeStore((s) => s.showToast);
  const openModal = useRuntimeStore((s) => s.openModalId);
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    if (!scriptText) return;
    track('copy-script');
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('generic', COPY.copyFailed, 5000);
    }
  };

  const paste = async (): Promise<void> => {
    track('paste-script');
    try {
      const text = await navigator.clipboard.readText();
      setScriptText(text);
      onFocusTextarea();
    } catch {
      showToast('generic', COPY.pasteBlocked, 6000);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap justify-end gap-2 short-landscape:mt-1 short-landscape:gap-1">
      <div className="group relative overflow-hidden rounded-[5px] p-[1px]">
        <div
          className="vp-spin-border absolute inset-[-200%] opacity-60 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
        <button
          id="importGoogleDocBtn"
          type="button"
          title="Sync with a Google Doc"
          className="relative flex h-full min-h-[44px] w-full items-center gap-1.5 rounded-[4px] bg-raised px-3 py-1.5 text-xs text-fg/90 hover:bg-line short-landscape:min-h-0"
          onClick={() => {
            track('open-google-doc-modal');
            openModal('googleDocImport');
          }}
        >
          <Icon d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <span className="short-landscape:hidden">Google Docs Sync</span>
          <span className="hidden short-landscape:inline">Docs Sync</span>
        </button>
      </div>
      <button
        id="copyScriptBtn"
        type="button"
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
        className={btn}
        onClick={() => void copy()}
      >
        <Icon d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        <span className="short-landscape:hidden">{copied ? 'Copied!' : 'Copy'}</span>
      </button>
      <button
        id="clearScriptBtn"
        type="button"
        title="Clear all text"
        aria-label="Clear all text"
        className={btn}
        onClick={() => {
          track('clear-script');
          setScriptText('');
          onFocusTextarea();
        }}
      >
        <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        <span className="short-landscape:hidden">Clear All</span>
      </button>
      <button
        id="pasteScriptBtn"
        type="button"
        title="Paste from clipboard"
        aria-label="Paste from clipboard"
        className={btn}
        onClick={() => void paste()}
      >
        <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <span className="short-landscape:hidden">Paste to Replace</span>
      </button>
    </div>
  );
}
