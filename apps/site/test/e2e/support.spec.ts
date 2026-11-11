import { expect, test } from '@playwright/test';

test.describe('support centre', () => {
  test('search "license" filters and ranks; chips filter by platform', async ({ page }) => {
    await page.goto('/support/');
    const input = page.getByRole('searchbox', { name: 'Search questions and answers' });
    await input.fill('license');
    const items = page.locator('.support .list details');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThan(20);
    await expect(items.first()).toHaveAttribute('open', '');
    await page.getByRole('button', { name: '#web' }).click();
    await expect(items).toHaveCount(1); // free-vs-pro is the only web article matching "license"
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(items.first()).toBeVisible();
  });

  test('deep link opens and scrolls to the article; copy link works', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/support/#activate-license');
    const article = page.locator('#activate-license');
    await expect(article).toHaveAttribute('open', '');
    await expect(article).toBeInViewport();
    await article.getByRole('button', { name: 'Copy link to this answer' }).click();
    await expect(article.getByRole('button', { name: 'Link copied!' })).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe('http://localhost:4321/support/#activate-license');
  });

  test('empty state and clear; contact dialog gating', async ({ page }) => {
    await page.goto('/support/');
    await page.getByRole('searchbox').fill('zzqqxx');
    await expect(page.getByText('No matching answers yet')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search & filters' }).click();
    await expect(page.locator('.support .list details')).toHaveCount(20);
    await page.getByRole('button', { name: 'Still need a hand? Email us' }).click();
    const dialog = page.locator('.contact-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Copy email' })).toBeDisabled();
    await dialog.getByLabel("I've looked for an answer in the FAQ").check();
    await expect(dialog.getByRole('button', { name: 'Copy email' })).toBeEnabled();
    await expect(dialog.getByRole('link', { name: 'Open email app' })).toHaveAttribute(
      'href',
      /^mailto:support@gotoprompter\.app\?subject=Support%20request/,
    );
  });
});
