import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'yqbuddysa@gmail.com';
  const plainPassword = 'Southafrica@2026';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Find or create a default super admin tenant
  let tenant = await prisma.tenant.findFirst({
    where: { name: 'Super Admin Tenant' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Super Admin Tenant',
        subdomain: 'superadmin',
      },
    });
  }

  // Create or update the user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
    },
    create: {
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('Super admin initialized successfully:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
