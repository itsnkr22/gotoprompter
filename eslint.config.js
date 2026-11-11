import { base } from '@gotoprompter/config/eslint';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.astro/**',
      '**/.wrangler/**',
      'apps/site/public/app/**',
    ],
  },
  ...base,
];
