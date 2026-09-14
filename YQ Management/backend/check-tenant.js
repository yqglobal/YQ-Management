const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenant = await prisma.tenant.findFirst();
  console.log('chatbotEnabled:', tenant.chatbotEnabled);
  console.log('customerExperience:', JSON.stringify(tenant.customerExperience));
  
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { chatbotEnabled: true }
  });
  
  const updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
  console.log('after update chatbotEnabled:', updated.chatbotEnabled);
}
main().catch(console.error).finally(() => prisma.$disconnect());
