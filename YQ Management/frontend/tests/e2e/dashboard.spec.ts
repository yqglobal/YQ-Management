import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-utils';

test.describe('Dashboard Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Tenant Admin can access settings and view limits', async ({ page }) => {
    // Intercept quota API
    await page.route('**/api/tenant/limits', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          planName: 'Premium',
          usage: { locations: 1, services: 1 },
          limits: { locations: 10, services: 50 },
          frozenByQuota: false
        })
      });
    });

    await page.goto('/dashboard/settings/operations');
    
    // Should see operations heading or Locations
    await expect(page.locator('text=Locations').first()).toBeVisible();
    await expect(page.locator('text=Services').first()).toBeVisible();
  });

  test('Tenant Admin can view Queue Management', async ({ page }) => {
    // Intercept queues API
    await page.route('**/*queue*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'queue-1', name: 'General Consultation Queue', status: 'ACTIVE', services: [{ id: 's1', name: 'General' }], _count: { tokens: 1 } }
        ])
      });
    });

    await page.goto('/dashboard/queues');
    
    // Verify queue appears
    await expect(page.locator('text=General Consultation Queue').first()).toBeVisible();
  });
});
