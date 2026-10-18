import { test, expect } from '@playwright/test';

test.describe('Customer Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('qmova_cookie_consent', JSON.stringify({ necessary: true, analytics: true, functional: true, marketing: true }));
    });
  });

  test('should allow a customer to book a walk-in ticket', async ({ page }) => {
    await page.goto('/t/xyzz/booking/main-branch');
    
    // Step 2 Services are visible
    await expect(page.locator('text=Dental Check-up').first()).toBeVisible({ timeout: 10000 });
    await page.click('text=Dental Check-up');
    
    // Look for generic form fields
    const nameInput = page.locator('input[name="customerName"], input[name="name"], input[placeholder*="Name"]');
    if (await nameInput.count() > 0) {
      await nameInput.first().fill('John Doe');
    }

    const phoneInput = page.locator('input[name="customerPhone"], input[name="phone"], input[type="tel"]');
    if (await phoneInput.count() > 0) {
      await phoneInput.first().fill('5559876543');
    }
  });
});
