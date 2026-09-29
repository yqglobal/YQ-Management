const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const methodToAdd = `
  async activateFirstPendingStep(tenantId: string, visitId: string, staffId?: string) {
    const steps = await this.prisma.visitStep.findMany({
      where: { visitId, tenantId, status: 'PENDING' },
      orderBy: { stepOrder: 'asc' },
      take: 1,
    });
    if (steps.length > 0) {
      await this.activateStep(tenantId, steps[0].id, staffId || null as any);
    }
  }
`;

// Insert it before activateStep
content = content.replace('  async activateStep(', methodToAdd + '\n  async activateStep(');
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Method added');
