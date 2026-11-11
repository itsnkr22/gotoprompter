// Google Doc import modal (spec §12.1, §12.3).
import { useState } from 'react';
import { track } from '../analytics';
import { fetchGoogleDocText } from '../script/gdoc';
import { loadScript } from '../script/load-script';
import { useRuntimeStore } from '../state/runtime';
import { Modal } from './Modal';
import { COPY } from './copy';

export function GoogleDocImportModal() {
  const closeModal = useRuntimeStore((r) => r.closeModal);
  const setScriptText = useRuntimeStore((r) => r.setScriptText);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const importDoc = async (): Promise<void> => {
    const value = url.trim();
    if (!value) {
      setError(COPY.gdocInvalidUrl);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const text = await fetchGoogleDocText(value);
      track('import-google-doc-success');
      setScriptText(text);
      closeModal();
      loadScript(text, value);
    } catch (e) {
      const message = e instanceof Error ? e.message : COPY.gdocUnavailable;
      track('import-google-doc-error', { error: message });
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal id="googleDocImport" title={COPY.googleDocImport.title} onClose={closeModal}>
      <p className="mb-4 text-sm leading-relaxed text-fg/90">{COPY.googleDocImport.body}</p>
      <label
        htmlFor="googleDocUrlInput"
        className="mb-2 block text-xs font-bold tracking-wider text-muted uppercase"
      >
        Google Doc link
      </label>
      <input
        id="googleDocUrlInput"
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void importDoc();
        }}
        placeholder="https://docs.google.com/document/d/…/edit"
        className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-base text-fg placeholder:text-muted/70 focus:ring-2 focus:ring-accent focus:outline-none"
      />
      {error ? (
        <p id="googleDocError" role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-3">
        <button
          id="pasteGoogleDocUrlBtn"
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-raised px-4 py-2.5 text-sm font-medium text-fg hover:bg-line"
          onClick={() => {
            track('paste-google-doc-url');
            void navigator.clipboard.readText().then(
              (t) => setUrl(t.trim()),
              () => setError(COPY.pasteBlocked),
            );
          }}
        >
          {COPY.googleDocImport.paste}
        </button>
        <button
          id="confirmGoogleDocImportBtn"
          type="button"
          disabled={busy}
          aria-busy={busy}
          className="flex flex-1 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
          onClick={() => void importDoc()}
        >
          {busy ? COPY.googleDocImport.importing : COPY.googleDocImport.import}
        </button>
      </div>
    </Modal>
  );
}
