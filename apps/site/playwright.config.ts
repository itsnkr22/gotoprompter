import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Site e2e (docs/spec/03-site.md §12): a static server over dist/ + a mock API server
// (test/e2e/mock-api.mjs). Build first with PUBLIC_API_BASE=http://localhost:8788.
const localChromium = '/opt/pw-browsers/chromium';
const launchOptions =
  existsSync(localChromium) && !process.env['CI'] ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4321/', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } }],
  webServer: [
    {
      command: 'node test/e2e/mock-api.mjs',
      url: 'http://localhost:8788/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
    },
    {
      command: 'node test/e2e/static-server.mjs',
      url: 'http://localhost:4321/',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
