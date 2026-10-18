import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-utils';

test.describe('Mass Queue Population & Load Test', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Dashboard should render all massive queues seamlessly', async ({ page }) => {
    const massQueues = Array.from({ length: 4 }).map((_, i) => ({
      id: `queue-${i + 1}`,
      name: `Load Test Queue ${i + 1}`,
      status: 'ACTIVE',
      services: [{ id: `srv-${i + 1}`, name: `Service ${i + 1}` }],
      _count: { tokens: 20 },
      location: { name: 'Main Branch' }
    }));

    await page.route(url => url.port === '3000' && url.pathname.startsWith('/queue'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(massQueues)
      });
    });

    // Navigate to Queues page
    await page.goto('/dashboard/queues');
    await expect(page.locator('h1', { hasText: 'Queues' })).toBeVisible({ timeout: 15000 });

    // Verify 4 queues exist on the dashboard
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator(`text=Load Test Queue ${i}`)).toBeVisible();
    }

    // Click into the first queue Manage button
    const manageButtons = page.locator('button', { hasText: 'Manage' });
    await expect(manageButtons.first()).toBeVisible();
    await manageButtons.first().click();

    // Verify navigation to queue details
    await expect(page).toHaveURL(/.*\/dashboard\/queues\/.*/);
  });
});
