// Island: searchable support centre (docs/spec/03-site.md §7.3).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { track } from '../analytics';
import { indexArticle, search, type SupportArticle } from '../lib/support-search';

interface Props {
  articles: SupportArticle[];
  appName: string;
  supportEmail: string;
}

type Platform = 'All' | 'macOS' | 'web';

const CHECKLIST = [
  'Your name, Mac model or browser, OS and app version',
  'What went wrong and how to reproduce it',
  'A screenshot or short recording',
  "Audio issue? Your mic and how it's connected",
  'Purchase issue? The email used at checkout and the last 4 characters of your key',
];

export default function SupportCenter({ articles, appName, supportEmail }: Props) {
  const index = useMemo(() => articles.map(indexArticle), [articles]);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<Platform>('All');
  const [category, setCategory] = useState('All');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Articles matching search + platform (categories and counts derive from this set).
  const matched = useMemo(
    () => search(articles, index, query, { platform }),
    [articles, index, query, platform],
  );
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of matched) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [matched]);
  const visible = category === 'All' ? matched : matched.filter((a) => a.category === category);
  const searching = query.trim() !== '';

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q) setQuery(q);
    const id = location.hash.slice(1);
    if (id && articles.some((a) => a.id === id)) {
      setPlatform('All');
      setCategory('All');
      setOpen(new Set([id]));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    }
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !(document.activeElement instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) setQuery('');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [articles]);

  useEffect(() => {
    if (searching) setOpen(new Set(visible.slice(0, 8).map((a) => a.id)));
  }, [query, searching, visible.length]);

  const toggle = (id: string, isOpen: boolean) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
    track(isOpen ? 'support-answer-open' : 'support-answer-close', { article: id });
  };

  const copyLink = async (id: string) => {
    const url = `${location.origin}/support/#${id}`;
    track('support-answer-copy-link', { article: id });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setCopyFallback(null);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopyFallback(url);
    }
  };

  const moreIn = (cat: string) => {
    track('support-related-topic', { category: cat });
    setQuery('');
    setCategory(cat);
    setOpen(new Set());
  };

  const clearAll = () => {
    setQuery('');
    setPlatform('All');
    setCategory('All');
  };

  const mailBody = encodeURIComponent(
    `Please include:\n${CHECKLIST.map((c) => `- ${c}`).join('\n')}\n\n`,
  );
  const mailto = `mailto:${supportEmail}?subject=Support%20request&body=${mailBody}`;

  return (
    <div class="support">
      <div class="search-row">
        <input
          ref={inputRef}
          type="search"
          placeholder="Search questions and answers"
          aria-label="Search questions and answers"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        <p class="hint muted" aria-live="polite">
          Results update as you type.
        </p>
      </div>
      <div class="chips" role="group" aria-label="Platform">
        {(['All', 'macOS', 'web'] as Platform[]).map((p) => (
          <button
            key={p}
            type="button"
            class="pill"
            aria-pressed={platform === p}
            onClick={() => setPlatform(p)}
          >
            {p === 'All' ? 'All' : `#${p}`}
          </button>
        ))}
      </div>
      <div class="cats" role="group" aria-label="Category">
        <button
          type="button"
          class={`cat ${category === 'All' ? 'active' : ''}`}
          onClick={() => setCategory('All')}
        >
          All questions <span class="count">{matched.length}</span>
        </button>
        {categories.map(([cat, n]) => (
          <button
            key={cat}
            type="button"
            class={`cat ${category === cat ? 'active' : ''}`}
            onClick={() => {
              setCategory(cat);
              track('support-topic-select', { category: cat });
            }}
          >
            {cat} <span class="count">{n}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div class="card empty">
          <h2>No matching answers yet</h2>
          <p class="muted">Try a different phrase or clear your filters.</p>
          <button type="button" class="btn btn-secondary" onClick={clearAll}>
            Clear search &amp; filters
          </button>
          <p class="muted">
            You can always <a href={mailto}>email us</a>.
          </p>
        </div>
      ) : (
        <div class="list">
          {visible.map((a) => (
            <details
              key={a.id}
              id={a.id}
              open={open.has(a.id)}
              onToggle={(e) => toggle(a.id, (e.target as HTMLDetailsElement).open)}
            >
              <summary>
                <span class="q">{a.question}</span>
                <span class="tags">
                  {a.platforms.map((p) => (
                    <span key={p} class="tag">
                      #{p}
                    </span>
                  ))}
                </span>
                <span class="chev" aria-hidden="true">
                  {open.has(a.id) ? '−' : '+'}
                </span>
              </summary>
              <div class="answer" dangerouslySetInnerHTML={{ __html: a.answerHtml }} />
              <div class="actions">
                <button
                  type="button"
                  class="btn btn-ghost small"
                  onClick={() => void copyLink(a.id)}
                >
                  {copied === a.id ? 'Link copied!' : 'Copy link to this answer'}
                </button>
                {(searching || category !== a.category) && (
                  <button
                    type="button"
                    class="btn btn-ghost small"
                    onClick={() => moreIn(a.category)}
                  >
                    More in {a.category}
                  </button>
                )}
                {a.videoUrl && (
                  <a
                    class="btn btn-ghost small"
                    href={a.videoUrl}
                    target="_blank"
                    rel="noopener"
                    onClick={() => track('support-tutorial-open', { article: a.id })}
                  >
                    ▷ Watch the tutorial
                  </a>
                )}
              </div>
              {copyFallback && copied === null && (
                <p class="muted small-text">
                  Copy this link: <code>{copyFallback}</code>
                </p>
              )}
            </details>
          ))}
        </div>
      )}

      <div class="contact">
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => {
            track('support-contact-open');
            dialogRef.current?.showModal();
          }}
        >
          Still need a hand? Email us
        </button>
        <dialog ref={dialogRef} class="contact-dialog">
          <form method="dialog">
            <h2>Email support</h2>
            <p>Please check the FAQ first — your answer might already be there.</p>
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => {
                dialogRef.current?.close();
                inputRef.current?.focus();
              }}
            >
              Search the FAQ
            </button>
            <p>
              <strong>Still need help? Include:</strong>
            </p>
            <ul>
              {CHECKLIST.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <label class="check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked((e.target as HTMLInputElement).checked)}
              />{' '}
              I've looked for an answer in the FAQ
            </label>
            <div class="ctas">
              <a
                class={`btn btn-primary ${checked ? '' : 'disabled'}`}
                href={checked ? mailto : undefined}
                aria-disabled={!checked}
              >
                Open email app
              </a>
              <button
                type="button"
                class="btn btn-secondary"
                disabled={!checked}
                onClick={() => void navigator.clipboard?.writeText(supportEmail)}
              >
                Copy email
              </button>
              <button type="submit" class="btn btn-ghost">
                Close
              </button>
            </div>
          </form>
        </dialog>
      </div>
      <noscript>
        <p class="muted">
          All {articles.length} answers are listed above. {appName} support: {supportEmail}
        </p>
      </noscript>
    </div>
  );
}
