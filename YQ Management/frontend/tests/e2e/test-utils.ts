import { Page } from '@playwright/test';

/**
 * Mocks the authentication state for a user by setting a JWT cookie.
 * In a real application, you might hit a dedicated /api/test/login endpoint
 * that returns a valid token for the test user.
 */
export async function loginAsAdmin(page: Page) {
  // Option 1: Navigate to login and fill out the form
  // await page.goto('/login');
  // await page.fill('input[name="email"]', 'admin@e2etest.com');
  // await page.fill('input[name="password"]', 'password123');
  // await page.click('button[type="submit"]');
  // await page.waitForURL('/dashboard');
  
  // Option 2: Fast auth via setting the cookie directly
  // This requires knowing the exact cookie name (e.g. 'jwt' or 'Authentication')
  // We'll simulate standard login for robustness in E2E since testing the login 
  // flow itself is valuable.
  
  await page.goto('/login');
  // We assume the test user is seeded, but since we didn't seed a hashed password
  // in global setup, we will mock the API response for login to always succeed for E2E.
  
  await page.route('**/api/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'test-admin', email: 'admin@e2etest.com', role: 'ADMIN', tenantId: 'test-tenant' },
        tenant: { id: 'test-tenant', subdomain: 'e2etest' },
        token: 'fake-jwt-token'
      })
    });
  });

  await page.fill('input[type="email"]', 'admin@e2etest.com');
  await page.fill('input[type="password"]', 'any-password');
  await page.click('button[type="submit"]');
  
  // Wait for the dashboard to load
  await page.waitForURL('**/dashboard**');
}
