// Extracts a trailing "## Frequently asked questions" section into [{q, a}] (03-site.md §5.3).
export interface Faq {
  q: string;
  a: string;
}

export function faqFromMarkdown(body: string): Faq[] {
  const m = /^##\s+Frequently asked questions\s*$/im.exec(body);
  if (!m) return [];
  let section = body.slice(m.index + m[0].length);
  const next = /^##\s+/m.exec(section);
  if (next) section = section.slice(0, next.index);
  const hr = /^---\s*$/m.exec(section);
  if (hr) section = section.slice(0, hr.index);
  const out: Faq[] = [];
  for (const para of section.split(/\n\s*\n/)) {
    const pm = /^\*\*(.+?\?)\*\*\s*([\s\S]+)$/.exec(para.trim());
    if (pm && pm[1] && pm[2]) out.push({ q: pm[1].trim(), a: pm[2].replace(/\s+/g, ' ').trim() });
  }
  return out;
}

/** Hoists the first blockquote that appears before the first H2 (the TL;DR) out of the markdown. */
export function splitTldr(body: string): { tldr: string | null; rest: string } {
  const firstH2 = body.search(/^##\s+/m);
  const head = firstH2 >= 0 ? body.slice(0, firstH2) : body;
  const bq = /(^>.*(?:\n>.*)*)/m.exec(head);
  if (!bq || bq.index === undefined) return { tldr: null, rest: body };
  const tldr = bq[1]!
    .split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join(' ')
    .trim();
  const rest = body.slice(0, bq.index) + body.slice(bq.index + bq[1]!.length);
  return { tldr, rest };
}
