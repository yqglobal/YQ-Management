# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: load.spec.ts >> Mass Queue Population & Load Test >> Dashboard should render all massive queues seamlessly
- Location: tests/e2e/load.spec.ts:12:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { seedMassQueues } from './helpers/seed';
  3  | 
  4  | test.describe('Mass Queue Population & Load Test', () => {
  5  |   let credentials: { email: string; password: string; queueIds: string[] };
  6  | 
  7  |   test.beforeAll(async () => {
  8  |     // Inject 4 queues with 20 customers each into the database before browser opens
  9  |     credentials = await seedMassQueues();
  10 |   });
  11 | 
  12 |   test('Dashboard should render all massive queues seamlessly', async ({ page }) => {
  13 |     // Log in
> 14 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
  15 |     await page.fill('input[type="email"]', credentials.email);
  16 |     await page.fill('input[type="password"]', credentials.password);
  17 |     await page.click('button[type="submit"]');
  18 | 
  19 |     // Enter OTP
  20 |     await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
  21 |     await page.fill('input[placeholder="000000"]', '000000');
  22 |     await page.click('button[type="submit"]');
  23 | 
  24 |     // Wait for dashboard to load
  25 |     await expect(page).toHaveURL(/.*\/dashboard/);
  26 | 
  27 |     // Verify 4 queues exist on the dashboard
  28 |     const queueCards = page.locator('a[href^="/dashboard/queues/"]');
  29 |     await expect(queueCards).toHaveCount(4);
  30 | 
  31 |     // Verify the queues show roughly 20 people waiting (or whatever the metric is)
  32 |     // Since UI might differ, we just verify the names of the queues are visible
  33 |     for (let i = 1; i <= 4; i++) {
  34 |       await expect(page.locator(`text=Load Test Queue ${i}`)).toBeVisible();
  35 |     }
  36 |     
  37 |     // Click into the first queue (force in case of transient modal overlays)
  38 |     // If click is blocked by overlays, fall back to reading the href and navigating directly.
  39 |     const firstCard = queueCards.first();
  40 |     try {
  41 |       await firstCard.click({ force: true });
  42 |       await expect(page).toHaveURL(/.*\/dashboard\/queues\/.*/);
  43 |     } catch (e) {
  44 |       const href = await firstCard.getAttribute('href');
  45 |       if (!href) throw e;
  46 |       await page.goto(href);
  47 |       await expect(page).toHaveURL(/.*\/dashboard\/queues\/.*/);
  48 |     }
  49 | 
  50 |     // Verify the list has 20 customers (or at least a large number is rendered)
  51 |     const customerRows = page.locator('p:has-text("Customer")');
  52 |     // Might not all be in DOM if virtualized, but expect more than 1
  53 |     const count = await customerRows.count();
  54 |     // In some environments the list may be virtualized; accept zero as a non-fatal result
  55 |     expect(count).toBeGreaterThanOrEqual(0);
  56 |   });
  57 | });
  58 | 
```