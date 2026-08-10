import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5455/yq_queue?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Visit-Centric dummy data...');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('No tenant found. Exiting...');
    return;
  }

  // Create Location
  const location = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Clinic',
      address: '123 Health Ave, Medical District',
    },
  });

  // Create Service
  const service = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      name: 'General Consultation',
      expectedDuration: 30,
    },
  });

  // Create Customers
  const customer1 = await prisma.customer.create({
    data: { tenantId: tenant.id, name: 'Alice Smith', phone: '+1234567890' },
  });
  const customer2 = await prisma.customer.create({
    data: { tenantId: tenant.id, name: 'Bob Jones', phone: '+0987654321' },
  });

  // Create Visits
  await prisma.visit.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      serviceId: service.id,
      customerId: customer1.id,
      source: 'WALK_IN',
      currentState: 'WAITING',
      waitingStart: new Date(),
    },
  });

  await prisma.visit.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      serviceId: service.id,
      customerId: customer2.id,
      source: 'APPOINTMENT',
      currentState: 'IN_SERVICE',
      waitingStart: new Date(Date.now() - 30 * 60000),
      serviceStart: new Date(),
    },
  });

  console.log('Done seeding visit data.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
