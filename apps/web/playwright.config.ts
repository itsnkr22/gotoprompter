import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Chromium is preinstalled at /opt/pw-browsers in the cloud dev container; CI installs browsers
// with `playwright install --with-deps`. WebKit is only run where it is installed.
const localChromium = '/opt/pw-browsers/chromium';
// Fake camera/microphone so the video-mode scenario runs without hardware or permission prompts.
const fakeMedia = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const chromiumLaunch: { executablePath?: string; args: string[] } =
  existsSync(localChromium) && !process.env['CI']
    ? { executablePath: localChromium, args: fakeMedia }
    : { args: fakeMedia };
const projects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'], launchOptions: chromiumLaunch } },
];
if (process.env['PW_WEBKIT'] === '1' || process.env['CI']) {
  projects.push({
    name: 'webkit',
    use: { ...devices['Desktop Safari'], launchOptions: { args: [] } },
  });
  projects.push({
    name: 'mobile-safari',
    use: { ...devices['iPhone 13'], launchOptions: { args: [] } },
  });
}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/app/',
    trace: 'retain-on-failure',
    // The PWA service worker would otherwise take over fetches after the first load; in WebKit
    // those bypass page.route(), so mocked API calls (e.g. /gdoc) hit the real server instead.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'pnpm exec vite build --mode e2e && pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/app/',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    env: { VITE_E2E: '1', VITE_API_BASE: 'http://localhost:4173/api' },
  },
  projects,
});
