import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Plan 1: Starter/Trial
  await prisma.plan.upsert({
    where: { id: 'starter-plan' },
    update: {},
    create: {
      id: 'starter-plan',
      name: 'Starter / Trial',
      description: '14-day free trial with all features enabled.',
      type: 'standard',
      price: 0,
      currency: 'USD',
      billingInterval: 'monthly',
      trialDays: 14,
      maxQueues: 1,
      maxVisits: 500,
      active: true,
      sortOrder: 1,
      features: {
        textToSpeech: true,
        whatsappNotifications: true,
        customBranding: true,
      },
      limits: {
        maxQueues: 1,
        maxVisits: 500,
      },
    },
  });

  // Plan 2: Standard
  await prisma.plan.upsert({
    where: { id: 'standard-plan' },
    update: {},
    create: {
      id: 'standard-plan',
      name: 'Standard',
      description: 'Perfect for small businesses. 5 queues included.',
      type: 'standard',
      price: 10,
      currency: 'USD',
      billingInterval: 'monthly',
      trialDays: 0,
      maxQueues: 5,
      maxVisits: 2000,
      active: true,
      sortOrder: 2,
      features: {
        textToSpeech: false,
        whatsappNotifications: true,
        customBranding: false,
      },
      limits: {
        maxQueues: 5,
        maxVisits: 2000,
      },
    },
  });

  // Plan 3: Pro
  await prisma.plan.upsert({
    where: { id: 'pro-plan' },
    update: {},
    create: {
      id: 'pro-plan',
      name: 'Pro',
      description: 'Advanced features and high volume for growing businesses.',
      type: 'premium',
      price: 20,
      currency: 'USD',
      billingInterval: 'monthly',
      trialDays: 0,
      maxQueues: 20,
      maxVisits: 10000,
      active: true,
      sortOrder: 3,
      features: {
        textToSpeech: true,
        whatsappNotifications: true,
        customBranding: true,
      },
      limits: {
        maxQueues: 20,
        maxVisits: 10000,
      },
    },
  });

  console.log('Default plans seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
