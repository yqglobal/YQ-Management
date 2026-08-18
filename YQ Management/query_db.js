const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const plan = await prisma.plan.findFirst({ where: { name: { contains: 'Starter' } } });
  console.log("Starter Plan features:", typeof plan.features, plan.features);
  
  const sub = await prisma.subscription.findFirst({ include: { plan: true }, orderBy: { createdAt: 'desc' } });
  console.log("Latest Sub status:", sub?.status);
  console.log("Latest Sub plan features:", typeof sub?.plan?.features, sub?.plan?.features);
}
main().catch(console.error).finally(() => prisma.$disconnect());
