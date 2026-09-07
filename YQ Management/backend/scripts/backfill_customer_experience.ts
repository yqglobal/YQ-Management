import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting backfill for tenant customer experience defaults...');
  const tenants = await prisma.tenant.findMany({
    include: {
      users: {
        where: { role: 'TENANT_ADMIN' },
        take: 1
      }
    }
  });

  let updatedCount = 0;

  for (const tenant of tenants) {
    let customerExperience: any = tenant.customerExperience || {};
    let needsUpdate = false;

    if (!customerExperience.portal) {
      customerExperience.portal = {};
      needsUpdate = true;
    }

    if (!customerExperience.portal.welcomeTitle) {
      customerExperience.portal.welcomeTitle = `Welcome to ${tenant.name}`;
      needsUpdate = true;
    }

    if (!customerExperience.portal.welcomeMessage) {
      customerExperience.portal.welcomeMessage = "Please enter your details to proceed...";
      needsUpdate = true;
    }

    if (!customerExperience.portal.supportContact) {
      const adminEmail = tenant.users?.[0]?.email || '';
      customerExperience.portal.supportContact = adminEmail;
      needsUpdate = true;
    }

    if (!customerExperience.feedback) {
      customerExperience.feedback = {
        enabled: true,
        questions: []
      };
      needsUpdate = true;
    }

    if (!customerExperience.feedback.questions || customerExperience.feedback.questions.length === 0) {
      customerExperience.feedback.questions = [
        {
          id: 'fb_q1_rating',
          type: 'rating',
          label: 'How was your experience today?',
          required: true
        },
        {
          id: 'fb_q2_comments',
          type: 'textarea',
          label: 'Any additional feedback?',
          required: false
        }
      ];
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { customerExperience }
      });
      console.log(`Updated tenant: ${tenant.name} (${tenant.id})`);
      updatedCount++;
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} tenants.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
