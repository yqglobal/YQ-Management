import { test, expect } from '@playwright/test';
import { loginAsRole } from './test-utils';

test.describe('WhatsApp Settings E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as SUPER_ADMIN to ensure FeatureGuard does not lock WhatsApp integrations
    await loginAsRole(page, 'SUPER_ADMIN');
  });

  test('Should navigate to WhatsApp settings, generate QR, and send a test message', async ({ page }) => {
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

    // 6. Ensure tenant uses Evolution API provider
    await page.route('**/tenant/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'tenant-123', whatsappProvider: 'EVOLUTION' })
      });
    });

    // 7. Navigate to WhatsApp Integrations Settings
    await page.goto('/dashboard/settings/integrations');

    // Ensure Evolution API tab is selected
    const evolutionBtn = page.locator('button', { hasText: 'Evolution API (QR Code)' });
    if (await evolutionBtn.isVisible()) {
      await evolutionBtn.click();
    }

    await expect(page.locator('h3', { hasText: 'Link Your Account' })).toBeVisible({ timeout: 15000 });

    // 8. Test QR Generation Flow
    const generateQrBtn = page.locator('button', { hasText: 'Generate QR Code' });
    await expect(generateQrBtn).toBeVisible({ timeout: 10000 });
    await generateQrBtn.click();

    // Verify QR code image is displayed
    const qrImg = page.locator('img[alt="WhatsApp QR Code"]');
    await expect(qrImg).toBeVisible({ timeout: 10000 });

    // 8. Simulate successful connection
    state = 'open'; // Subsequent refetches/polls to /whatsapp/status will now return connected
    await page.reload();

    // Verify Connected & Send Test Message section appears
    await expect(page.locator('h3', { hasText: 'Send Test Message' })).toBeVisible({ timeout: 15000 });

    // 9. Test Message Flow
    const testPhoneInput = page.locator('input[placeholder="234 567 8900"]');
    await expect(testPhoneInput).toBeVisible();
    await testPhoneInput.fill('0987654321');

    const testMessageArea = page.locator('textarea[placeholder="Type a test message..."]');
    await testMessageArea.fill('Hello from E2E Test');

    const dispatchBtn = page.locator('button', { hasText: 'Dispatch Message' });
    await expect(dispatchBtn).toBeEnabled();
    await dispatchBtn.click();

    // Verify success toast
    await expect(page.locator('text=Test message sent successfully')).toBeVisible({ timeout: 10000 });
  });
});
