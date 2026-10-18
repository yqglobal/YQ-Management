import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-utils';

test.describe('Billing & Plan Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should render PlanSelectModal without crashing when upgrading plan', async ({ page }) => {
    await page.goto('/dashboard/settings/billing');

    const upgradeButton = page.locator('button', { hasText: /(Upgrade to a Paid Plan|Upgrade Plan|Change Plan)/ }).first();
    await expect(upgradeButton).toBeVisible({ timeout: 10000 });

    await upgradeButton.click();

    const modalTitle = page.locator('text=Choose a Plan');
    await expect(modalTitle).toBeVisible();

    const selectButtons = page.locator('button', { hasText: 'Select Plan' });
    await expect(selectButtons.first()).toBeVisible();
  });
});
