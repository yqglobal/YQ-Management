import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { email: 'catering-demo@yqbuddy.com' }});
  if (!user) return console.log('User not found');
  
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, include: {
    locations: true,
    services: { include: { queues: true } }
  }});
  
  console.log(JSON.stringify(tenant, null, 2));
}

check().then(() => prisma.$disconnect());
