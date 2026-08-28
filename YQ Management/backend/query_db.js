const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, include: { tenant: { include: { subscription: { include: { plan: true } } } } } });
  const plans = await prisma.plan.findMany();
  fs.writeFileSync('db_out.json', JSON.stringify({ admin, plans }, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
