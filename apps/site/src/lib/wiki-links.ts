// Obsidian-style wiki links → markdown (docs/spec/03-site.md §5.2). Pure transform + remark plugin.
import { readdirSync } from 'node:fs';

export const slugify = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

/** Converts `![[img]]`, `![[img|300]]`, `[[note]]`, `[[note|text]]`, `[[note#Heading]]` in raw markdown. */
export function transformWikiLinks(text: string, knownSlugs: readonly string[] = []): string {
  const known = new Set(knownSlugs);
  const withImages = text.replace(
    /!\[\[([^\]|]+?)(?:\|(\d+))?\]\]/g,
    (_m, file: string, width?: string) => {
      const name = file.trim();
      return `<img src="/images/blog/${name}" alt="${name}"${width ? ` width="${width}"` : ''}>`;
    },
  );
  return withImages.replace(
    /\[\[([^\]|#]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]/g,
    (_m, target: string, heading?: string, label?: string) => {
      const raw = target.trim();
      const slug = known.has(raw) ? raw : slugify(raw);
      const text = (label ?? raw).trim();
      const hash = heading ? `#${slugify(heading)}` : '';
      return `[${text}](/blog/${slug}/${hash})`;
    },
  );
}

export function readBlogSlugs(dir = new URL('../content/blog/', import.meta.url)): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

/**
 * Remark plugin. Astro gives us the parsed tree, so this rewrites `text` nodes in place: wiki
 * syntax never contains markdown-significant characters, so the result is re-parsed as inline
 * markdown by replacing the text node with an `html` node (images) or a `link` node.
 */
export function wikiLinks() {
  const slugs = readBlogSlugs();
  return (tree: MdNode) => {
    const visit = (node: MdNode, parent: MdNode | null, index: number) => {
      if (node.type === 'text' && node.value && /\[\[/.test(node.value) && parent?.children) {
        parent.children.splice(index, 1, ...explode(node.value, slugs));
        return;
      }
      if (node.children)
        for (let i = node.children.length - 1; i >= 0; i--) visit(node.children[i]!, node, i);
    };
    visit(tree, null, 0);
  };
}

/** Splits a text value into text / image(html) / link nodes. */
function explode(value: string, slugs: readonly string[]): MdNode[] {
  const out: MdNode[] = [];
  const re = /(!?\[\[[^\]]+\]\])/g;
  let last = 0;
  for (const m of value.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: 'text', value: value.slice(last, i) });
    const token = m[1]!;
    const md = transformWikiLinks(token, slugs);
    if (token.startsWith('!')) out.push({ type: 'html', value: md });
    else {
      const lm = /^\[([^\]]*)\]\(([^)]+)\)$/.exec(md);
      if (lm)
        out.push({
          type: 'link',
          url: lm[2],
          children: [{ type: 'text', value: lm[1] }],
        } as MdNode);
      else out.push({ type: 'text', value: token });
    }
    last = i + token.length;
  }
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}
