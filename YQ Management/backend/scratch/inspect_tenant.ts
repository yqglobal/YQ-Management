import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5455/yq_queue';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenants = await prisma.tenant.findMany();

  for (const t of tenants) {
    const locations = await prisma.location.findMany({ where: { tenantId: t.id } });
    const services = await prisma.service.findMany({ where: { tenantId: t.id } });
    const queues = await prisma.queue.findMany({ where: { tenantId: t.id } });
    const staff = await prisma.staff.findMany({ where: { tenantId: t.id } });
    const users = await prisma.user.findMany({ where: { tenantId: t.id } });
    const sub = await prisma.subscription.findFirst({
      where: { tenantId: t.id },
      include: { plan: true },
    });

    console.log(`Tenant: "${t.name}" (ID: ${t.id})`);
    console.log(`  Locations count: ${locations.length}`);
    console.log(`  Services count: ${services.length} (${services.map(s => s.name).join(', ')})`);
    console.log(`  Queues count: ${queues.length} (${queues.map(q => q.name).join(', ')})`);
    console.log(`  Staff count: ${staff.length}, Users count: ${users.length}`);
    console.log(`  Subscription: Plan="${sub?.plan?.name}", Status=${sub?.status}`);
    console.log(`  Plan limits in DB:`, JSON.stringify(sub?.plan?.limits));
    console.log('----------------------------------------------------');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
