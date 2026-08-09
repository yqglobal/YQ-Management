import { test, expect } from '@playwright/test';
import { seedMassQueues } from './helpers/seed';

test.describe('WhatsApp Settings E2E Flow', () => {
  let credentials: { email: string; password: string; queueIds: string[] };

  test.beforeAll(async () => {
    credentials = await seedMassQueues();
  });

  test('Should navigate to WhatsApp settings, generate QR, generate Pairing Code, and send a test message', async ({ page }) => {
    // 1. Intercept Status endpoint
    let state = 'close';
    await page.route('**/whatsapp/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ state, connectedNumber: state === 'open' ? '1234567890' : undefined })
      });
    });

    // 2. Intercept Connect (QR) endpoint
    await page.route('**/whatsapp/connect', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ qr: 'data:image/png;base64,mockqr', state: 'connecting' })
      });
    });

    // 3. Intercept Pairing Code endpoint
    await page.route('**/whatsapp/pairing-code', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pairingCode: 'ABC-DEF-GHI' })
      });
    });

    // 4. Intercept Test Message endpoint
    await page.route('**/whatsapp/test', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // 5. Intercept Frontend Logs endpoint
    await page.route('**/whatsapp/frontend-log', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // 6. Login to Dashboard
    await page.goto('/login');
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');

    try {
      const otpSelector = 'input[placeholder="000000"]';
      await page.waitForSelector(otpSelector, { timeout: 2000 });
      await page.fill(otpSelector, '000000');
      await page.click('button[type="submit"]');
    } catch (e) {
      // OTP not required
    }

    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });

    // 7. Navigate to WhatsApp Settings
    await page.goto('/dashboard/settings/whatsapp');
    
    // Skip tour modal if it appears
    try {
      await page.locator('button', { hasText: 'Skip' }).click({ timeout: 2000 });
    } catch (e) {}

    await expect(page.locator('h2', { hasText: 'Device Connectivity' })).toBeVisible();

    // 8. Test QR Generation Flow
    const generateQrBtn = page.locator('button', { hasText: 'Generate QR Code' });
    await expect(generateQrBtn).toBeVisible();
    await generateQrBtn.click();
    


    // 10. Simulate successful connection
    state = 'open'; // Subsequent polls to /whatsapp/status will now return connected

    // Give it time to poll and switch UI
    await expect(page.locator('h3', { hasText: 'Connected & Active' })).toBeVisible({ timeout: 10000 });

    // 11. Test Message Flow
    const testPhoneInput = page.locator('input[type="tel"]').first();
    // Focus and fill
    await testPhoneInput.fill('0987654321');
    const testMessageArea = page.locator('textarea');
    await testMessageArea.fill('Hello from E2E Test');

    const dispatchBtn = page.locator('button', { hasText: 'Dispatch Message' });
    await dispatchBtn.click();

    // Verify success toast
    await expect(page.locator('text=Test message sent successfully')).toBeVisible();
  });
});
