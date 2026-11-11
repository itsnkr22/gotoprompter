// Weighted support search shared by the island and the tests (docs/spec/03-site.md §7.2).
import brand from '@gotoprompter/config/brand' with { type: 'json' };

const APP_NAME: string = (brand as { APP_NAME: string }).APP_NAME;

export const ALIAS_GROUPS: string[][] = [
  [
    'license',
    'licence',
    'purchase',
    'paid',
    'payment',
    'buy',
    'bought',
    'key',
    'activation',
    'activate',
  ],
  ['invoice', 'receipt', 'billing', 'tax', 'vat'],
  ['microphone', 'mic', 'audio', 'input'],
  ['text', 'words', 'word', 'script', 'scripts'],
  ['scrolling', 'scroll', 'moving', 'move', 'follow', 'following'],
  ['work', 'works', 'working'],
  ['stuck', 'frozen', 'freeze', 'stopped', 'stops', 'stop'],
  ['slow', 'lag', 'lagging', 'delay', 'delayed', 'faster', 'speed', 'behind'],
  ['record', 'recording', 'film', 'filming', 'video', 'camera'],
  ['rotate', 'rotation', 'sideways', 'landscape', 'horizontal'],
  ['transparent', 'transparency', 'opacity'],
  ['hide', 'hidden', 'invisible', 'capture', 'share', 'sharing'],
  ['monitor', 'display', 'screen', 'elgato'],
  ['import', 'upload', 'paste', 'load', 'clipboard'],
  ['start', 'begin', 'launch', 'open'],
  ['natural', 'gaze', 'eyes', 'eyeline'],
  ['sync', 'syncing', 'transfer', 'restore', 'move'],
  ['mac', 'macos', 'macbook'],
  ['web', 'browser', 'chrome', 'safari', 'edge', 'pwa'],
  ['update', 'updates', 'sparkle', 'version'],
  ['refund', 'money', 'cancel', 'cancellation'],
  ['deactivate', 'deactivation', 'device', 'devices', 'slot'],
];

const ALIAS = new Map<string, string>();
for (const group of ALIAS_GROUPS) for (const w of group) if (!ALIAS.has(w)) ALIAS.set(w, group[0]!);
export const alias = (w: string): string => ALIAS.get(w) ?? w;

export const IGNORED = new Set(
  'a an the i my me we you your it its is are was be been do does did how what why where when can could would should to for from of on in with and or as at that this have has get app please help not no don t doesn isn aren won cannot want need use using'
    .split(' ')
    .concat(APP_NAME.toLowerCase()),
);

export const normalize = (t: string): string =>
  t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export const phraseText = (t: string): string =>
  normalize(t)
    .replace(/\b(?:doesn|don|isn|aren|won|can)['’]?t\b|\bcannot\b/g, 'not')
    .replace(/\b(?:does|do|is|are|will|can) not\b/g, 'not')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function tokens(t: string): string[] {
  const words = phraseText(t).match(/[a-z0-9]+/g) ?? [];
  const out: string[] = [];
  for (const w of words) {
    if (IGNORED.has(w)) continue;
    const a = alias(w);
    if (!out.includes(a)) out.push(a);
  }
  return out;
}

export function near(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.min(la, lb) < 4 || Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    const diffs: number[] = [];
    for (let i = 0; i < la; i++) if (a[i] !== b[i]) diffs.push(i);
    if (diffs.length === 1) return true;
    if (diffs.length === 2 && diffs[1] === diffs[0]! + 1) {
      const i = diffs[0]!;
      return a[i] === b[i + 1] && a[i + 1] === b[i];
    }
    return false;
  }
  const [longer, shorter] = la > lb ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) {
      i++;
      j++;
    } else if (skipped) return false;
    else {
      skipped = true;
      i++;
    }
  }
  return true;
}

export interface SupportArticle {
  id: string;
  question: string;
  category: string;
  platforms: string[];
  answerHtml: string;
  keywords: string;
  searchPhrases: string[];
  videoUrl: string | null;
}

export interface IndexEntry {
  title: string[];
  hints: string[];
  body: string[];
  phrases: string[];
}

const stripHtml = (h: string): string => h.replace(/<[^>]+>/g, ' ');

export function indexArticle(a: SupportArticle): IndexEntry {
  return {
    title: tokens(a.question),
    hints: tokens(`${a.keywords} ${a.searchPhrases.join(' ')}`),
    body: tokens(`${stripHtml(a.answerHtml)} ${a.platforms.join(' ')}`),
    phrases: a.searchPhrases.map(phraseText),
  };
}

export function score(entry: IndexEntry, query: string): number {
  if (query.trim() === '') return 1;
  const words = tokens(query);
  if (words.length === 0) return 1; // only ignored words → treat as empty query (§11)
  const phrase = ` ${phraseText(query)} `;
  let matched = 0;
  let total = 0;
  for (const w of words) {
    const wf = (field: string[], v: number): number =>
      field.includes(w) ? v : field.some((t) => near(w, t)) ? v * 0.65 : 0;
    const best = Math.max(wf(entry.title, 5), wf(entry.hints, 4), wf(entry.body, 1));
    if (best > 0) {
      matched++;
      total += best;
    }
  }
  const relevant = matched >= Math.ceil(words.length * 0.75);
  const phraseBonus = entry.phrases.some((p) => p && phrase.includes(` ${p} `)) ? 12 : 0;
  return relevant ? total + phraseBonus : 0;
}

export interface SearchOptions {
  platform?: 'All' | 'macOS' | 'web';
  category?: string; // 'All' or a category name
}

/** Articles with score > 0, filtered, sorted by score desc (ties keep original order). */
export function search(
  articles: SupportArticle[],
  index: IndexEntry[],
  query: string,
  opts: SearchOptions = {},
): SupportArticle[] {
  const platform = opts.platform ?? 'All';
  const category = opts.category ?? 'All';
  return articles
    .map((a, i) => ({ a, i, s: score(index[i]!, query) }))
    .filter((x) => x.s > 0)
    .filter((x) => platform === 'All' || x.a.platforms.includes(platform))
    .filter((x) => category === 'All' || x.a.category === category)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.a);
}
