import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function audit() {
  const user = await prisma.user.findUnique({
    where: { email: 'abhimanyu.25bcs10330@sst.scaler.com' },
    include: {
      tenant: {
        include: {
          locations: true,
          services: true,
          queues: true,
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
