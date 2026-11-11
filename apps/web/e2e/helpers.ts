import type { Page } from '@playwright/test';

/** Open the app with the fake speech adapter injected before boot. */
export async function openApp(page: Page, path = ''): Promise<void> {
  await page.addInitScript(() => {
    window.__vpFakeSpeech = true;
  });
  await page.goto(path);
  await page.waitForFunction(() => !!window.__vpTestHooks);
}

export async function startPrompter(page: Page, script?: string): Promise<void> {
  if (script !== undefined) await page.getByTestId('script-input').fill(script);
  await page.getByTestId('start-button').click();
  await page.locator('#prompterContainer').waitFor();
}

export function speak(page: Page, text: string, isFinal = false): Promise<void> {
  return page.evaluate(
    ([t, f]) => window.__vpTestHooks!.speechAdapter!.emit(t as string, f as boolean),
    [text, isFinal] as const,
  );
}

export function currentIndex(page: Page): Promise<number> {
  return page.evaluate(() => window.__vpTestHooks!.runtime.getState().currentIndex);
}

declare global {
  interface Window {
    __vpFakeSpeech?: boolean;
  }
}
