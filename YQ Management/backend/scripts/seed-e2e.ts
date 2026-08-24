import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5455/yq_queue';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  // 1. Clean DB
  await prisma.outboxEvent.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.token.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.service.deleteMany();
  await prisma.location.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 2. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'E2E Test Clinic',
      subdomain: 'test-clinic',
      whatsappConnected: false,
    },
  });

  // 3. Create Manager User
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      password: hashedPassword,
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
    },
  });

  // 4. Create Location
  const location = await prisma.location.create({
    data: {
      name: 'Main Branch',
      address: '123 Test St',
      tenantId: tenant.id,
    },
  });

  // 5. Create Services
  const generalService = await prisma.service.create({
    data: {
      name: 'General Consultation',
      expectedDuration: 15,
      tenantId: tenant.id,
      locationId: location.id,
    },
  });

  // 6. Create Queues
  const walkInQueue = await prisma.queue.create({
    data: {
      name: 'Walk-in Queue',
      status: 'ACTIVE',
      tenantId: tenant.id,
      locationId: location.id,
      services: {
        connect: [{ id: generalService.id }]
      }
    },
  });

  const appointmentQueue = await prisma.queue.create({
    data: {
      name: 'Appointment Queue',
      status: 'ACTIVE',
      tenantId: tenant.id,
      locationId: location.id,
      services: {
        connect: [{ id: generalService.id }]
      }
    },
  });

  // Create mass queues for load test
  const massQueues = [];
  for (let i = 0; i < 5; i++) {
    const mq = await prisma.queue.create({
      data: {
        name: `Mass Queue ${i}`,
        status: 'ACTIVE',
        tenantId: tenant.id,
        locationId: location.id,
        services: {
          connect: [{ id: generalService.id }]
        }
      },
    });
    massQueues.push(mq.id);
  }

  // Print required JSON format as the LAST line
  const payload = {
    email: user.email,
    password: password,
    queueIds: massQueues,
    walkInQueueId: walkInQueue.id,
    appointmentQueueId: appointmentQueue.id,
    tenantId: tenant.id
  };
  
  console.log(JSON.stringify(payload));
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
