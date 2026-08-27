const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const services = await prisma.service.findMany({
    where: { tenantId: 'd7d4206b-d236-46c2-bfd3-1a39c0d156f7' },
    select: {
      id: true,
      name: true,
      locationId: true,
    },
  });
  console.log(JSON.stringify(services, null, 2));
}
main().catch(console.error);
