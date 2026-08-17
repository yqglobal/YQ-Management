import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'e2e' } },
        { email: { contains: 'test' } },
        { email: { contains: 'cypress' } }
      ]
    },
    include: { tenant: true }
  });
  console.log('E2E Users found:', users.map(u => u.email));
  
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { subdomain: { contains: 'e2e' } },
        { subdomain: { contains: 'test' } },
        { name: { contains: 'e2e' } },
        { name: { contains: 'test' } }
      ]
    }
  });
  console.log('E2E Tenants found:', tenants.map(t => t.subdomain));
}
main().catch(console.error).finally(() => prisma.$disconnect());
