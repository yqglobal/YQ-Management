import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'yqbuddysa@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log('User not found!');
  } else {
    console.log('User found:', user.email);
    console.log('Role:', user.role);
    console.log('Password hash present:', !!user.password);
    
    // test password
    const isMatch = await bcrypt.compare('Southafrica@2026', user.password || '');
    console.log('Password match:', isMatch);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
