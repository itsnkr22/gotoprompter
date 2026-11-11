import { expect, test } from '@playwright/test';

test.describe('checkout success', () => {
  test('waiting → ready after mocked polls', async ({ page }) => {
    await page.goto('/checkout/success/?plan=lifetime&payment_id=pay_ok_1');
    await expect(page.locator('[data-state="waiting"]')).toBeVisible();
    await expect(page.locator('[data-state="ready"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-state="ready"]')).toContainText('••••-••••-••••-AB12');
    await expect(page.locator('[data-state="ready"]')).toContainText('Plan: Lifetime');
    await expect(page.getByRole('link', { name: 'Download for Mac' })).toHaveAttribute(
      'href',
      /downloads/,
    );
  });

  test('no ids → no-ids state', async ({ page }) => {
    await page.goto('/checkout/success/');
    await expect(page.locator('[data-state="no-ids"]')).toContainText(
      "We couldn't find your order details",
    );
  });

  test('failed payment state', async ({ page }) => {
    await page.goto('/checkout/success/?payment_id=pay_fail_1');
    await expect(page.locator('[data-state="failed"]')).toContainText('Payment not completed');
  });

  test('timeout after 60 pending polls, Check again restarts', async ({ page }) => {
    await page.goto('/checkout/success/?payment_id=pay_slow_1');
    await expect(page.locator('[data-state="timeout"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-state="timeout"]')).toContainText('pay_slow_1');
    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.locator('[data-state="waiting"]')).toBeVisible();
  });

  test('server down → error state after 5 consecutive failures', async ({ page }) => {
    await page.goto('/checkout/success/?payment_id=pay_down_1');
    await expect(page.locator('[data-state="error"]')).toContainText("We can't reach our server", {
      timeout: 20_000,
    });
  });
});
