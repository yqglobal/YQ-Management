const fs = require('fs');
const path = require('path');

const vsPath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let vsContent = fs.readFileSync(vsPath, 'utf-8');

// Inside handleScan:
const target = `    const actionableSteps = visit.visitSteps.filter(
      (s) =>
        s.status === 'PENDING' ||
        s.status === 'ACTIVE' ||
        s.status === 'DEFERRED',
    );`;

const replacement = `    // First, sweep any expired steps for this visit
    const now = new Date();
    for (const step of visit.visitSteps) {
      if (
        (step.status === 'PENDING' || step.status === 'ACTIVE' || step.status === 'DEFERRED') &&
        step.expiresAt && step.expiresAt < now
      ) {
        await this.prisma.visitStep.update({
          where: { id: step.id },
          data: { status: 'EXPIRED' },
        });
        await this.logEvent(step.id, step.visitId, tenantId, 'EXPIRED', 'SYSTEM');
        step.status = 'EXPIRED'; // update in-memory for the filter below
      }
    }

    const actionableSteps = visit.visitSteps.filter(
      (s) =>
        s.status === 'PENDING' ||
        s.status === 'ACTIVE' ||
        s.status === 'DEFERRED',
    );`;

vsContent = vsContent.replace(target, replacement);
fs.writeFileSync(vsPath, vsContent, 'utf-8');
console.log("Updated handleScan expiry logic");
