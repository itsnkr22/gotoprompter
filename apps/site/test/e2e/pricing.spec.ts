import launch from '@gotoprompter/config/launch' with { type: 'json' };
import { expect, test } from '@playwright/test';

test.describe('pricing buttons', () => {
  test.skip(
    !launch.macAvailable,
    'Mac app is coming soon: no checkout (packages/config/launch.json)',
  );
  test('Pro posts {plan:"pro_yearly"} and navigates to the checkout URL', async ({ page }) => {
    const req = page.waitForRequest((r) => r.url().endsWith('/checkout') && r.method() === 'POST');
    await page.goto('/pricing/');
    await page.getByRole('button', { name: 'Get Pro' }).click();
    const body = (await req).postDataJSON() as { plan: string; source: string };
    expect(body).toEqual({ plan: 'pro_yearly', source: '/pricing/' });
    await expect(page.locator('#mock-checkout')).toHaveText('Mock checkout for pro_yearly');
  });

  test('API 500 shows the inline note and restores the button', async ({ page }) => {
    await page.goto('/pricing/');
    const btn = page.getByRole('button', { name: 'Buy Lifetime' });
    await btn.click();
    await expect(page.locator('.pricing-error')).toContainText(
      'Checkout is temporarily unavailable',
    );
    await expect(btn).toBeEnabled();
  });

  test('?plan= auto-starts checkout', async ({ page }) => {
    await page.goto('/pricing/?plan=pro_yearly');
    await expect(page.locator('#mock-checkout')).toHaveText('Mock checkout for pro_yearly');
  });
});

test('Mac "coming soon": pricing shows planned plans without checkout', async ({ page }) => {
  test.skip(launch.macAvailable, 'Mac app is available');
  const checkout: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/checkout')) checkout.push(r.url());
  });
  await page.goto('/pricing/?plan=pro_yearly');
  await expect(page.getByRole('heading', { name: 'Planned Mac app pricing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Pro' })).toHaveCount(0);
  await expect(page.locator('.plan .soon')).toHaveCount(3);
  await page.waitForTimeout(500);
  expect(checkout).toEqual([]);
});
