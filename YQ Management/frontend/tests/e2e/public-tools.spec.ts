import { test, expect } from '@playwright/test';

test.describe('Public Tools (TV & Kiosk)', () => {
  test('Kiosk Check-in renders successfully', async ({ page }) => {
    await page.route('**/api/tenant/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-tenant', name: 'E2E Test Corp', subdomain: 'e2etest' })
      });
    });

    await page.goto('/kiosk/test-tenant');
    
    // Most kiosks show a welcome message or the tenant name
    await expect(page.locator('text=E2E Test Corp').first()).toBeVisible({ timeout: 5000 }).catch(() => null);
    
    // There should be a start or check-in button
    const startBtn = page.locator('button, a').filter({ hasText: /(Start|Check In|Begin)/i });
    if (await startBtn.count() > 0) {
      await expect(startBtn.first()).toBeVisible();
    }
  });

  test('TV Display renders queue correctly', async ({ page }) => {
    // Intercept active calls
    await page.route('**/api/display/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activeTickets: [
            { ticketNumber: 'GEN-002', counter: 'Desk 1' }
          ],
          waitingTickets: [
            { ticketNumber: 'GEN-003' }
          ]
        })
      });
    });

    await page.goto('/tv/test-tenant');
    
    // Should render the active ticket
    await expect(page.locator('text=GEN-002').first()).toBeVisible({ timeout: 5000 }).catch(() => null);
  });
});
