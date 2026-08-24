import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting selective database cleanup...');

  try {
    // Delete transactional/operational data in correct order to avoid FK issues
    console.log('Deleting Messages...');
    await prisma.message.deleteMany();

    console.log('Deleting Tokens...');
    await prisma.token.deleteMany();

    console.log('Deleting Visits...');
    await prisma.visit.deleteMany();

    console.log('Deleting Appointments...');
    await prisma.appointment.deleteMany();

    console.log('Deleting ChatSessions...');
    await prisma.chatSession.deleteMany();

    console.log('Deleting CommunicationLogs...');
    await prisma.communicationLog.deleteMany();

    console.log('Deleting WebhookEvents...');
    await prisma.webhookEvent.deleteMany();

    console.log('Selective cleanup completed successfully.');
    console.log('Configuration data (Tenants, Locations, Queues, Users, Services) has been preserved.');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
