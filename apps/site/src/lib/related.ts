// Related posts by shared keywords (03-site.md §5.3).
export interface PostLike {
  id: string;
  data: { keywords: string[]; date: Date };
}

export function relatedPosts<T extends PostLike>(current: T, all: T[], max = 3): T[] {
  const mine = new Set(current.data.keywords.map((k) => k.toLowerCase()));
  const others = all.filter((p) => p.id !== current.id);
  const scored = others
    .map((p) => ({ p, score: p.data.keywords.filter((k) => mine.has(k.toLowerCase())).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.data.date.getTime() - a.p.data.date.getTime())
    .map((x) => x.p);
  const picked = scored.slice(0, max);
  if (picked.length < max) {
    const newest = others
      .filter((p) => !picked.includes(p))
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
    picked.push(...newest.slice(0, max - picked.length));
  }
  return picked;
}

/** Posts whose title or keywords mention `term` (e.g. "Zoom"), topped up with the newest posts. */
export function postsAbout<T extends PostLike & { data: { title: string } }>(
  term: string,
  all: T[],
  max = 3,
): T[] {
  const t = term.toLowerCase();
  const newest = [...all].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const matching = newest.filter(
    (p) =>
      p.data.title.toLowerCase().includes(t) ||
      p.data.keywords.some((k) => k.toLowerCase().includes(t)),
  );
  return [...matching, ...newest.filter((p) => !matching.includes(p))].slice(0, max);
}
