import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { subdomain: { contains: 'e2e' } },
        { subdomain: { contains: 'test' } },
        { name: { contains: 'e2e' } },
        { name: { contains: 'test' } },
        { subdomain: { contains: 'cypress' } }
      ]
    }
  });

  const tenantIds = tenants.map(t => t.id);
  
  if (tenantIds.length > 0) {
    console.log(`Deleting ${tenantIds.length} e2e tenants...`);
    const deleted = await prisma.tenant.deleteMany({
      where: {
        id: { in: tenantIds }
      }
    });
    console.log(`Deleted ${deleted.count} tenants.`);
  } else {
    console.log('No E2E tenants found.');
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'e2e' } },
        { email: { contains: 'test' } },
        { email: { contains: 'cypress' } }
      ]
    }
  });

  const userIds = users.map(u => u.id);
  if (userIds.length > 0) {
     console.log(`Deleting ${userIds.length} e2e users...`);
     const deletedUsers = await prisma.user.deleteMany({
       where: { id: { in: userIds } }
     });
     console.log(`Deleted ${deletedUsers.count} users.`);
  } else {
    console.log('No E2E users found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
