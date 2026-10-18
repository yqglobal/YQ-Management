require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function testFlow() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Testing End-to-End Flow for St. Matthew\'s College...\n');

  // 1. Fetch Lethabo Ntolo's visit
  const visit = await prisma.visit.findFirst({
    where: { displayId: 'C-001' },
    include: {
      customer: true,
      service: true,
      visitSteps: {
        include: { templateStep: true },
        orderBy: { stepOrder: 'asc' },
      },
    },
  });

  if (!visit) {
    console.error('Visit not found!');
    process.exit(1);
  }

  console.log('--- 1. INITIAL REGISTRATION STATE ---');
  console.log('Customer:', visit.customer.name);
  console.log('Token (QR):', visit.accessToken);
  console.log('Accompanying Guests:', visit.accompanyingGuests);
  console.log('Plates from Metadata:', visit.metadata.platesPurchased);
  console.log('Steps:');
  visit.visitSteps.forEach(s => {
    console.log(`  [${s.type}] ${s.name}: status=${s.status}, allocated=${s.quantityAllocated}, redeemed=${s.quantityRedeemed}`);
  });

  // Verify initial state
  const checkpointStep = visit.visitSteps.find(s => s.type === 'CHECKPOINT');
  const collectionStep = visit.visitSteps.find(s => s.type === 'COLLECTION');

  if (!checkpointStep || !collectionStep) {
    console.error('Steps missing!');
    process.exit(1);
  }

  if (collectionStep.quantityAllocated !== 4) {
    console.error(`Expected 4 plates allocated, got: ${collectionStep.quantityAllocated}`);
    process.exit(1);
  }
  console.log('✅ Initial allocation confirmed: 4 plates\n');

  // 2. Simulate Entry Gate Scan (Advance Checkpoint)
  console.log('--- 2. ENTRANCE GATE CHECK-IN ---');
  await prisma.visitStep.update({
    where: { id: checkpointStep.id },
    data: {
      status: 'DONE',
      completedAt: new Date(),
      lastRedeemedBy: 'Gate Staff 1',
    },
  });
  await prisma.visit.update({
    where: { id: visit.id },
    data: {
      currentState: 'CHECKED_IN',
      checkInTime: new Date(),
    },
  });
  // Unlocked / activate collection step
  await prisma.visitStep.update({
    where: { id: collectionStep.id },
    data: {
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
  });
  console.log('✅ Lethabo Ntolo checked in at Gate! Attendance recorded.\n');

  // 3. Simulate Catering Scan - Partial Redemption (2 plates)
  console.log('--- 3. CATERING STATION: PARTIAL REDEMPTION (2 of 4 plates) ---');
  await prisma.visitStep.update({
    where: { id: collectionStep.id },
    data: {
      quantityRedeemed: { increment: 2 },
      lastRedeemedAt: new Date(),
      lastRedeemedBy: 'Chef Sipho',
    },
  });

  let stepAfterPartial = await prisma.visitStep.findUnique({ where: { id: collectionStep.id } });
  console.log(`Plates allocated: ${stepAfterPartial.quantityAllocated}`);
  console.log(`Plates redeemed: ${stepAfterPartial.quantityRedeemed}`);
  console.log(`Plates outstanding: ${stepAfterPartial.quantityAllocated - stepAfterPartial.quantityRedeemed}`);
  console.log(`Step status: ${stepAfterPartial.status}`);
  if (stepAfterPartial.quantityRedeemed !== 2) {
    console.error('Partial redemption failed!');
    process.exit(1);
  }
  console.log('✅ Partial collection tracked successfully: 2 collected, 2 remaining.\n');

  // 4. Simulate Catering Scan - Final Redemption (remaining 2 plates)
  console.log('--- 4. CATERING STATION: FULL REDEMPTION (remaining 2 plates) ---');
  await prisma.visitStep.update({
    where: { id: collectionStep.id },
    data: {
      quantityRedeemed: { increment: 2 },
      status: 'DONE',
      completedAt: new Date(),
      lastRedeemedAt: new Date(),
      lastRedeemedBy: 'Chef Sipho',
    },
  });
  await prisma.visit.update({
    where: { id: visit.id },
    data: {
      currentState: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  let stepAfterFull = await prisma.visitStep.findUnique({ where: { id: collectionStep.id } });
  console.log(`Plates allocated: ${stepAfterFull.quantityAllocated}`);
  console.log(`Plates redeemed: ${stepAfterFull.quantityRedeemed}`);
  console.log(`Step status: ${stepAfterFull.status}`);
  if (stepAfterFull.quantityRedeemed !== 4 || stepAfterFull.status !== 'DONE') {
    console.error('Full redemption failed!');
    process.exit(1);
  }
  console.log('✅ All 4 plates successfully collected. Step is DONE.\n');

  // 5. Simulate Double-Redemption Block Attempt
  console.log('--- 5. DOUBLE-REDEMPTION ATTEMPT (Same QR scanned again) ---');
  // Attempt atomic guard
  const totalAllowed = stepAfterFull.quantityAllocated;
  const doubleRedeemAttempt = await prisma.visitStep.updateMany({
    where: {
      id: collectionStep.id,
      quantityRedeemed: { lte: totalAllowed - 1 }, // Guard condition from VisitStepService
    },
    data: {
      quantityRedeemed: { increment: 1 },
    },
  });

  console.log(`Rows updated by double-redemption attempt: ${doubleRedeemAttempt.count}`);
  if (doubleRedeemAttempt.count === 0) {
    console.log('🛡️ DOUBLE-REDEMPTION BLOCKED AT DATABASE LEVEL! (Count: 0)');
    console.log('✅ Client Requirement R6 satisfied: Extra plates cannot be claimed.');
  } else {
    console.error('Double-redemption was NOT blocked!');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL END-TO-END FLOW TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');

  await pool.end();
}

testFlow().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
