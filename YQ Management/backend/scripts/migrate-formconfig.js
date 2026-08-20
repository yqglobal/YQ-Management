const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queues = await prisma.queue.findMany({
    where: { formConfig: { not: null } },
    include: { services: true }
  });

  let migrated = 0;
  for (const q of queues) {
    if (!q.formConfig || (Array.isArray(q.formConfig) && q.formConfig.length === 0)) continue;
    
    // For each service linked to this queue, if it doesn't have a formConfig, copy it from the queue
    for (const s of q.services) {
      if (!s.formConfig || (Array.isArray(s.formConfig) && s.formConfig.length === 0)) {
        await prisma.service.update({
          where: { id: s.id },
          data: { formConfig: q.formConfig }
        });
        migrated++;
      }
    }
  }
  
  console.log(`Migrated formConfig for ${migrated} services.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
