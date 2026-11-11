// Toast primitive (spec §13).
import { useEffect } from 'react';
import type { Toast as ToastModel } from '../state/runtime';

interface Props {
  toast: ToastModel;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!Number.isFinite(toast.until)) return;
    const ms = Math.max(0, toast.until - Date.now());
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [toast.until, onDismiss]);

  return (
    <div
      id={`toast-${toast.id}`}
      role="status"
      aria-live="polite"
      data-testid="toast"
      className="pointer-events-auto flex w-[calc(100%-2rem)] max-w-[20rem] items-start gap-3 rounded-xl border border-accent/40 bg-surface px-4 py-3 shadow-2xl shadow-black/50"
    >
      <p className="flex-1 text-sm leading-snug text-fg">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          className="rounded bg-accent px-2 py-1 text-xs font-bold text-accent-contrast"
          onClick={toast.action.onClick}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        title="Dismiss"
        className="-mt-0.5 ml-1 text-muted hover:text-fg"
        onClick={onDismiss}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
