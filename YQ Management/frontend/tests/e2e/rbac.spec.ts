import { test, expect } from '@playwright/test';
import { loginAsRole } from './test-utils';

test.describe('Role-Based Access Control', () => {
  test('Manager role should not see Settings in sidebar', async ({ page }) => {
    await loginAsRole(page, 'MANAGER');

    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '14886bec-ecfc-4ba9-87d5-d7d74a7e920b',
          email: 'manager@example.com',
          role: 'MANAGER',
          tenantId: '36543677-acf4-4c04-bfc2-0e96881c2646',
          personalSettings: { onboardingCompleted: true }
        })
      });
    });

    await page.goto('/dashboard/service-desk');
    await expect(page).toHaveURL(/\/dashboard\/service-desk/);

    // Verify Settings and Super Admin links are hidden for MANAGER role
    const settingsLink = page.locator('a[href*="/dashboard/settings"]');
    await expect(settingsLink).toBeHidden();

    const superAdminLink = page.locator('a[href*="/super-admin"]');
    await expect(superAdminLink).toBeHidden();
  });

  test('Direct URL access to restricted pages should redirect to login when unauthenticated', async ({ page }) => {
    // Navigate directly without authentication
    await page.goto('/dashboard/settings/workspace');
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });
});
