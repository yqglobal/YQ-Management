const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.plan.updateMany({
    where: { name: 'Starter (Free Trial)' },
    data: { name: 'Starter (14 Days Trial)' },
  });
  console.log('Updated Starter');

  await prisma.plan.updateMany({
    where: { name: 'Standard Pro' },
    data: { name: 'Standard Plan' },
  });
  console.log('Updated Standard');

  await prisma.plan.updateMany({
    where: { name: 'Enterprise Network' },
    data: { name: 'Premium Plan' },
  });
  console.log('Updated Premium');
}

main().catch(console.error).finally(() => prisma.$disconnect());
