import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5455/yq_queue?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'hq' },
    update: {},
    create: {
      name: 'YQ Queue HQ',
      subdomain: 'hq',
    },
  });

  // Create requested Super Admin
  const newAdminPassword = await bcrypt.hash('Southafrica@2026', 10);
  
  await prisma.user.upsert({
    where: { email: 'yqbuddysa@gmail.com' },
    update: {
      password: newAdminPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'yqbuddysa@gmail.com',
      password: newAdminPassword,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
    },
  });

  // Remove old super admins if they exist
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['admin@yqqueue.com', 'support@qmova.com']
      }
    }
  });

  console.log('✅ Seed completed successfully');
  console.log('Admin Credentials:');
  console.log('Email: yqbuddysa@gmail.com (Southafrica@2026)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
