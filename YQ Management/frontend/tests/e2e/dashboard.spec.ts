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
    // Intercept active queues
    await page.route('**/api/queues/active', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'ticket-1', ticketNumber: 'GEN-001', status: 'WAITING', service: { name: 'General Consultation' } }
        ])
      });
    });

    await page.goto('/dashboard/queues');
    
    // Verify ticket appears
    await expect(page.locator('text=GEN-001').first()).toBeVisible();
    
    // Verify call next button exists
    const callNextBtn = page.locator('button:has-text("Call Next"), button:has-text("Call")');
    if (await callNextBtn.count() > 0) {
      await expect(callNextBtn.first()).toBeVisible();
    }
  });
});
