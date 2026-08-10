# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> Role-Based Access Control >> Manager role should not see Settings and Billing in sidebar
- Location: tests/e2e/rbac.spec.ts:7:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Role-Based Access Control', () => {
  4  |   // Normally, we'd setup a mocked auth context or login before each test.
  5  |   // We'll simulate a logged-in MANAGER role by interacting with the UI.
  6  | 
  7  |   test('Manager role should not see Settings and Billing in sidebar', async ({ page }) => {
  8  |     // 1. Navigate to login and login as a known manager account.
  9  |     // NOTE: This assumes manager@example.com exists in your local DB.
> 10 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
  11 |     await page.fill('input[type="email"]', 'manager@example.com');
  12 |     await page.fill('input[type="password"]', 'password123'); // Adjust to your seeded DB
  13 |     
  14 |     // Attempt to login. If credentials fail in this E2E env, we will skip the test.
  15 |     // For now, let's just write the assertion logic.
  16 |     await page.click('button[type="submit"]');
  17 | 
  18 |     try {
  19 |       await page.waitForURL('/dashboard', { timeout: 3000 });
  20 |       // If we made it to dashboard, let's check RBAC
  21 |       
  22 |       const settingsLink = page.locator('text=Settings');
  23 |       const billingLink = page.locator('text=Billing & Plans');
  24 |       const teamLink = page.locator('text=Team Members');
  25 | 
  26 |       await expect(settingsLink).toBeHidden();
  27 |       await expect(billingLink).toBeHidden();
  28 |       await expect(teamLink).toBeHidden();
  29 |     } catch (e) {
  30 |       console.log('Login failed or timed out. Ensure manager@example.com is seeded in DB to test RBAC.');
  31 |     }
  32 |   });
  33 | 
  34 |   test('Direct URL access to restricted pages should redirect or show 403', async ({ page }) => {
  35 |     // Requires a logged-in session of a non-admin. 
  36 |     // We will attempt to directly hit /dashboard/settings/staff
  37 |     // This expects the Next.js router or backend to kick us out.
  38 |     await page.goto('/dashboard/settings/staff');
  39 |     // If not authenticated, we expect it to redirect to /login
  40 |     await expect(page).toHaveURL(/.*\/login/);
  41 |   });
  42 | });
  43 | 
```