import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding queues without any linked services...');
  
  const queuesWithoutServices = await prisma.queue.findMany({
    where: {
      services: {
        none: {}
      }
    }
  });

  console.log(`Found ${queuesWithoutServices.length} queues without services.`);

  if (queuesWithoutServices.length > 0) {
    const deleted = await prisma.queue.deleteMany({
      where: {
        id: {
          in: queuesWithoutServices.map(q => q.id)
        }
      }
    });
    console.log(`Deleted ${deleted.count} orphaned queues successfully.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
