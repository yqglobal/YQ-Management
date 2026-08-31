import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function globalSetup() {
  console.log('--- E2E Global Setup ---');
  
  // Set test database explicitly if not in CI (CI sets it in yml)
  if (!process.env.CI) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yq_test?schema=public";
    process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379";
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log(`Pushing schema to test database: ${process.env.DATABASE_URL}`);
    // Run db push to ensure schema is exactly as code
    execSync('npx prisma db push --accept-data-loss', { 
      cwd: '../backend',
      stdio: 'inherit', 
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });

    console.log('Seeding initial test data...');
    // Seed standard base plans for billing tests
    await prisma.plan.upsert({
      where: { code: 'TRIAL' },
      update: {},
      create: {
        name: 'Trial',
        code: 'TRIAL',
        description: '14 days trial',
        price: 0,
        currency: 'USD',
        interval: 'MONTHLY',
        stripePriceId: 'test_price_trial',
        features: ['basic'],
        limits: {
          services: 5,
          locations: 2,
          queues: 5,
          staff: 3,
        }
      }
    });

    await prisma.plan.upsert({
      where: { code: 'PREMIUM' },
      update: {},
      create: {
        name: 'Premium',
        code: 'PREMIUM',
        description: 'Premium Plan',
        price: 99,
        currency: 'USD',
        interval: 'MONTHLY',
        stripePriceId: 'test_price_premium',
        features: ['premium'],
        limits: {
          services: 50,
          locations: 10,
          queues: 50,
          staff: 30,
        }
      }
    });

    // Create a generic test user and tenant to use across suites
    const tenant = await prisma.tenant.upsert({
      where: { subdomain: 'e2etest' },
      update: {},
      create: {
        name: 'E2E Test Corp',
        subdomain: 'e2etest',
      }
    });

    await prisma.user.upsert({
      where: { email: 'admin@e2etest.com' },
      update: {},
      create: {
        email: 'admin@e2etest.com',
        firstName: 'Admin',
        lastName: 'E2E',
        // In reality, this would be a hashed password, but for E2E we usually 
        // bypass login API or seed a known hash. 
        // We'll use a bypass in test-utils.ts to login via cookie.
        tenantId: tenant.id,
        role: 'ADMIN',
      }
    });

    console.log('Global setup complete!');
  } catch (error) {
    console.error('Error during global setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
