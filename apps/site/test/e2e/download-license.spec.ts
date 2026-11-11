import launch from '@gotoprompter/config/launch' with { type: 'json' };
import { expect, test } from '@playwright/test';

test('download page shows release details from the API', async ({ page }) => {
  test.skip(
    !launch.macAvailable,
    'Mac app is coming soon: no download (packages/config/launch.json)',
  );
  await page.goto('/download/');
  await expect(page.getByRole('link', { name: 'Download gotoprompter 1.0.0' })).toBeVisible();
  await expect(page.locator('.download-meta .meta')).toContainText('10.0 MB · macOS 14.0 or later');
  await page.getByText("What's new in 1.0.0").click();
  await expect(page.locator('.download-meta .notes')).toContainText('First release');
});

test('Mac "coming soon": download page points to the web app', async ({ page }) => {
  test.skip(launch.macAvailable, 'Mac app is available');
  await page.goto('/download/');
  await expect(page.getByRole('heading', { name: 'The Mac app is coming soon' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the free web app' })).toHaveAttribute(
    'href',
    '/app/',
  );
  await expect(page.getByRole('link', { name: 'Email me when it launches' })).toHaveAttribute(
    'href',
    /^mailto:support@gotoprompter\.app\?subject=Tell%20me%20when%20the%20Mac%20app%20launches/,
  );
});

test('license recovery form posts and shows the neutral message with a cooldown', async ({
  page,
}) => {
  await page.goto('/license/');
  const form = page.locator('#recover');
  const req = page.waitForRequest((r) => r.url().endsWith('/license/recover'));
  await form.getByLabel('Email used at checkout').fill('someone@example.com');
  await form.getByRole('button', { name: 'Email my key' }).click();
  expect((await req).postDataJSON()).toEqual({ email: 'someone@example.com' });
  await expect(form.locator('.status')).toContainText("If that email has a license, we've sent it");
  await expect(form.getByRole('button', { name: /Sent — wait \d+ s to resend/ })).toBeDisabled();
});
