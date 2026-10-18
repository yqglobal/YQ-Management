import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-utils';

test.describe('Visit Management Flow', () => {
  const runId = Math.floor(Math.random() * 10000);
  const customerName = `E2E Customer ${runId}`;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should create a new walk-in visit and manage customer records', async ({ page }) => {
    // 1. Navigate to Customer Records page
    await page.goto('/dashboard/people');
    await expect(page.locator('h1', { hasText: 'Customer Records' })).toBeVisible({ timeout: 15000 });

    // 2. Open Add Customer / Booking Modal
    const addBtn = page.locator('button', { hasText: 'Add Customer' });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 3. Verify modal opens
    await expect(page.locator('h2', { hasText: 'Reception Service Booking' })).toBeVisible();

    // 4. Fill customer details
    await page.fill('input[placeholder="e.g. John Doe"]', customerName);

    // 5. Select location and service
    const locationSelect = page.locator('select').filter({ hasText: 'Select location...' });
    await expect(locationSelect).toBeVisible();
    await expect(locationSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 });
    await locationSelect.selectOption({ index: 1 });

    const serviceSelect = page.locator('select').filter({ hasText: 'Select service...' });
    await expect(serviceSelect).toBeVisible();
    await expect(serviceSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 });
    await serviceSelect.selectOption({ index: 1 });

    // 6. Submit the form
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Add to Queue' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 7. Verify modal closes
    await expect(page.locator('h2', { hasText: 'Reception Service Booking' })).toBeHidden({ timeout: 10000 });
  });
});
