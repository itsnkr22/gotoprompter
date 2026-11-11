import { expect, test } from '@playwright/test';
import { currentIndex, openApp, startPrompter } from './helpers';

const DOC_ID = 'z'.repeat(44);
const DOC_URL = `https://docs.google.com/document/d/${DOC_ID}/edit`;

test.describe('sound / constant modes', () => {
  test('constant scrolling advances with time and resets the button at the end', async ({
    page,
  }) => {
    await openApp(page);
    await page.clock.install();
    await startPrompter(page, 'one two three four five six seven eight nine ten');
    await page.evaluate(() => {
      window.__vpTestHooks!.settings.getState().set('scrollingMode', 'constant');
      window.__vpTestHooks!.settings.getState().set('scrollSpeed', 6);
    });
    await expect(page.locator('#statusIndicator')).toHaveText('Tap play to start');
    await page.locator('#micButton').click();
    await expect(page.locator('#statusIndicator')).toHaveText('Scrolling…');
    await page.clock.runFor(1500);
    expect(await currentIndex(page)).toBeGreaterThan(0);
    await page.clock.runFor(4000);
    await expect(page.locator('#statusIndicator')).toHaveText('Tap play to start');
    expect(await currentIndex(page)).toBe(10);
  });
});

test.describe('video mode', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'needs the Chromium fake media device',
  );
  test('enters video mode, toggles layout, records and downloads', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await openApp(page);
    await startPrompter(page);
    await page.locator('#videoModeBtn').click();
    await expect(page.locator('#prompterContainer')).toHaveClass(/vp-video-split/);
    // Android emulation (Pixel 7) shows the microphone-sharing warning first (spec §13).
    const androidModal = page.locator('#androidVideoLimit');
    if (await androidModal.isVisible())
      await androidModal.getByRole('button', { name: 'Got it' }).click();
    await expect(page.locator('#videoContainer')).toBeVisible();
    await expect(page.locator('#videoPreview')).toHaveJSProperty('paused', false);
    await page.locator('#videoLayoutToggleBtn').click();
    await expect(page.locator('#prompterContainer')).toHaveClass(/vp-video-overlay/);
    await expect(page.locator('#videoLayoutToggleBtn')).toHaveText('⬜ Split');

    const download = page.waitForEvent('download');
    await page.locator('#videoRecordBtn').click();
    await expect(page.locator('#videoRecordingIndicator')).toBeVisible();
    await page.waitForTimeout(2200);
    await page.locator('#videoStopBtn').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(
      /^gotoprompter-recording-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.(webm|mp4)$/,
    );

    await page.locator('#videoModeBtn').click();
    await expect(page.locator('#videoContainer')).toBeHidden();
    await expect(page.locator('#prompterContainer')).not.toHaveClass(/vp-video-/);
  });
});

test.describe('Google Docs import', () => {
  test('imports a public doc and shows the badge; 403 shows the inline error', async ({ page }) => {
    await page.route('**/gdoc?id=*', (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === DOC_ID) {
        void route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: 'Imported first line.\nImported second line.',
        });
      } else {
        void route.fulfill({ status: 403, body: 'nope' });
      }
    });
    await openApp(page);
    await page.locator('#importGoogleDocBtn').click();
    await page.locator('#googleDocUrlInput').fill(DOC_URL);
    await page.locator('#confirmGoogleDocImportBtn').click();
    // Either the prompter opens or the modal shows an inline error; surface the error text on failure.
    await page.locator('#prompterContainer, #googleDocError').first().waitFor();
    const errorEl = page.locator('#googleDocError');
    const inlineError = (await errorEl.count()) > 0 ? await errorEl.textContent() : null;
    expect(inlineError, 'Google Doc import showed an inline error').toBeNull();
    await page.locator('#prompterContainer').waitFor();
    await expect(page.locator('#w-0')).toHaveText('Imported');
    await page.locator('#toggleSettingsBtn').click();
    await expect(page.locator('#refreshGoogleDocContainer')).toBeVisible();
    await page.locator('#closeSettingsBtn').click();
    await page.locator('#resetAppBtn').click();
    await expect(page.getByTestId('history-card').first()).toContainText('Google Doc');

    await page.locator('#importGoogleDocBtn').click();
    await page
      .locator('#googleDocUrlInput')
      .fill(`https://docs.google.com/document/d/${'q'.repeat(44)}/edit`);
    await page.locator('#confirmGoogleDocImportBtn').click();
    await expect(page.locator('#googleDocError')).toContainText('Anyone with the link');
  });
});

test.describe('mobile viewport', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile projects only');

  test('dock stays inside the visual viewport and inputs do not trigger zoom', async ({ page }) => {
    await openApp(page);
    const fontSize = await page
      .getByTestId('script-input')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
    await startPrompter(page);
    const box = await page.locator('#micButton').boundingBox();
    const vh = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(vh);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
