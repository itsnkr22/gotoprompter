// JSON-LD builders (docs/spec/03-site.md §2.14, §8).
import { APP_NAME, GITHUB_REPO_URL, siteUrl } from '../brand';
import { MAC_AVAILABLE } from '../launch';

export type JsonLd = Record<string, unknown>;

export const organization = (): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: APP_NAME,
  url: siteUrl('/'),
  logo: siteUrl('/images/og-default.png'),
  sameAs: [GITHUB_REPO_URL],
});

export const aboutPage = (founder: string): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: siteUrl('/about/'),
  mainEntity: {
    '@type': 'Organization',
    name: APP_NAME,
    url: siteUrl('/'),
    founder: { '@type': 'Person', name: founder },
    sameAs: [GITHUB_REPO_URL],
  },
});

export const website = (): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: APP_NAME,
  url: siteUrl('/'),
});

export interface Offer {
  name: string;
  price: number;
  currency?: string;
}

export function softwareApp(opts: {
  name?: string;
  os: 'Web' | 'macOS';
  url: string;
  offers: Offer[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: opts.name ?? APP_NAME,
    operatingSystem: opts.os,
    applicationCategory: 'MultimediaApplication',
    url: siteUrl(opts.url),
    // Mac offers are omitted while the Mac app is "coming soon" (packages/config/launch.json).
    offers: (opts.os === 'macOS' && !MAC_AVAILABLE ? [] : opts.offers).map((o) => ({
      '@type': 'Offer',
      name: o.name,
      price: o.price.toFixed(2),
      priceCurrency: o.currency ?? 'USD',
      availability: 'https://schema.org/InStock',
    })),
  };
}

export function article(opts: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  url: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    image: siteUrl(opts.image),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: { '@type': 'Organization', name: APP_NAME },
    publisher: {
      '@type': 'Organization',
      name: APP_NAME,
      logo: { '@type': 'ImageObject', url: siteUrl('/images/og-default.png') },
    },
    mainEntityOfPage: siteUrl(opts.url),
  };
}

export const stripTags = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

export const faqPage = (items: { q: string; a: string }[]): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({
    '@type': 'Question',
    name: stripTags(i.q),
    acceptedAnswer: { '@type': 'Answer', text: stripTags(i.a) },
  })),
});

export const breadcrumbs = (items: { name: string; url: string }[]): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((b, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: b.name,
    item: siteUrl(b.url),
  })),
});

export const howTo = (name: string, steps: string[]): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  step: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
});
