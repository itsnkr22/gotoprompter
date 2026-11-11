/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const brand = JSON.parse(
  readFileSync(new URL('../../packages/config/brand.json', import.meta.url), 'utf8'),
) as {
  APP_NAME: string;
};

// Served from /app/ on the marketing site (apps/site copies dist/ to public/app at deploy).
export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/favicon.ico',
        'icons/favicon.svg',
        'icons/apple-touch-icon.png',
        'fonts/*.woff2',
      ],
      manifest: {
        name: brand.APP_NAME,
        short_name: brand.APP_NAME,
        description: 'A free teleprompter that follows your voice.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/app/',
        scope: '/app/',
        orientation: 'any',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallback: '/app/index.html',
        navigateFallbackDenylist: [/^\/(?!app(\/|$))/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
