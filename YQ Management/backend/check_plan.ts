import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.plan.findFirst({
    where: { name: { contains: 'Starter' } }
  });
  console.log("Plan Features:", plan?.features);
}
main().catch(console.error).finally(() => prisma.$disconnect());
