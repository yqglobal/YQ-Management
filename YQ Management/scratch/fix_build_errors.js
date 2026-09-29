const fs = require('fs');
const path = require('path');

// 1. Fix VisitStepService outboxEvent
const vsPath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let vsContent = fs.readFileSync(vsPath, 'utf-8');
vsContent = vsContent.replace(
  `      await tx.outboxEvent.create({
        data: {
          type: eventType,
          tenantId,
          visitId,
          payload: { visitStepId, eventType, actorId, ...payload },
        },
      });`,
  `      await tx.outboxEvent.create({
        data: {
          type: eventType,
          payload: { tenantId, visitId, visitStepId, eventType, actorId, ...payload },
        },
      });`
);
fs.writeFileSync(vsPath, vsContent, 'utf-8');

// 2. Fix TenantPaymentsService constructor
const tpPath = path.join(__dirname, '../backend/src/tenant-payments/tenant-payments.service.ts');
let tpContent = fs.readFileSync(tpPath, 'utf-8');
tpContent = tpContent.replace(
  `  constructor(private readonly prisma: PrismaService) {`,
  `  constructor(
    private readonly prisma: PrismaService,
    private readonly visitStepService: VisitStepService,
  ) {`
);
fs.writeFileSync(tpPath, tpContent, 'utf-8');

console.log("Fixed build errors");
