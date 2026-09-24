const { chromium } = require('playwright');
const readline = require('readline');

const TARGET_URL = 'https://manipal.qmova.yqbuddy.com/booking/bengaluru-branch';
const ITERATIONS_PER_SERVICE = 10;
const GAP_BETWEEN_BOOKINGS_MS = 10000;

const REAL_NUMBERS = [
  '+919880956443',
  '+919553189397',
  '+918105721625',
  '+918640086400',
  '+918045952408',
  '+917289064700',
  '+919930991935',
  '+917303046549',
  '+918796407298',
  '+918657941130'
];

function getPhoneForIteration(index) {
  return REAL_NUMBERS[index % REAL_NUMBERS.length];
}

function generateRandomName() {
  const names = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Riya', 'Aanya', 'Diya', 'Myra', 'Ananya'];
  return `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 1000)}`;
}

function askQuestion(query) {
  const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
      rl.close();
      resolve(ans);
  }));
}

async function runSimulation() {
  console.log(`Starting Ticketing System Test on ${TARGET_URL}...`);
  console.log(`This will run ${ITERATIONS_PER_SERVICE} iterations for each service.`);
  
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const services = ['Parcel Pickup Service', 'Dispatch / Drop-off Service'];

  for (const service of services) {
    console.log(`\n========================================`);
    console.log(`TESTING SERVICE: ${service}`);
    console.log(`========================================`);

    for (let i = 1; i <= ITERATIONS_PER_SERVICE; i++) {
      console.log(`\n--- ${service}: Iteration ${i} of ${ITERATIONS_PER_SERVICE} ---`);
      
      try {
        await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
        
        // Step 2: Select service
        try {
          await page.click(`text=${service}`, { timeout: 3000 });
          console.log(`> Auto-selected service: ${service}`);
        } catch (e) {
          console.log(`> Could not auto-select service '${service}'. Please select it manually if needed.`);
        }

        // Step 3: Dynamic Questionnaire
        console.log(`> Filling out questionnaire and form fields...`);
        // Wait for potential network transitions
        await page.waitForTimeout(1000);
        
        // Questionnaire Loop
        let formStepCount = 0;
        let reachedContactStep = false;

        while (formStepCount < 5 && !reachedContactStep) {
          formStepCount++;
          
          // Check if we reached Contact Step (has WhatsApp Number label)
          const contactCheck = await page.$('text="WhatsApp Number"');
          if (contactCheck) {
            reachedContactStep = true;
            break;
          }

          // Try to select "Walk-in" or "Now" if prompted
          try {
            const nowBtn = await page.$('button:has-text("Now")');
            if (nowBtn) await nowBtn.click();
            
            const walkinBtn = await page.$('button:has-text("Walk-in")');
            if (walkinBtn) await walkinBtn.click();
          } catch(e) {}

          // Auto-fill all text inputs that aren't name or phone
          const textInputs = await page.$$('input[type="text"]:not([name="name"]):not([name="customerName"]):not([placeholder*="Name"])');
          for (const input of textInputs) {
            try { await input.fill('Test Answer ' + Math.floor(Math.random() * 100)); } catch(e) {}
          }

          // Auto-fill all textareas
          const textareas = await page.$$('textarea');
          for (const ta of textareas) {
            try { await ta.fill('This is a test explanation for the questionnaire.'); } catch(e) {}
          }

          // Auto-select first available option in dropdowns
          const selects = await page.$$('select');
          for (const sel of selects) {
            try {
              const options = await sel.$$eval('option', opts => opts.map(o => o.value).filter(v => v !== ''));
              if (options.length > 0) {
                await sel.selectOption(options[0]);
              }
            } catch(e) {}
          }

          // Check all checkboxes
          const checkboxes = await page.$$('input[type="checkbox"]');
          for (const cb of checkboxes) {
            try { await cb.check(); } catch(e) {}
          }

          // Click Continue / Next Service
          const submitBtn = await page.$('button[type="submit"]');
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForTimeout(1000); // wait for transition
          } else {
             break; // No submit button found, break out
          }
        }

        // Step 3.5: Contact Details
        if (reachedContactStep) {
           console.log(`> Reached Contact Step. Auto-filling name and phone...`);
           try {
              const nameInput = await page.$('input[name="name"], input[placeholder*="Name"], input[name="customerName"], input[type="text"]');
              if (nameInput) {
                const name = generateRandomName();
                await nameInput.fill(name);
                console.log(`> Auto-filled Name: ${name}`);
              }

              const phoneInput = await page.$('.PhoneInputInput, input[type="tel"]');
              if (phoneInput) {
                  const phone = getPhoneForIteration(i - 1);
                  await phoneInput.fill(phone);
                  console.log(`> Auto-filled Phone: ${phone}`);
              }

              // Click Continue
              const contactSubmitBtn = await page.$('button[type="submit"]:has-text("Continue")');
              if (contactSubmitBtn) await contactSubmitBtn.click();
              
              await page.waitForTimeout(1000);
           } catch (e) {
              console.log('> Error filling contact details', e.message);
           }
        }

        // Step 4: Review Booking -> Confirm
        try {
          const confirmBtn = await page.$('button:has-text("Confirm Booking")');
          if (confirmBtn) {
            console.log(`> Found Confirm Booking button. Clicking it...`);
            await confirmBtn.click();
          }
        } catch(e) {}
        
        // Step 5: OTP Wait
        console.log(`\n> ACTION REQUIRED: Please enter the OTP on the browser window, complete the booking, and verify on WhatsApp.`);
        await askQuestion(`> Press ENTER here in the terminal when you are ready to move to the next ticket...`);

        console.log(`> Waiting ${GAP_BETWEEN_BOOKINGS_MS / 1000} seconds before the next iteration...`);
        await page.waitForTimeout(GAP_BETWEEN_BOOKINGS_MS);

      } catch (error) {
        console.error(`Error in ${service}, Iteration ${i}:`, error.message);
      }
    }
  }

  await browser.close();
  console.log('Testing complete! You can now review the logs on the server and check the analytics dashboard.');
}

runSimulation();
