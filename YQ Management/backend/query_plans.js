const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, include: { tenant: { include: { subscription: { include: { plan: true } } } } } });
  console.log('Super Admin:', JSON.stringify(admin, null, 2));
  const plans = await prisma.plan.findMany();
  console.log('Plans:', JSON.stringify(plans, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
