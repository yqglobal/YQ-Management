import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const ws = await prisma.workspace.findFirst({
    include: { subscriptions: { include: { plan: true } } }
  });
  console.log("Workspace ID:", ws?.id);
  console.log("Tenant ID:", ws?.tenantId);
  console.log("Subscriptions:", JSON.stringify(ws?.subscriptions, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
