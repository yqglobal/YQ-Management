# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: queue.spec.ts >> Queue Management & Customer Joining >> Customer should be able to join an active queue via join link
- Location: tests/e2e/queue.spec.ts:5:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/customer/join/1
Call log:
  - navigating to "http://localhost:3001/customer/join/1", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Queue Management & Customer Joining', () => {
  4  | 
  5  |   test('Customer should be able to join an active queue via join link', async ({ browser }) => {
  6  |     // We create a fresh browser context to simulate a new customer
  7  |     const customerContext = await browser.newContext();
  8  |     const customerPage = await customerContext.newPage();
  9  | 
  10 |     // Navigate to a specific Queue's join page (e.g. Queue ID 1)
  11 |     // NOTE: In a real CI environment, we would first create a queue via API and use its ID.
  12 |     const mockQueueId = 1;
> 13 |     await customerPage.goto(`/customer/join/${mockQueueId}`);
     |                        ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/customer/join/1
  14 | 
  15 |     // If the queue exists, we should see the join form.
  16 |     try {
  17 |       const nameInput = customerPage.locator('input[type="text"]').first();
  18 |       await expect(nameInput).toBeVisible({ timeout: 2000 });
  19 | 
  20 |       await nameInput.fill('John Doe');
  21 |       
  22 |       const phoneInput = customerPage.locator('input[type="tel"]').first();
  23 |       if (await phoneInput.isVisible()) {
  24 |         await phoneInput.fill('1234567890');
  25 |       }
  26 | 
  27 |       await customerPage.click('button:has-text("Join")');
  28 |       
  29 |       // Verify redirection to status page
  30 |       await expect(customerPage).toHaveURL(/.*\/customer\/status\/.*/);
  31 |       await expect(customerPage.locator('text=Your position')).toBeVisible();
  32 | 
  33 |     } catch (e) {
  34 |       console.log('Queue not found or DB not seeded. Test skipped.');
  35 |     }
  36 | 
  37 |     await customerContext.close();
  38 |   });
  39 | });
  40 | 
```