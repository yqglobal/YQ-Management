import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-utils';

test.describe('Service Desk & Queue Management Flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Left navigation bar smoothly auto-collapses when right details sidebar opens and restores when closed', async ({ page }) => {
    const mockVisitId = 'test-visit-123';
    await page.route('**/visits**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: mockVisitId,
            displayId: '#TKT-999',
            ticketNumber: '999',
            currentState: 'WAITING',
            customer: { name: 'Jane Doe', phone: '+1234567890' },
            service: { name: 'Dental Check-up', expectedDuration: 30 },
            createdAt: new Date().toISOString(),
          }
        ])
      });
    });

    // 1. Navigate to Service Desk
    await page.goto('/dashboard/service-desk');
    await expect(page).toHaveURL(/\/dashboard\/service-desk/);

    const nav = page.locator('nav[aria-label="Main Navigation"]');
    await expect(nav).toBeVisible();

    // 2. Initial state: left sidebar should be expanded (not collapsed)
    await expect(nav).toHaveClass(/md:w-sidebar-w/);

    // 3. Click on the customer card to open the right details sidebar
    const customerCard = page.getByTestId(`visit-card-${mockVisitId}`);
    await expect(customerCard).toBeVisible({ timeout: 10000 });
    await customerCard.click();

    // 4. Verify right details sidebar opened
    const closeBtn = page.locator('button[title="Close details"]');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });

    // 5. Verify left main navigation bar automatically collapsed smoothly to md:w-20
    await expect(nav).toHaveClass(/md:w-20/);

    // 6. Close the right details sidebar
    await closeBtn.click();
    await expect(closeBtn).toBeHidden({ timeout: 5000 });

    // 7. Verify left main navigation bar automatically restored to full width md:w-sidebar-w
    await expect(nav).toHaveClass(/md:w-sidebar-w/);
  });

  test('Active queue on content area is highlighted in service pipeline, and separate Est. finish time is displayed', async ({ page }) => {
    const mockQueueId = 'q-dental-101';
    const mockVisitId = 'visit-dental-202';

    // Mock queue list
    await page.route('**/queue**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: mockQueueId, name: 'Dental Check-up Desk', status: 'ACTIVE', locationId: 'loc-1' },
            { id: 'q-general-102', name: 'General Consultation', status: 'ACTIVE', locationId: 'loc-1' }
          ])
        });
      } else {
        await route.continue();
      }
    });

    // Mock visit list
    await page.route('**/visits**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: mockVisitId,
              displayId: 'Q007',
              ticketNumber: '007',
              currentState: 'WAITING',
              queueId: mockQueueId,
              customer: { name: 'Abhimanyu Negi', phone: '+1234567890' },
              service: { name: 'Dental Check-up', expectedDuration: 30 },
              waitingStart: new Date(Date.now() - 6 * 60000).toISOString(),
              createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
            }
          ])
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/service-desk');
    await expect(page).toHaveURL(/\/dashboard\/service-desk/);

    // 1. Verify that Dental Check-up Desk appears with ACTIVE highlight badge in pipeline
    const dentalQueueCard = page.locator('text=Dental Check-up Desk').first();
    await expect(dentalQueueCard).toBeVisible({ timeout: 10000 });
    const activeBadge = page.getByTestId('active-queue-badge').first();
    await expect(activeBadge).toBeVisible();

    // 2. Verify pool card contains Waiting and Est. Wait
    const poolCard = page.locator('text=Abhimanyu Negi').first();
    await expect(poolCard).toBeVisible();
    await expect(page.locator('text=Waiting: 6m').first()).toBeVisible();

    // 3. Open details drawer
    await poolCard.click();

    // 4. Verify separate titles: "Waiting time:", "Est. wait:", and "Est. finish time:" in the details panel
    await expect(page.locator('text=Waiting time:').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Est. wait:').first()).toBeVisible();
    await expect(page.locator('text=Est. finish time:').first()).toBeVisible();

    // 5. Test Announce when WhatsApp is not connected
    await page.route(`**/visits/${mockVisitId}/announce`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          announced: true,
          displayId: 'Q007',
          customerName: 'Abhimanyu Negi',
          whatsappConnected: false,
          hasCustomerPhone: true,
          whatsappSent: false
        })
      });
    });

    const announceBtn = page.locator('button:has-text("Announce")').first();
    await announceBtn.click();

    // Verify toast warning message
    await expect(page.locator('text=WhatsApp message not sent — WhatsApp not connected').first()).toBeVisible({ timeout: 5000 });
  });

  test('Start Service without QR scan opens modal and triggers service start without timing out', async ({ page }) => {
    const mockVisitId = 'visit-start-test';

    await page.route('**/visits**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: mockVisitId,
              displayId: 'Q005',
              ticketNumber: '005',
              currentState: 'WAITING',
              customer: { name: 'Abhimanyu Negi', phone: '+1234567890' },
              service: { name: 'Dental Check-up', expectedDuration: 30 },
              createdAt: new Date().toISOString(),
            }
          ])
        });
      } else {
        await route.continue();
      }
    });

    let startEndpointCalled = false;
    await page.route(`**/visits/${mockVisitId}/start`, async route => {
      startEndpointCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: mockVisitId, currentState: 'IN_SERVICE' })
      });
    });

    await page.goto('/dashboard/service-desk');
    await expect(page).toHaveURL(/\/dashboard\/service-desk/);

    // 1. Click Start Service button on card
    const startServiceBtn = page.locator('button:has-text("Start Service")').first();
    await expect(startServiceBtn).toBeVisible({ timeout: 10000 });
    await startServiceBtn.click();

    // 2. Verification modal opens with both scan and manual override options
    const modalHeader = page.locator('h3:has-text("Start Service")');
    await expect(modalHeader).toBeVisible({ timeout: 5000 });

    const manualStartBtn = page.locator('button:has-text("Start Without Scan")');
    await expect(manualStartBtn).toBeVisible();

    // 3. Click Start Without Scan
    await manualStartBtn.click();

    // 4. Modal closes and backend start endpoint is invoked
    await expect(modalHeader).toBeHidden({ timeout: 5000 });
    expect(startEndpointCalled).toBe(true);
  });

  test('Category filter buttons All, Walk-ins, Appointments filter visits correctly', async ({ page }) => {
    const mockWalkinVisit = {
      id: 'visit-walkin-1',
      displayId: 'W001',
      ticketNumber: '001',
      currentState: 'WAITING',
      source: 'WALK_IN',
      customer: { name: 'Walkin Customer', phone: '+1234567890' },
      service: { name: 'Dental Check-up', expectedDuration: 30 },
      createdAt: new Date().toISOString(),
    };

    const mockAppointmentVisit = {
      id: 'visit-app-2',
      displayId: 'A002',
      ticketNumber: '002',
      currentState: 'WAITING',
      source: 'APPOINTMENT',
      scheduledTime: new Date(Date.now() + 30 * 60000).toISOString(),
      customer: { name: 'Appointment Customer', phone: '+1234567891' },
      service: { name: 'Teeth Cleaning', expectedDuration: 45 },
      createdAt: new Date().toISOString(),
    };

    await page.route('**/visits**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockWalkinVisit, mockAppointmentVisit]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/service-desk');
    await expect(page).toHaveURL(/\/dashboard\/service-desk/);

    // 1. Verify all 3 category buttons are visible
    const allBtn = page.getByTestId('category-filter-all');
    const walkinBtn = page.getByTestId('category-filter-walkin');
    const apptBtn = page.getByTestId('category-filter-appointment');

    await expect(allBtn).toBeVisible({ timeout: 10000 });
    await expect(walkinBtn).toBeVisible();
    await expect(apptBtn).toBeVisible();

    // Verify both visits appear initially under All
    await expect(page.locator('text=Walkin Customer').first()).toBeVisible();
    await expect(page.locator('text=Appointment Customer').first()).toBeVisible();

    // 2. Click Walk-ins button
    await walkinBtn.click();
    await expect(page.locator('text=Walkin Customer').first()).toBeVisible();
    await expect(page.locator('text=Appointment Customer')).toBeHidden();

    // 3. Click Appointments button
    await apptBtn.click();
    await expect(page.locator('text=Walkin Customer')).toBeHidden();
    await expect(page.locator('text=Appointment Customer').first()).toBeVisible();

    // 4. Click All button
    await allBtn.click();
    await expect(page.locator('text=Walkin Customer').first()).toBeVisible();
    await expect(page.locator('text=Appointment Customer').first()).toBeVisible();

    // 5. Screenshot category buttons layout
    await page.screenshot({ path: '/home/abhimanyu/.gemini/antigravity-ide/brain/814029ce-8fb0-4445-9e60-31f3b69b1e8a/service_desk_category_filters.png' });
  });

  test('In-service visit with pending stages displays both Advance Stage and Complete Visit buttons', async ({ page }) => {
    const mockVisitId = 'visit-multistage-101';
    let completePayload: any = null;

    // Handle dialog confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Remaining journey stages will be skipped');
      await dialog.accept();
    });

    await page.route('**/visits**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: mockVisitId,
              displayId: 'MED-101',
              ticketNumber: '101',
              currentState: 'IN_SERVICE',
              serviceStart: new Date(Date.now() - 5 * 60000).toISOString(),
              customer: { name: 'Sarah Connor', phone: '+1234567890' },
              service: { name: 'Outpatient Care', expectedDuration: 45 },
              visitSteps: [
                { id: 'step-1', stepIndex: 0, status: 'DONE', serviceStep: { name: 'Triage' } },
                { id: 'step-2', stepIndex: 1, status: 'IN_PROGRESS', serviceStep: { name: 'Consultation' } },
                { id: 'step-3', stepIndex: 2, status: 'PENDING', serviceStep: { name: 'Pharmacy' } },
              ],
              createdAt: new Date().toISOString(),
            }
          ])
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/visits/${mockVisitId}/complete`, async route => {
      completePayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: mockVisitId, currentState: 'COMPLETED' }),
      });
    });

    await page.goto('/dashboard/service-desk');
    await expect(page).toHaveURL(/\/dashboard\/service-desk/);

    // Click card to open details drawer
    const customerCard = page.getByTestId(`visit-card-${mockVisitId}`);
    await expect(customerCard).toBeVisible({ timeout: 10000 });

    // Verify both "Next Stage" and "Complete" buttons exist directly on active service card
    await expect(customerCard.locator('button:has-text("Next Stage")')).toBeVisible();
    await expect(customerCard.locator('button:has-text("Complete")')).toBeVisible();

    // Open details drawer by clicking on the card header/name
    await customerCard.locator('p:has-text("Sarah Connor")').click();

    // In details drawer, verify BOTH "Advance Stage" and "Complete Visit" are present
    const advanceBtn = page.locator('button:has-text("Advance Stage")').first();
    const completeBtn = page.locator('button:has-text("Complete Visit")').first();

    await expect(advanceBtn).toBeVisible({ timeout: 5000 });
    await expect(completeBtn).toBeVisible({ timeout: 5000 });

    // Click Advance Stage to verify CompleteStageModal opens with dual options
    await advanceBtn.click();
    await expect(page.locator('text=Advance Stage')).toBeVisible();
    await expect(page.locator('button:has-text("Complete Visit Now")')).toBeVisible();
    await expect(page.locator('button:has-text("Confirm & Move to Next Stage")')).toBeVisible();

    // Close modal using exact Cancel button
    await page.locator('button:text-is("Cancel")').click();

    // Now click Complete Visit in drawer
    const completePromise = page.waitForRequest(req => req.url().includes(`/visits/${mockVisitId}/complete`));
    await completeBtn.click();
    await completePromise;

    // Verify backend received forceComplete: true
    expect(completePayload).not.toBeNull();
    expect(completePayload.forceComplete).toBe(true);
  });

  test('Capture visual screenshot of service desk with active queue and details panel', async ({ page }) => {
    await page.goto('/dashboard/service-desk');
    await page.waitForTimeout(2000);
    const customerCard = page.locator('h3:has-text("Abhimanyu Negi"), [data-testid^="visit-card-"]').first();
    if (await customerCard.isVisible().catch(() => false)) {
      await customerCard.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: '/home/abhimanyu/.gemini/antigravity-ide/brain/814029ce-8fb0-4445-9e60-31f3b69b1e8a/service_desk_full_verified.png' });
  });
});

