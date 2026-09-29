const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname, '../backend/src/tenant-payments/tenant-payments.module.ts');
let moduleContent = fs.readFileSync(modulePath, 'utf-8');
moduleContent = moduleContent.replace(
  `import { PrismaModule } from '../prisma/prisma.module';`,
  `import { PrismaModule } from '../prisma/prisma.module';\nimport { VisitStepModule } from '../visit-step/visit-step.module';`
);
moduleContent = moduleContent.replace(
  `imports: [PrismaModule],`,
  `imports: [PrismaModule, VisitStepModule],`
);
fs.writeFileSync(modulePath, moduleContent, 'utf-8');

const servicePath = path.join(__dirname, '../backend/src/tenant-payments/tenant-payments.service.ts');
let serviceContent = fs.readFileSync(servicePath, 'utf-8');

if (!serviceContent.includes('VisitStepService')) {
  serviceContent = serviceContent.replace(
    `import { PrismaService } from '../prisma/prisma.service';`,
    `import { PrismaService } from '../prisma/prisma.service';\nimport { VisitStepService } from '../visit-step/visit-step.service';`
  );
  
  serviceContent = serviceContent.replace(
    `constructor(private prisma: PrismaService) {}`,
    `constructor(\n    private prisma: PrismaService,\n    private visitStepService: VisitStepService,\n  ) {}`
  );
}

const targetUpdateStr = `    if (updated.visitStepId) {
      // If this was an in-service payment, complete the step
      await this.prisma.visitStep.update({
        where: { id: updated.visitStepId },
        data: {
          status: 'DONE',
          completedAt: new Date(),
        },
      });

      // Also trigger the websocket outbox event to refresh UI
      await this.prisma.outboxEvent.create({
        data: {
          type: 'VISIT_UPDATED',
          payload: { visitId: updated.visitId },
          status: 'PENDING',
        }
      });
    }`;

const newUpdateStr = `    if (updated.visitStepId) {
      // If this was an in-service payment, complete the step using advanceStep to trigger transitions
      const step = await this.prisma.visitStep.findUnique({
        where: { id: updated.visitStepId }
      });
      if (step && step.status !== 'DONE' && step.status !== 'SKIPPED') {
        if (step.status === 'PENDING') {
           await this.visitStepService.activateStep(step.tenantId, step.id, 'SYSTEM');
        }
        await this.visitStepService.advanceStep(step.tenantId, step.id, 'SYSTEM', {
          outcome: 'SUCCESS',
          notes: 'Payment succeeded'
        });
      }
    }`;

serviceContent = serviceContent.replace(targetUpdateStr, newUpdateStr);

fs.writeFileSync(servicePath, serviceContent, 'utf-8');
console.log("Updated tenant-payments service and module");
