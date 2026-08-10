# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should load the login page
- Location: tests/e2e/auth.spec.ts:4:7

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
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should load the login page', async ({ page }) => {
> 5  |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
  6  |     await expect(page).toHaveTitle(/Login | YQ Queue/);
  7  |     await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  8  |   });
  9  | 
  10 |   test('should handle incorrect credentials gracefully', async ({ page }) => {
  11 |     await page.goto('/login');
  12 |     await page.fill('input[type="email"]', 'wrong@example.com');
  13 |     await page.fill('input[type="password"]', 'badpassword');
  14 |     await page.click('button[type="submit"]');
  15 | 
  16 |     // Wait for error message (assuming the API returns 401 and UI shows an error)
  17 |     const errorMessage = page.locator('.bg-red-500\\/10');
  18 |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
  19 |   });
  20 | 
  21 |   test('should navigate to registration page', async ({ page }) => {
  22 |     await page.goto('/login');
  23 |     const startLink = page.getByRole('link', { name: /Start free trial/ });
  24 |     await expect(startLink.first()).toBeVisible();
  25 |     await startLink.first().click();
  26 |     await page.waitForURL(/.*\/register/);
  27 |     await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  28 |   });
  29 | });
  30 | 
```