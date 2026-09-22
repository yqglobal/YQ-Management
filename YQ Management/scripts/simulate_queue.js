const { chromium } = require('playwright');

// ==========================================
// CONFIGURATION
// ==========================================
const TARGET_URL = 'https://manipal.qmova.yqbuddy.com';
const WAIT_TIME_FOR_OTP_MS = 25000; // 25 seconds for manual intervention

const TEST_MATRIX = [
  { case: 1, location: 'Bengaluru Branch', service: 'Parcel Pickup Service', type: 'Walk-in', iterations: 3 },
  { case: 2, location: 'Bengaluru Branch', service: 'Parcel Pickup Service', type: 'Appointment', iterations: 2 },
  { case: 3, location: 'Bengaluru Branch', service: 'Dispatch / Drop-off Service', type: 'Walk-in', iterations: 3 },
  { case: 4, location: 'Bengaluru Branch', service: 'Dispatch / Drop-off Service', type: 'Appointment', iterations: 2 },
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function generateRandomPhone() {
  const starts = ['9', '8', '7', '6'];
  const startDigit = starts[Math.floor(Math.random() * starts.length)];
  const rest = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return `${startDigit}${rest}`;
}

async function runSimulation() {
  console.log(`Starting Queue Simulation on ${TARGET_URL}...`);
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();

  for (const scenario of TEST_MATRIX) {
    console.log(`\n========================================`);
    console.log(`STARTING SCENARIO ${scenario.case}: ${scenario.type} - ${scenario.service} @ ${scenario.location}`);
    console.log(`========================================`);

    for (let i = 1; i <= scenario.iterations; i++) {
      console.log(`\n--- Iteration ${i} of ${scenario.iterations} ---`);
      const page = await context.newPage();
      
      try {
        console.log(`Navigating to ${TARGET_URL}`);
        await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

        // Note: As the UI selectors (buttons, dropdowns) are dynamic, the script will attempt
        // to click text-based matches. If this fails, the user can manually click during the pause.
        
        console.log(`Please manually select Location: '${scenario.location}' and Service: '${scenario.service}' if the script cannot.`);
        
        // Try selecting location/service if we can guess the selectors
        try {
          await page.click(`text=${scenario.location}`, { timeout: 3000 });
          await page.click(`text=${scenario.service}`, { timeout: 3000 });
          if (scenario.type === 'Appointment') {
             await page.click(`text=Appointment`, { timeout: 3000 });
             // Pick a random date/time slot (this is highly app-specific, leaving for manual/robust handling)
          } else {
             await page.click(`text=Walk-in`, { timeout: 3000 });
          }
        } catch (e) {
          console.log(`> Could not auto-click all options. Manual assistance may be needed.`);
        }

        // Look for phone number input
        const phoneInput = await page.$('input[type="tel"], input[name="phone"], input[name="phoneNumber"]');
        if (phoneInput) {
          const phone = generateRandomPhone();
          console.log(`Filling phone number: ${phone}`);
          await phoneInput.fill(phone);
        } else {
          console.log('> Could not automatically find phone input. Please fill manually.');
        }

        console.log(`\n> PAUSING for ${WAIT_TIME_FOR_OTP_MS / 1000} seconds...`);
        console.log('> 1. Ensure the correct options are selected.');
        console.log('> 2. Trigger the OTP (if not done).');
        console.log('> 3. Complete the OTP bypass or entry.');
        console.log('> 4. Confirm the booking.');
        
        await delay(WAIT_TIME_FOR_OTP_MS); 
        
        console.log(`\nIteration ${i} OTP pause complete. Please ensure you scan the QR code now (pausing 15s for scan).`);
        await delay(15000);

        await page.close();
      } catch (error) {
        console.error(`Error in Scenario ${scenario.case}, Iteration ${i}:`, error);
      }
    }
  }

  await browser.close();
  console.log('All Scenarios Complete! Please check Analytics Dashboard.');
}

runSimulation();
