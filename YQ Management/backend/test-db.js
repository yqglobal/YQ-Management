const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const services = await prisma.service.findMany({ include: { queues: true } });
  console.log(JSON.stringify(services, null, 2));
}
main();
