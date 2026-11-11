import { expect, test } from '@playwright/test';
import { currentIndex, openApp, speak, startPrompter } from './helpers';

test.describe('first run and setup', () => {
  test('seeds the demo script, one DEMO card and auto-detect', async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId('script-input')).toHaveValue(/Welcome to/);
    const cards = page.getByTestId('history-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('demo');
    await expect(page.getByTestId('setup-language-title')).toHaveText('Auto-detect');
  });

  test('Start enters the prompter with the first word current', async ({ page }) => {
    await openApp(page);
    await startPrompter(page);
    await expect(page.locator('#prompterContainer')).toBeVisible();
    await expect(page.locator('#w-0')).toHaveClass(/vp-word-current/);
    await expect(page.locator('#statusIndicator')).toHaveText('Tap mic to start');
  });
});

test.describe('voice flow (fake adapter)', () => {
  test('listening, matching, commands and tap-to-sync', async ({ page }) => {
    await openApp(page);
    await startPrompter(page, 'first line here.\nsecond line here.\nthird line here.');
    await page.locator('#micButton').click();
    await expect(page.locator('#statusIndicator')).toHaveText('Listening…');
    await speak(page, 'first');
    await expect.poll(() => currentIndex(page)).toBe(1);
    await speak(page, 'first line');
    await expect.poll(() => currentIndex(page)).toBe(2);

    // Commands are off by default: "go next" is just unmatched text.
    await speak(page, 'go next');
    await expect.poll(() => currentIndex(page)).toBe(2);
    await page.evaluate(() =>
      window.__vpTestHooks!.settings.getState().set('voiceCommandsEnabled', true),
    );
    await speak(page, 'please go next');
    await expect.poll(() => currentIndex(page)).toBe(4);

    await page.locator('#w-8').click();
    await expect.poll(() => currentIndex(page)).toBe(8);
    await expect(page.locator('#w-8')).toHaveClass(/vp-word-current/);
    await expect(page.locator('#w-4')).toHaveClass(/vp-word-past/);
  });

  test('silent failure on first start opens the unsupported modal', async ({ page }) => {
    await openApp(page);
    await startPrompter(page);
    await page.locator('#micButton').click();
    await page.evaluate(() => window.__vpTestHooks!.speechAdapter!.emitEnd());
    const modal = page.locator('#browserUnsupported');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Continue anyway' }).click();
    await expect(modal).toBeHidden();
    await expect(page.locator('#statusIndicator')).toHaveText('Tap mic to start');
  });
});

test.describe('settings', () => {
  test('font size persists across reloads, mirror does not', async ({ page }) => {
    await openApp(page);
    await startPrompter(page);
    await page.locator('#toggleSettingsBtn').click();
    await page.locator('#fontSizeInput').fill('60');
    await page.locator('label', { has: page.locator('#mirrorToggle') }).click();
    await expect(page.locator('#mirrorToggle')).toBeChecked();
    await expect(page.locator('#scrollContainer')).toHaveClass(/vp-mirror-v/);
    await expect(page.locator('#scriptContent')).toHaveCSS('font-size', '60px');
    await page.reload();
    await page.waitForFunction(() => !!window.__vpTestHooks);
    const s = await page.evaluate(() => {
      const st = window.__vpTestHooks!.settings.getState();
      return { fontSize: st.fontSize, mirrorVertical: st.mirrorVertical };
    });
    expect(s).toEqual({ fontSize: 60, mirrorVertical: false });
  });
});

test.describe('keyboard and PWA', () => {
  test('Space toggles the mic and Escape returns to the editor', async ({ page }) => {
    await openApp(page);
    await startPrompter(page);
    await page.keyboard.press('Space');
    await expect(page.locator('#statusIndicator')).toHaveText('Listening…');
    await page.keyboard.press('Space');
    await expect(page.locator('#statusIndicator')).toHaveText('Tap mic to start');
    await page.keyboard.press('Escape');
    await expect(page.locator('#setupScreen')).toBeVisible();
  });

  test('manifest is served with the /app/ scope', async ({ request }) => {
    const res = await request.get('/app/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const manifest = (await res.json()) as { start_url: string; scope: string; icons: unknown[] };
    expect(manifest.start_url).toBe('/app/');
    expect(manifest.scope).toBe('/app/');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  });
});
