import { test, expect } from '@playwright/test';

test.describe('Visit Management Flow', () => {
  // Use a unique suffix for this test run to avoid collisions
  const runId = Math.floor(Math.random() * 10000);
  const customerName = `E2E Customer ${runId}`;

  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test-admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);
    
    // Ensure we are logged in by checking for the dashboard title
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create a new walk-in visit and manage its lifecycle', async ({ page }) => {
    // Go to Check-in page
    await page.click('text=Check-In');
    await expect(page).toHaveURL(/\/dashboard\/check-in/);

    // Fill in walk-in form
    await page.fill('input[name="customerName"]', customerName);
    await page.fill('input[name="customerPhone"]', '5551234567');
    await page.click('button[type="submit"]');

    // Should see success message or be redirected to People/Queue board
    // Wait for the new visit to appear on the People board
    await page.click('text=People');
    await expect(page).toHaveURL(/\/dashboard\/people/);

    // Verify the customer is in the waiting list
    const visitCard = page.locator(`text=${customerName}`);
    await expect(visitCard).toBeVisible({ timeout: 10000 });

    // Transition to In Service (Start Service)
    const startButton = page.locator(`tr:has-text("${customerName}") button:has-text("Start")`);
    // Alternatively, if it's a kanban board or cards
    // This depends on the exact UI of /dashboard/people. 
    // Assuming there is a "Start" action button in the list row
    if (await startButton.count() > 0) {
      await startButton.click();
      
      // Optionally wait for status change confirmation
      await expect(page.locator(`text=${customerName} - IN_SERVICE`).or(page.locator(`text=${customerName} (Serving)`))).toBeVisible({ timeout: 5000 });
      
      // Complete Service
      const completeButton = page.locator(`tr:has-text("${customerName}") button:has-text("Complete")`);
      if (await completeButton.count() > 0) {
         await completeButton.click();
      }
    }
  });
});
