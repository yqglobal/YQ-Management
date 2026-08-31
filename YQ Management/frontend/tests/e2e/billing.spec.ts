import { test, expect } from '@playwright/test';

test.describe('Billing & Plan Management', () => {
  test('should render PlanSelectModal without crashing when upgrading plan', async ({ page }) => {
    // Navigate to billing page
    await page.goto('/dashboard/settings/billing');

    // Wait for the page to load and display the upgrade button
    // Using a more generic selector depending on exactly what text is visible,
    // in our case we have "Upgrade Plan" or "Change Plan".
    const upgradeButton = page.locator('button', { hasText: /(Upgrade Plan|Change Plan)/ }).first();
    
    // Ensure the button is visible before clicking
    await expect(upgradeButton).toBeVisible();

    // Click the upgrade button
    await upgradeButton.click();

    // Verify the PlanSelectModal renders without "DialogContent is not defined" error
    // It should contain the text "Choose a Plan"
    const modalTitle = page.locator('text=Choose a Plan');
    await expect(modalTitle).toBeVisible();

    // Verify we see actual plans (e.g., Standard, Premium, etc. with "Select Plan" buttons)
    const selectButtons = page.locator('button', { hasText: 'Select Plan' });
    await expect(selectButtons.first()).toBeVisible();
  });
});
