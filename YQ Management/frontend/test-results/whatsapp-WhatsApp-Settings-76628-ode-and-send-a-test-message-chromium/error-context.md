# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: whatsapp.spec.ts >> WhatsApp Settings E2E Flow >> Should navigate to WhatsApp settings, generate QR, generate Pairing Code, and send a test message
- Location: tests/e2e/whatsapp.spec.ts:11:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { seedMassQueues } from './helpers/seed';
  3   | 
  4   | test.describe('WhatsApp Settings E2E Flow', () => {
  5   |   let credentials: { email: string; password: string; queueIds: string[] };
  6   | 
  7   |   test.beforeAll(async () => {
  8   |     credentials = await seedMassQueues();
  9   |   });
  10  | 
  11  |   test('Should navigate to WhatsApp settings, generate QR, generate Pairing Code, and send a test message', async ({ page }) => {
  12  |     // 1. Intercept Status endpoint
  13  |     let state = 'close';
  14  |     await page.route('**/whatsapp/status', async route => {
  15  |       await route.fulfill({
  16  |         status: 200,
  17  |         contentType: 'application/json',
  18  |         body: JSON.stringify({ state, connectedNumber: state === 'open' ? '1234567890' : undefined })
  19  |       });
  20  |     });
  21  | 
  22  |     // 2. Intercept Connect (QR) endpoint
  23  |     await page.route('**/whatsapp/connect', async route => {
  24  |       await route.fulfill({
  25  |         status: 200,
  26  |         contentType: 'application/json',
  27  |         body: JSON.stringify({ qr: 'data:image/png;base64,mockqr', state: 'connecting' })
  28  |       });
  29  |     });
  30  | 
  31  |     // 3. Intercept Pairing Code endpoint
  32  |     await page.route('**/whatsapp/pairing-code', async route => {
  33  |       await route.fulfill({
  34  |         status: 200,
  35  |         contentType: 'application/json',
  36  |         body: JSON.stringify({ pairingCode: 'ABC-DEF-GHI' })
  37  |       });
  38  |     });
  39  | 
  40  |     // 4. Intercept Test Message endpoint
  41  |     await page.route('**/whatsapp/test', async route => {
  42  |       await route.fulfill({
  43  |         status: 200,
  44  |         contentType: 'application/json',
  45  |         body: JSON.stringify({ success: true })
  46  |       });
  47  |     });
  48  | 
  49  |     // 5. Intercept Frontend Logs endpoint
  50  |     await page.route('**/whatsapp/frontend-log', async route => {
  51  |       await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
  52  |     });
  53  | 
  54  |     // 6. Login to Dashboard
> 55  |     await page.goto('/login');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
  56  |     await page.fill('input[type="email"]', credentials.email);
  57  |     await page.fill('input[type="password"]', credentials.password);
  58  |     await page.click('button[type="submit"]');
  59  | 
  60  |     try {
  61  |       const otpSelector = 'input[placeholder="000000"]';
  62  |       await page.waitForSelector(otpSelector, { timeout: 2000 });
  63  |       await page.fill(otpSelector, '000000');
  64  |       await page.click('button[type="submit"]');
  65  |     } catch (e) {
  66  |       // OTP not required
  67  |     }
  68  | 
  69  |     await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
  70  | 
  71  |     // 7. Navigate to WhatsApp Settings
  72  |     await page.goto('/dashboard/settings/whatsapp');
  73  |     
  74  |     // Skip tour modal if it appears
  75  |     try {
  76  |       await page.locator('button', { hasText: 'Skip' }).click({ timeout: 2000 });
  77  |     } catch (e) {}
  78  | 
  79  |     await expect(page.locator('h2', { hasText: 'Device Connectivity' })).toBeVisible();
  80  | 
  81  |     // 8. Test QR Generation Flow
  82  |     const generateQrBtn = page.locator('button', { hasText: 'Generate QR Code' });
  83  |     await expect(generateQrBtn).toBeVisible();
  84  |     await generateQrBtn.click();
  85  |     
  86  | 
  87  | 
  88  |     // 10. Simulate successful connection
  89  |     state = 'open'; // Subsequent polls to /whatsapp/status will now return connected
  90  | 
  91  |     // Give it time to poll and switch UI
  92  |     await expect(page.locator('h3', { hasText: 'Connected & Active' })).toBeVisible({ timeout: 10000 });
  93  | 
  94  |     // 11. Test Message Flow
  95  |     const testPhoneInput = page.locator('input[type="tel"]').first();
  96  |     // Focus and fill
  97  |     await testPhoneInput.fill('0987654321');
  98  |     const testMessageArea = page.locator('textarea');
  99  |     await testMessageArea.fill('Hello from E2E Test');
  100 | 
  101 |     const dispatchBtn = page.locator('button', { hasText: 'Dispatch Message' });
  102 |     await dispatchBtn.click();
  103 | 
  104 |     // Verify success toast
  105 |     await expect(page.locator('text=Test message sent successfully')).toBeVisible();
  106 |   });
  107 | });
  108 | 
```