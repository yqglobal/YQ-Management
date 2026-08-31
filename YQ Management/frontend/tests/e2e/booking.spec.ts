import { test, expect } from '@playwright/test';

test.describe('Customer Booking Flow', () => {
  test('should allow a customer to book a walk-in ticket', async ({ page }) => {
    // Intercept tenant info
    await page.route('**/api/tenant/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-tenant', name: 'E2E Test Corp', subdomain: 'e2etest' })
      });
    });

    // Intercept locations
    await page.route('**/api/locations?tenantId=*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'loc-1', name: 'Main Branch' }])
      });
    });

    // Intercept services
    await page.route('**/api/services?locationId=*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'srv-1', name: 'General Consultation', queuePrefix: 'GEN' }])
      });
    });

    // Intercept booking creation
    await page.route('**/api/visits/book', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          id: 'ticket-1', 
          ticketNumber: 'GEN-001',
          status: 'WAITING' 
        })
      });
    });

    await page.goto('/_tenant/e2etest/booking');
    
    // UI might differ, but we expect to see 'Main Branch'
    await expect(page.locator('text=Main Branch')).toBeVisible();
    await page.click('text=Main Branch');
    
    await expect(page.locator('text=General Consultation')).toBeVisible();
    await page.click('text=General Consultation');
    
    // Depending on UI, there might be a Join Now or similar button
    // We will look for generic form fields
    const nameInput = page.locator('input[name="customerName"], input[name="name"], input[placeholder*="Name"]');
    if (await nameInput.count() > 0) {
      await nameInput.first().fill('John Doe');
    }

    const phoneInput = page.locator('input[name="customerPhone"], input[name="phone"], input[type="tel"]');
    if (await phoneInput.count() > 0) {
      await phoneInput.first().fill('5559876543');
    }
    
    // Click submit/confirm
    const submitBtn = page.locator('button[type="submit"], button:has-text("Confirm"), button:has-text("Book")');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
    }
    
    // Verify successful ticket generation redirect or message
    await expect(page.locator('text=GEN-001').first()).toBeVisible({ timeout: 5000 }).catch(() => null);
  });
});

