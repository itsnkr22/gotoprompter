// Token rendering (spec §6.2). One <span> per token, built in a fragment, event delegation for taps.
import type { ScriptToken } from '@gotoprompter/prompter-core';

export function tokenClass(t: ScriptToken): string {
  if (t.kind === 'break') return 'vp-break';
  if (t.kind === 'stop') return 'vp-word vp-stop';
  if (t.skip) return 'vp-word vp-note';
  return 'vp-word vp-word-future';
}

export function renderTokens(
  container: HTMLElement,
  tokens: readonly ScriptToken[],
): HTMLElement[] {
  const frag = document.createDocumentFragment();
  const spans: HTMLElement[] = new Array(tokens.length);
  for (const t of tokens) {
    const span = document.createElement('span');
    span.id = `w-${t.index}`;
    span.dataset['i'] = String(t.index);
    span.className = tokenClass(t);
    if (t.kind !== 'break') span.textContent = t.raw;
    spans[t.index] = span;
    frag.appendChild(span);
  }
  container.replaceChildren(frag);
  return spans;
}

/** Installs one click listener on the container; returns an uninstaller. */
export function installTapDelegation(
  container: HTMLElement,
  tokens: () => readonly ScriptToken[],
  onTap: (index: number) => void,
): () => void {
  const handler = (ev: Event): void => {
    const target = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-i]');
    if (!target) return;
    const index = Number(target.dataset['i']);
    const t = tokens()[index];
    if (!t || t.skip) return;
    onTap(index);
  };
  container.addEventListener('click', handler);
  return () => container.removeEventListener('click', handler);
}
