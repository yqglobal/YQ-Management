import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Login | YQ Queue/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  });

  test('should handle incorrect credentials gracefully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'badpassword');
    await page.click('button[type="submit"]');

    // Wait for error message (assuming the API returns 401 and UI shows an error)
    const errorMessage = page.locator('.bg-red-500\\/10');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    const startLink = page.getByRole('link', { name: /Start free trial/ });
    await expect(startLink.first()).toBeVisible();
    await startLink.first().click();
    await page.waitForURL(/.*\/register/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });
});
