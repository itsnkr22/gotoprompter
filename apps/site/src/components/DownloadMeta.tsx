// Island: latest Mac release details (docs/spec/03-site.md §3.5).
import { useEffect, useState } from 'preact/hooks';
import { track } from '../analytics';
import { downloadsLatestUrl, latestRelease, releaseNotes, type LatestRelease } from '../api';
import { formatBytes, formatDate } from '../lib/format';

interface Props {
  appName: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; release: LatestRelease; notes: string | null }
  | { kind: 'error' }
  | { kind: 'coming-soon' };

export default function DownloadMeta({ appName }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const release = await latestRelease();
        let notes: string | null = null;
        try {
          notes = await releaseNotes(release.version);
        } catch {
          notes = null;
        }
        if (!cancelled) setState({ kind: 'ready', release, notes });
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 404) {
          try {
            const head = await fetch(downloadsLatestUrl, { method: 'HEAD', redirect: 'manual' });
            if (!cancelled)
              setState(head.status === 404 ? { kind: 'coming-soon' } : { kind: 'error' });
          } catch {
            if (!cancelled) setState({ kind: 'error' });
          }
        } else if (!cancelled) setState({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = (sha: string) => {
    navigator.clipboard?.writeText(sha).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (state.kind === 'ready') {
    const r = state.release;
    return (
      <div class="download-meta">
        <a
          class="btn btn-primary big"
          href={r.download_url}
          data-umami-event="download-click"
          data-umami-event-version={r.version}
          onClick={() => track('download-click', { version: r.version })}
        >
          Download {appName} {r.version}
        </a>
        <p class="meta muted">
          {formatBytes(r.size_bytes)} · macOS {r.min_os} or later · Apple silicon &amp; Intel ·{' '}
          {formatDate(r.published_at)}
        </p>
        <p class="sha">
          SHA-256: <code>{r.sha256}</code>{' '}
          <button type="button" class="btn btn-ghost small" onClick={() => copy(r.sha256)}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </p>
        {state.notes && (
          <details class="notes">
            <summary>What's new in {r.version}</summary>
            <div class="prose" dangerouslySetInnerHTML={{ __html: state.notes }} />
          </details>
        )}
      </div>
    );
  }
  return (
    <div class="download-meta">
      <a class="btn btn-primary big" href={downloadsLatestUrl} data-umami-event="download-click">
        Download for Mac
      </a>
      {state.kind === 'loading' && <p class="meta muted skeleton">Loading release details…</p>}
      {state.kind === 'coming-soon' && <p class="meta muted">Coming soon</p>}
      {state.kind === 'error' && (
        <p class="meta muted">
          Release details are unavailable right now; the download link still works.
        </p>
      )}
    </div>
  );
}
