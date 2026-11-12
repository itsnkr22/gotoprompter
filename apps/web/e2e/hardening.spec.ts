import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { currentIndex, openApp, speak, startPrompter } from './helpers';

const SCRIPT = 'alpha beta gamma.\ndelta epsilon the zeta.\neta theta iota.';
// alpha0 beta1 gamma.2 br3 delta4 epsilon5 the6 zeta.7 br8 eta9 theta10 iota.11

const enableCommands = (page: Page) =>
  page.evaluate(() => window.__vpTestHooks!.settings.getState().set('voiceCommandsEnabled', true));

test.describe('voice commands', () => {
  test('back, forward and restart work, in short and long forms', async ({ page }) => {
    await openApp(page);
    await startPrompter(page, SCRIPT);
    await enableCommands(page);
    await page.locator('#micButton').click();

    await speak(page, 'go forward'); // interim: confirmed after a short pause
    await expect.poll(() => currentIndex(page)).toBe(4);
    await expect(page.getByTestId('toast').filter({ hasText: 'Next paragraph' })).toBeVisible();
    await speak(page, 'ok');
    await speak(page, 'go to the end', true); // final: immediate
    expect(await currentIndex(page)).toBe(11);
    await speak(page, 'ok');
    await speak(page, 'go back', true);
    expect(await currentIndex(page)).toBe(9);
    await speak(page, 'ok');
    await speak(page, 'go restart', true);
    expect(await currentIndex(page)).toBe(0);
  });

  test('a command phrase inside a longer sentence is speech, not a command', async ({ page }) => {
    await openApp(page);
    await startPrompter(page, SCRIPT);
    await enableCommands(page);
    await page.locator('#micButton').click();
    await page.locator('#w-9').click();
    await speak(page, 'we should go back');
    await speak(page, 'we should go back to basics');
    await page.waitForTimeout(900);
    expect(await currentIndex(page)).toBe(9);
  });

  test('words said before a command do not move the script after it', async ({ page }) => {
    await openApp(page);
    await startPrompter(page, SCRIPT);
    await enableCommands(page);
    await page.locator('#micButton').click();
    await page.locator('#w-9').click();
    await speak(page, 'eta the theta go back', true);
    expect(await currentIndex(page)).toBe(4);
    await speak(page, 'eta the theta go back'); // repeated update of the same utterance
    expect(await currentIndex(page)).toBe(4);
    await speak(page, 'eta the theta go back delta');
    await expect.poll(() => currentIndex(page)).toBe(5);
  });
});

test.describe('mirror mode', () => {
  test('flips on both axes and tapping a word still lands on that word', async ({ page }) => {
    await openApp(page);
    await startPrompter(page, SCRIPT);
    const transform = () =>
      page.locator('#scrollContainer').evaluate((el) => getComputedStyle(el).transform);
    expect(await transform()).toBe('none');
    await page.evaluate(() =>
      window.__vpTestHooks!.settings.getState().set('mirrorVertical', true),
    );
    expect(await transform()).toBe('matrix(1, 0, 0, -1, 0, 0)');
    await page.locator('#w-5').click();
    expect(await currentIndex(page)).toBe(5);

    await page.evaluate(() =>
      window.__vpTestHooks!.settings.getState().set('mirrorHorizontal', true),
    );
    expect(await transform()).toBe('matrix(-1, 0, 0, -1, 0, 0)');
    await page.evaluate(() =>
      window.__vpTestHooks!.settings.getState().set('mirrorVertical', false),
    );
    expect(await transform()).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    await page.locator('#w-10').click();
    expect(await currentIndex(page)).toBe(10);

    // Both toggles are in the panel for everyone; the panel itself is never mirrored.
    await page.locator('#toggleSettingsBtn').click();
    await expect(page.locator('#hMirrorToggle')).toBeChecked();
    await page.locator('label', { has: page.locator('#hMirrorToggle') }).click();
    expect(await transform()).toBe('none');
  });
});

test.describe('languages', () => {
  const cases: Array<[string, string, string]> = [
    ['Greek', 'Καλημέρα σε όλους και ευχαριστώ που είστε σήμερα μαζί μας', 'ltr'],
    ['Arabic', 'صباح الخير للجميع وشكرا لانضمامكم إلينا في اجتماع اليوم', 'rtl'],
    ['Hebrew', 'בוקר טוב לכולם ותודה שהצטרפתם אלינו היום לפגישה', 'rtl'],
    ['Ukrainian', 'Доброго ранку всім і дякую, що ви сьогодні з нами на цій зустрічі', 'ltr'],
    ['Thai', 'สวัสดีตอนเช้าทุกคน ขอบคุณที่มาร่วมประชุมกับเราในวันนี้', 'ltr'],
    [
      'Danish',
      'Hej alle sammen. I dag vil jeg gerne fortælle jer om vores nye produkt, som vi har arbejdet på i flere måneder.',
      'ltr',
    ],
  ];
  for (const [name, text, dir] of cases) {
    test(`auto-detects ${name} and lays the text out ${dir}`, async ({ page }) => {
      await openApp(page);
      // The full detector is a separate chunk; wait for it like a real visitor's first seconds.
      await page.waitForLoadState('networkidle');
      await startPrompter(page, text);
      await page.locator('#toggleSettingsBtn').click();
      await expect(page.getByTestId('settings-language-title')).toHaveText(`Automatic (${name})`);
      await expect(page.locator('#scriptContent')).toHaveCSS('direction', dir);
      await expect(page.getByTestId('toast')).toHaveCount(0);
    });
  }

  test('the menu lists every language and a regional variant can be picked', async ({ page }) => {
    await openApp(page);
    await page.locator('#setupLanguageToggle').click();
    await expect(page.locator('#setupLanguageMenu [role="option"]')).toHaveCount(73);
    await page.locator('#setupLanguageMenu [data-value="pt-BR"]').click();
    await expect(page.getByTestId('setup-language-title')).toHaveText('Portuguese (Brazil)');
    await startPrompter(page, 'Bom dia a todos');
    expect(await page.evaluate(() => window.__vpTestHooks!.speechAdapter!.language)).toBe('pt-BR');
  });
});

test.describe('video mode', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'needs the Chromium fake media device',
  );

  test('going back to the editor mid-recording saves the file and turns the camera off', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await openApp(page);
    await startPrompter(page);
    await page.locator('#videoModeBtn').click();
    await expect(page.locator('#prompterContainer')).toHaveClass(/vp-video-split/);
    // Android emulation (Pixel 7) shows the microphone-sharing warning first (spec §13).
    const androidModal = page.locator('#androidVideoLimit');
    if (await androidModal.isVisible())
      await androidModal.getByRole('button', { name: 'Got it' }).click();
    await expect(page.locator('#videoPreview')).toHaveJSProperty('paused', false);
    await page.evaluate(() => {
      const v = document.getElementById('videoPreview') as HTMLVideoElement;
      (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks = (
        v.srcObject as MediaStream
      ).getTracks();
    });
    await page.locator('#videoRecordBtn').click();
    await expect(page.locator('#videoRecordingIndicator')).toContainText(/REC 0:0[1-9]/);

    const download = page.waitForEvent('download');
    await page.locator('#resetAppBtn').click();
    await expect(page.locator('#setupScreen')).toBeVisible();
    expect((await download).suggestedFilename()).toMatch(/\.(webm|mp4)$/);
    const states = await page.evaluate(() =>
      (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.map((t) => t.readyState),
    );
    expect(states.length).toBeGreaterThan(0);
    expect(states.every((s) => s === 'ended')).toBe(true);
    expect(await page.evaluate(() => window.__vpTestHooks!.runtime.getState().recording)).toBe(
      false,
    );
  });

  test('changing a setting in overlay layout keeps the camera visible', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await openApp(page);
    await startPrompter(page);
    await page.locator('#videoModeBtn').click();
    await expect(page.locator('#prompterContainer')).toHaveClass(/vp-video-split/);
    // Android emulation (Pixel 7) shows the microphone-sharing warning first (spec §13).
    const androidModal = page.locator('#androidVideoLimit');
    if (await androidModal.isVisible())
      await androidModal.getByRole('button', { name: 'Got it' }).click();
    await page.locator('#videoLayoutToggleBtn').click();
    await expect(page.locator('#prompterContainer')).toHaveClass(/vp-video-overlay/);
    await page.evaluate(() => window.__vpTestHooks!.settings.getState().set('fontSize', 50));
    await expect(page.locator('#scriptContent')).toHaveCSS('font-size', '50px');
    expect(await page.locator('#scrollContainer').evaluate((el) => el.style.backgroundColor)).toBe(
      '',
    );
  });
});

test.describe('layout changes', () => {
  test('the current word stays on the active line when the font size or window changes', async ({
    page,
  }) => {
    await openApp(page);
    const long = Array.from({ length: 60 }, (_, i) => `sentence number ${i} goes here.`).join('\n');
    await startPrompter(page, long);
    await page.locator('#w-200').scrollIntoViewIfNeeded();
    await page.locator('#w-200').click();
    const offset = () =>
      page.evaluate(() => {
        const s = document.getElementById('scrollContainer')!;
        const w = document.querySelector<HTMLElement>('.vp-word-current')!;
        return Math.round(
          ((w.getBoundingClientRect().top - s.getBoundingClientRect().top) / s.clientHeight) * 100,
        );
      });
    await expect.poll(offset).toBe(35);
    await page.evaluate(() => window.__vpTestHooks!.settings.getState().set('fontSize', 80));
    await expect.poll(offset).toBe(35);
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: Math.round(size.width * 0.7), height: size.height });
    await expect.poll(offset).toBe(35);
  });
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('after one visit the app loads, detects languages and prompts with no network', async ({
    page,
    context,
  }) => {
    await openApp(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => !!window.__vpTestHooks);
    await expect(page.getByTestId('script-input')).toBeVisible();
    await startPrompter(
      page,
      'Hej alle sammen. I dag vil jeg gerne fortælle jer om vores nye produkt, som vi har arbejdet på i flere måneder.',
    );
    await expect(page.locator('#w-0')).toHaveClass(/vp-word-current/);
    // Fonts and the language-detection chunk came from the cache too.
    await page.locator('#toggleSettingsBtn').click();
    await expect(page.getByTestId('settings-language-title')).toHaveText('Automatic (Danish)');
    await context.setOffline(false);
  });
});
