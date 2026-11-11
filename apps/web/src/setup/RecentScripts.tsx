// Recent scripts cards (spec §4.7).
import { track } from '../analytics';
import { COPY } from '../modals/copy';
import { loadScript } from '../script/load-script';
import { useHistoryStore } from '../state/history';
import { useRuntimeStore } from '../state/runtime';

export function RecentScripts() {
  const items = useHistoryStore((s) => s.items);
  const clear = useHistoryStore((s) => s.clear);
  const setScriptText = useRuntimeStore((s) => s.setScriptText);

  return (
    <div
      id="historySection"
      className="mt-4 border-t border-line pt-6 short-landscape:mt-2 short-landscape:pt-3"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted">Recent scripts</h3>
        {items.length > 0 ? (
          <button
            id="clearHistoryBtn"
            type="button"
            className="text-xs text-danger hover:underline"
            onClick={() => {
              if (window.confirm(COPY.clearHistoryConfirm)) {
                track('history-clear');
                clear();
              }
            }}
          >
            Clear History
          </button>
        ) : null}
      </div>
      <div
        id="historyList"
        className="vp-no-scrollbar flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:max-h-48 md:grid-cols-2 md:overflow-y-auto md:pb-0"
      >
        {items.length === 0 ? (
          <div className="w-full rounded-lg border border-dashed border-line py-8 text-center text-sm text-muted">
            No saved scripts yet
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid="history-card"
              className="group flex min-w-[85%] snap-center items-center justify-between rounded border border-line bg-raised p-3 text-left shadow-sm transition hover:border-accent md:min-w-0"
              onClick={() => {
                track('history-load', { tag: item.tag ?? 'user' });
                setScriptText(item.text);
                loadScript(item.text, item.googleDocUrl ?? null);
              }}
            >
              <div className="mr-2 flex flex-col overflow-hidden text-left">
                <span className="truncate font-mono text-sm font-medium text-fg/90">
                  {item.preview}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                  {item.tag === 'demo' ? (
                    <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-accent uppercase">
                      demo
                    </span>
                  ) : null}
                  {item.googleDocUrl ? (
                    <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-blue-400 uppercase">
                      Google Doc
                    </span>
                  ) : null}
                </div>
              </div>
              <svg
                className="h-4 w-4 shrink-0 text-accent opacity-0 transition group-hover:opacity-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
