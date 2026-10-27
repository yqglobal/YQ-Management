const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const now = new Date();
  console.log('Running temporal hygiene cleanup at', now.toISOString());

  // Today start UTC (or past 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Find all WAITING, CHECKED_IN, ON_HOLD visits created more than 24h ago
  const staleVisits = await prisma.visit.findMany({
    where: {
      currentState: { in: ['WAITING', 'CHECKED_IN', 'ON_HOLD', 'CALLED', 'PENDING_PAYMENT'] },
      createdAt: { lt: yesterday },
    },
    select: { id: true, displayId: true, createdAt: true, customer: { select: { name: true } } },
  });

  console.log(`Found ${staleVisits.length} stale active visits older than 24h:`);
  staleVisits.forEach((v) => {
    console.log(` - [${v.displayId || v.id}] ${v.customer?.name} (created: ${v.createdAt.toISOString()})`);
  });

  if (staleVisits.length > 0) {
    const res = await prisma.visit.updateMany({
      where: { id: { in: staleVisits.map((v) => v.id) } },
      data: {
        currentState: 'NO_SHOW',
        completedAt: null,
        cancelReason: 'Day Rollover / Unattended (Temporal Hygiene Cleaned)',
      },
    });
    console.log(`Updated ${res.count} visits to NO_SHOW.`);
  }

  // 2. Find lingering IN_SERVICE visits created more than 24h ago
  const lingeringInService = await prisma.visit.findMany({
    where: {
      currentState: 'IN_SERVICE',
      createdAt: { lt: yesterday },
    },
    select: { id: true, displayId: true, customer: { select: { name: true } } },
  });

  if (lingeringInService.length > 0) {
    console.log(`Found ${lingeringInService.length} lingering in-service visits:`);
    const res = await prisma.visit.updateMany({
      where: { id: { in: lingeringInService.map((v) => v.id) } },
      data: {
        currentState: 'COMPLETED',
        completedAt: yesterday,
        cancelReason: 'Day Rollover Auto-Complete',
      },
    });
    console.log(`Updated ${res.count} in-service visits to COMPLETED.`);
  }

  // 3. Find past SCHEDULED appointments that were never checked in and scheduledEnd < yesterday
  const pastAppointments = await prisma.appointment.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledEnd: { lt: yesterday },
    },
    select: { id: true },
  });

  if (pastAppointments.length > 0) {
    console.log(`Found ${pastAppointments.length} past un-attended SCHEDULED appointments.`);
    const apptIds = pastAppointments.map((a) => a.id);
    await prisma.appointment.updateMany({
      where: { id: { in: apptIds } },
      data: { status: 'NO_SHOW' },
    });
    await prisma.visit.updateMany({
      where: {
        appointmentId: { in: apptIds },
        currentState: { in: ['SCHEDULED', 'CREATED'] },
      },
      data: {
        currentState: 'NO_SHOW',
        completedAt: null,
        cancelReason: 'Appointment expired (No-Show)',
      },
    });
    console.log(`Updated ${pastAppointments.length} appointments to NO_SHOW.`);
  }

  console.log('Cleanup finished successfully.');
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
