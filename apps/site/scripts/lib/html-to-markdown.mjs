// Converts a built page's <main> to Markdown for the `.md` page versions, llms.txt and
// llms-full.txt (scripts/ai-files.mjs). Tuned to the markup this site's components emit:
// interactive chrome (buttons, search, tabs, breadcrumbs, the article TOC, decorative icons and
// aria-hidden duplicates) is dropped; FAQ <details> become headed Q&A; button rows become links.
import { NodeType } from 'node-html-parser';

const SKIP_TAGS = new Set([
  'script',
  'style',
  'svg',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'video',
  'audio',
  'iframe',
  'noscript',
  'dialog',
  'template',
  'nav',
  'form',
]);
const SKIP_CLASSES = [
  'tldr',
  'actions',
  'chips',
  'cats',
  'search-row',
  'tabs',
  'chev',
  'ico',
  'hint',
];
const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'div',
  'dl',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'summary',
  'table',
  'ul',
  'astro-island',
]);
/** Containers whose children are a row of links/buttons: rendered as one line joined by " · ". */
const ROW_CLASSES = ['ctas', 'links', 'cta'];

const tag = (el) => (el.rawTagName ?? '').toLowerCase();
const classes = (el) => (el.getAttribute?.('class') ?? '').split(/\s+/).filter(Boolean);
const isEl = (n) => n.nodeType === NodeType.ELEMENT_NODE;
const isText = (n) => n.nodeType === NodeType.TEXT_NODE;

function skipped(el) {
  if (SKIP_TAGS.has(tag(el))) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (el.getAttribute('role') === 'tablist') return true;
  const c = classes(el);
  return SKIP_CLASSES.some((s) => c.includes(s));
}

const isBlock = (n) =>
  isEl(n) &&
  (BLOCK_TAGS.has(tag(n)) || n.childNodes.some((c) => isEl(c) && !skipped(c) && isBlock(c)));

const squash = (s) => s.replace(/\s+/g, ' ');

export function createConverter({ origin, pageUrl }) {
  const abs = (href) => {
    if (!href) return '';
    if (href.startsWith('#')) return `${pageUrl}${href}`;
    if (href.startsWith('/') && !href.startsWith('//')) return `${origin}${href}`;
    return href;
  };

  function inline(node, inLink = false) {
    if (isText(node)) return squash(node.text);
    if (!isEl(node) || skipped(node)) return '';
    const t = tag(node);
    const kids = () => node.childNodes.map((c) => inline(c, inLink || t === 'a')).join('');
    switch (t) {
      case 'br':
        return '\n';
      case 'a': {
        const text = kids().trim();
        const href = abs(node.getAttribute('href'));
        if (!text) return '';
        return href && !inLink ? `[${text}](${href})` : text;
      }
      case 'strong':
      case 'b': {
        const s = kids().trim();
        return s ? `**${s}**` : '';
      }
      case 'em':
      case 'i': {
        const s = kids().trim();
        return s ? `*${s}*` : '';
      }
      case 'code':
        return `\`${node.text}\``;
      case 'img': {
        const alt = squash(node.getAttribute('alt') ?? '').trim();
        return alt && !inLink ? `![${alt}](${abs(node.getAttribute('src'))})` : '';
      }
      default:
        return kids();
    }
  }

  const inlineOf = (el) => squash(el.childNodes.map((c) => inline(c)).join('')).trim();

  /** List item: nested block children (heading + text, link + blurb + date) collapse into one line. */
  function listItem(li, marker, depth) {
    const pad = '  '.repeat(depth);
    const parts = [];
    const nested = [];
    let run = '';
    const flush = () => {
      const s = squash(run).trim();
      if (s) parts.push(s);
      run = '';
    };
    for (const c of li.childNodes) {
      if (isEl(c) && skipped(c)) continue;
      if (isEl(c) && (tag(c) === 'ul' || tag(c) === 'ol')) {
        flush();
        nested.push(list(c, depth + 1));
      } else if (isEl(c) && /^h[1-6]$/.test(tag(c))) {
        flush();
        const s = inlineOf(c);
        if (s) parts.push(`**${s}**`);
      } else if (isEl(c) && tag(c) === 'small') {
        flush();
        const s = inlineOf(c);
        if (s) parts.push(`(${s})`);
      } else if (isBlock(c)) {
        flush();
        const s = squash(blocks(c).join(' ')).trim();
        if (s) parts.push(s);
      } else run += inline(c);
    }
    flush();
    let line = parts.join(' — ').replace(/ — \(/g, ' (');
    line = `${pad}${marker} ${line}`;
    return [line, ...nested].join('\n');
  }

  function list(el, depth = 0) {
    const ordered = tag(el) === 'ol';
    const items = el.childNodes.filter((c) => isEl(c) && tag(c) === 'li' && !skipped(c));
    return items.map((li, i) => listItem(li, ordered ? `${i + 1}.` : '-', depth)).join('\n');
  }

  function table(el) {
    const rows = el
      .querySelectorAll('tr')
      .map((tr) =>
        tr.childNodes
          .filter((c) => isEl(c) && (tag(c) === 'th' || tag(c) === 'td'))
          .map((c) => inlineOf(c).replace(/\|/g, '\\|')),
      );
    if (!rows.length) return '';
    const head = rows[0];
    const out = [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`];
    for (const r of rows.slice(1)) out.push(`| ${r.join(' | ')} |`);
    return out.join('\n');
  }

  function details(el, level) {
    const summary = el.childNodes.find((c) => isEl(c) && tag(c) === 'summary');
    const q = summary?.querySelector('.q') ?? summary;
    const out = [];
    if (q) out.push(`${'#'.repeat(level)} ${inlineOf(q)}`);
    const tagsEl = summary?.querySelector('.tags');
    if (tagsEl) {
      const tags = tagsEl.querySelectorAll('.tag').map((t) => t.text.trim().replace(/^#/, ''));
      if (tags.length) out.push(`Applies to: ${tags.join(', ')}`);
    }
    for (const c of el.childNodes) if (c !== summary) out.push(...blockOrInline(c));
    return out;
  }

  let currentLevel = 2;
  const root = { doc: null };

  function blockOrInline(n) {
    if (isEl(n) && isBlock(n)) return blocks(n);
    const s = squash(inline(n)).trim();
    return s ? [s] : [];
  }

  /** Markdown blocks for `el`. FAQ questions take the level below the last heading seen. */
  function blocks(el) {
    if (!isEl(el) || skipped(el)) return [];
    const t = tag(el);
    const c = classes(el);
    if (/^h[1-6]$/.test(t)) {
      currentLevel = Math.min(Number(t[1]) + 1, 6);
      const s = inlineOf(el);
      return s ? [`${'#'.repeat(Number(t[1]))} ${s}`] : [];
    }
    if (t === 'p' || t === 'small' || t === 'summary') {
      const s = inlineOf(el);
      return s ? [s] : [];
    }
    if (t === 'hr') return ['---'];
    if (t === 'pre') return [`\`\`\`\n${el.text.replace(/\n$/, '')}\n\`\`\``];
    if (t === 'table') return [table(el)];
    if (t === 'details') return details(el, currentLevel);
    if (t === 'blockquote') {
      const inner = children(el).join('\n\n');
      return [
        inner
          .split('\n')
          .map((l) => (l ? `> ${l}` : '>'))
          .join('\n'),
      ];
    }
    if (t === 'ul' || t === 'ol') {
      // Tag/pill lists ("Topics") read better as one line.
      const label = el.getAttribute('aria-label');
      if (c.includes('pills') && label) {
        const items = el
          .querySelectorAll('li')
          .map((li) => inlineOf(li))
          .filter(Boolean);
        return items.length ? [`${label}: ${items.join(', ')}`] : [];
      }
      const s = list(el);
      return s ? [s] : [];
    }
    if (ROW_CLASSES.some((r) => c.includes(r))) {
      const items = el.childNodes.map((n) => squash(inline(n)).trim()).filter(Boolean);
      return items.length ? [items.join(' · ')] : [];
    }
    const out = [];
    if (el.getAttribute('role') === 'tabpanel') {
      const tab = root.doc?.querySelector(`#${el.getAttribute('aria-labelledby')}`);
      if (tab) {
        out.push(`## ${squash(tab.text).trim()}`);
        currentLevel = 3;
      }
    }
    out.push(...children(el));
    return out;
  }

  function children(el) {
    const out = [];
    let run = '';
    const flush = () => {
      const s = squash(run).trim();
      if (s) out.push(s);
      run = '';
    };
    for (const n of el.childNodes) {
      if (isEl(n) && skipped(n)) continue;
      if (isEl(n) && isBlock(n)) {
        flush();
        out.push(...blocks(n));
      } else run += inline(n);
    }
    flush();
    return out;
  }

  return {
    /** Markdown body for `main`; `doc` is the parsed page (used to resolve tab labels). */
    convert(main, doc) {
      root.doc = doc;
      currentLevel = 2;
      return children(main)
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    },
  };
}
