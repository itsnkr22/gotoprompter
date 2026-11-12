import { file, glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(80),
    /** <title> when `title` is too long for search results; with the brand suffix it stays within 60 characters. */
    metaTitle: z.string().max(45).optional(),
    description: z.string().min(110).max(160),
    keywords: z.array(z.string()).min(1).max(8),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    image: z.string(),
    imageAlt: z.string(),
    video: z.object({ videoId: z.string() }).optional(),
    draft: z.boolean().default(false),
  }),
});

const changelog = defineCollection({
  loader: glob({ pattern: 'changelog.md', base: './src/content/changelog' }),
  schema: z.object({}),
});

const SUPPORT_CATEGORIES = [
  'Getting started',
  'Voice scrolling',
  'Mac setup',
  'Web app',
  'Recording',
  'License & billing',
  'Privacy & support',
] as const;

const support = defineCollection({
  loader: file('./src/content/support/articles.json'),
  schema: z.object({
    id: z.string(),
    question: z.string(),
    category: z.enum(SUPPORT_CATEGORIES),
    platforms: z.array(z.enum(['macOS', 'web'])).min(1),
    answerHtml: z.string(),
    keywords: z.string(),
    searchPhrases: z.array(z.string()),
    videoUrl: z.string().nullable(),
  }),
});

const audienceIcon = z.enum([
  'users',
  'video',
  'book',
  'mic',
  'globe',
  'monitor',
  'briefcase',
  'clipboard',
  'star',
]);

const useCases = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/use-cases' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    platformName: z.string(),
    badgeText: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    eyebrow: z.string(),
    heroTitle: z.string(),
    heroSubtitle: z.string(),
    heroVideoId: z.string(),
    footerCtaHeadline: z.string(),
    hideSections: z.array(z.enum(['reviews', 'pricing', 'threeWays', 'marquee'])),
    audienceItems: z
      .array(z.object({ icon: audienceIcon, title: z.string(), description: z.string() }))
      .length(6),
    faqOverrides: z.record(
      z.string(),
      z.object({ q: z.string().optional(), a: z.string().optional() }),
    ),
    extraFaqs: z.array(z.object({ id: z.string(), q: z.string(), a: z.string() })),
  }),
});

export const collections = { blog, changelog, support, useCases };
