require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Connecting to database...');

  // 1. Create or find Tenant
  let tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'st-matthews-events' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "St. Matthew's College",
        subdomain: 'st-matthews-events',
        businessType: 'events_and_invitations',
        operatingMode: 'JOURNEY',
        appointmentApprovalMode: 'AUTO',
        setupComplete: true,
        selfServeModeEnabled: false,
        strictPrivacyMode: false,
      },
    });
    console.log('Created Tenant:', tenant.id, tenant.name);
  } else {
    console.log('Found existing Tenant:', tenant.id, tenant.name);
  }

  // 2. Create or find Location
  let location = await prisma.location.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        tenantId: tenant.id,
        name: 'Main Campus Hall & Grounds',
        address: '100 College Avenue, Sandton, Johannesburg',
        timezone: 'Africa/Johannesburg',
      },
    });
    console.log('Created Location:', location.id, location.name);
  } else {
    console.log('Found Location:', location.id, location.name);
  }

  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('EventPass2026!', 10);

  // 3. Create or find Admin User
  let user = await prisma.user.findFirst({
    where: { email: 'events@stmatthews.edu' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'events@stmatthews.edu',
        password: hashedPassword,
        name: 'Sister Mary (Event Coordinator)',
        phone: '+27821112233',
        role: 'ADMIN',
        tenantId: tenant.id,
        allowedLocationIds: [location.id],
      },
    });
    console.log('Created User:', user.id, user.email);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('Updated User password:', user.id, user.email);
  }

  // 4. Create or find Service
  const concertFormConfig = [
    { id: 'childName', type: 'text', label: "Child's First Name", required: true },
    { id: 'childSurname', type: 'text', label: "Child's Surname", required: true },
    { id: 'gradeClass', type: 'text', label: 'Grade & Class', required: true },
    { id: 'platesPurchased', type: 'number', label: 'Number of Catering Plates (R100/plate)', required: true },
    { id: 'dietaryRequirements', type: 'text', label: 'Dietary Preferences (e.g. Vegetarian, Halaal, None)', required: false },
  ];

  let service = await prisma.service.findFirst({
    where: { tenantId: tenant.id, name: 'Annual Concert & Graduation 2026' },
  });

  if (!service) {
    service = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: 'Annual Concert & Graduation 2026',
        description: 'Annual school concert and graduation ceremony with catered dinner.',
        expectedDuration: 180,
        basePrice: 10000, // R100.00
        paymentMode: 'UPFRONT',
        priceCurrency: 'ZAR',
        requiresPayment: true,
        allowOfflinePayment: true,
        formConfig: concertFormConfig,
      },
    });
    console.log('Created Service:', service.id, service.name);
  } else {
    service = await prisma.service.update({
      where: { id: service.id },
      data: {
        basePrice: 10000,
        paymentMode: 'UPFRONT',
        priceCurrency: 'ZAR',
        requiresPayment: true,
        allowOfflinePayment: true,
        formConfig: concertFormConfig,
      },
    });
    console.log('Updated Service formConfig and pricing:', service.id);
  }

  // 5. Create or find Queue
  let queue = await prisma.queue.findFirst({
    where: { tenantId: tenant.id, locationId: location.id },
    include: { services: true },
  });

  if (!queue) {
    queue = await prisma.queue.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        name: 'Concert Entry & Catering',
        status: 'ACTIVE',
        services: {
          connect: [{ id: service.id }],
        },
      },
    });
    console.log('Created Queue:', queue.id, queue.name);
  } else {
    const hasService = queue.services.some(s => s.id === service.id);
    if (!hasService) {
      await prisma.queue.update({
        where: { id: queue.id },
        data: { services: { connect: [{ id: service.id }] } },
      });
    }
  }

  // 6. Create or find ServiceFlow
  let flow = await prisma.serviceFlow.findUnique({
    where: { serviceId: service.id },
    include: { steps: { include: { transitions: true } } },
  });

  if (!flow) {
    flow = await prisma.serviceFlow.create({
      data: {
        tenantId: tenant.id,
        serviceId: service.id,
        name: 'Concert Entry & Catering Flow',
        description: 'Gate attendance check followed by catering meal redemption.',
        isActive: true,
      },
      include: { steps: true },
    });
    console.log('Created ServiceFlow:', flow.id);

    // Create Step 1: Gate Attendance Scan (CHECKPOINT)
    const step1 = await prisma.flowStepTemplate.create({
      data: {
        flowId: flow.id,
        stepOrder: 1,
        name: 'Gate Attendance Scan',
        description: 'Verify registration and record arrival at the main entrance gate.',
        type: 'CHECKPOINT',
        trigger: 'MANUAL_STAFF',
        requiresQrScan: true,
        requiresStaffAction: true,
        customerInstruction: 'Welcome! Please present your family QR code to the entrance staff.',
        staffInstruction: 'Scan attendee QR code and verify arrival on guest register.',
        locationDescription: 'Main Entrance Gate',
      },
    });
    console.log('Created Step 1 (CHECKPOINT):', step1.id);

    // Create Step 2: Meal & Catering Collection (COLLECTION)
    const step2 = await prisma.flowStepTemplate.create({
      data: {
        flowId: flow.id,
        stepOrder: 2,
        name: 'Meal & Catering Collection',
        description: 'Redeem meal plates purchased during registration.',
        type: 'COLLECTION',
        trigger: 'MANUAL_STAFF',
        requiresQrScan: true,
        requiresStaffAction: true,
        entitlementUnit: 'plates',
        entitlementFormula: 'accompanyingGuests + 1',
        allowPartialRedemption: true,
        preventDoubleRedemption: true,
        customerInstruction: 'Present your QR code at the catering station to collect your food.',
        staffInstruction: 'Scan QR, check plate count, hand over food, and click Confirm Collection.',
        locationDescription: 'Catering Station (Hall B)',
      },
    });
    console.log('Created Step 2 (COLLECTION):', step2.id);

    // Transition from Step 1 to Step 2
    await prisma.flowStepTransition.create({
      data: {
        flowId: flow.id,
        fromStepId: step1.id,
        toStepId: step2.id,
        isDefault: true,
      },
    });
    console.log('Created transition Step 1 -> Step 2');
  } else {
    console.log('Found existing ServiceFlow:', flow.id);
    await prisma.flowStepTemplate.updateMany({
      where: { flowId: flow.id, type: 'COLLECTION' },
      data: {
        preventDoubleRedemption: true,
        allowPartialRedemption: true,
        entitlementUnit: 'plates',
      },
    });
    console.log('Ensured step 2 has preventDoubleRedemption: true');
  }

  // 7. Create Test Customer & Visit (Lethabo Ntolo with 4 plates)
  let customer = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, phone: '+27821234567' },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'Lethabo Ntolo',
        phone: '+27821234567',
        email: 'ntolo.family@example.com',
      },
    });
    console.log('Created Customer:', customer.id, customer.name);
  }

  let visit = await prisma.visit.findFirst({
    where: { tenantId: tenant.id, customerId: customer.id },
    include: { visitSteps: { include: { templateStep: true } } },
  });

  if (!visit) {
    const accessToken = crypto.randomUUID();
    visit = await prisma.visit.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        locationId: location.id,
        serviceId: service.id,
        queueId: queue.id,
        displayId: 'C-001',
        accessToken: accessToken,
        currentState: 'WAITING',
        waitingStart: new Date(),
        accompanyingGuests: 3, // 1 base + 3 guests = 4 plates
        metadata: {
          childName: 'Lethabo',
          surname: 'Ntolo',
          platesPurchased: 4,
          mealCount: 4,
          registrationFeePaid: 'R400.00',
        },
      },
      include: { visitSteps: true },
    });
    console.log('Created Visit:', visit.id, 'Access Token (QR):', visit.accessToken);

    const flowSteps = await prisma.flowStepTemplate.findMany({
      where: { flowId: flow.id },
      orderBy: { stepOrder: 'asc' },
    });

    for (const ts of flowSteps) {
      let allocated = ts.entitlementFixed;
      if (ts.entitlementFormula === 'accompanyingGuests + 1') {
        allocated = (visit.accompanyingGuests || 0) + 1; // 4 plates
      }
      await prisma.visitStep.create({
        data: {
          visitId: visit.id,
          tenantId: tenant.id,
          templateStepId: ts.id,
          stepOrder: ts.stepOrder,
          name: ts.name,
          type: ts.type,
          status: ts.stepOrder === 1 ? 'ACTIVE' : 'PENDING',
          quantityAllocated: allocated,
          quantityRedeemed: 0,
        },
      });
    }
    console.log('Created VisitSteps for Lethabo Ntolo');
  } else {
    console.log('Found existing Visit:', visit.id, 'Token:', visit.accessToken);
  }

  console.log('\n======================================================');
  console.log('✅ CLIENT TENANT SETUP COMPLETE');
  console.log('Tenant:', tenant.name, `(${tenant.subdomain})`);
  console.log('Location:', location.name);
  console.log('Service:', service.name);
  console.log('Queue:', queue.name);
  console.log('Flow:', flow.name);
  console.log('Test Attendee:', customer.name);
  console.log('Family QR Access Token:', visit.accessToken);
  console.log('Public QR Ticket URL: /public/ticket/' + visit.accessToken);
  console.log('Plates Entitled: 4');
  console.log('======================================================\n');

  await pool.end();
}

main().catch(err => {
  console.error('Error during setup:', err);
  process.exit(1);
});
