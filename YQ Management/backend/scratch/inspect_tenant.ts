import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'manipal' },
    include: {
      locations: {
        include: { services: true }
      }
    }
  });
  console.log(JSON.stringify(tenant, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
