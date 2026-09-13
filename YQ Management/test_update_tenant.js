const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // try to create a tenant with narayana
    await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        subdomain: "narayana"
      }
    });
  } catch (e) {
    console.log("Error code:", e.code);
  } finally {
    await prisma.$disconnect();
  }
}
test();
