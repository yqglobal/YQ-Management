const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/visit/visit.service.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// For advanceTurn
content = content.replace(
  `      const visit = await tx.visit.update({
        where: { id: selectedVisit.id },
        data: {
          currentState: 'IN_SERVICE',
          serviceStart: new Date(),
          operatorId,
        },
      });`,
  `      const visit = await tx.visit.update({
        where: { id: selectedVisit.id },
        data: {
          currentState: 'IN_SERVICE',
          serviceStart: new Date(),
          operatorId,
        },
      });
      // Contextual Flow Support: activate the first pending step
      await this.visitStepService.activateFirstPendingStep(visit.tenantId, visit.id, operatorId);`
);

// For startService
// We need to also get operatorId if available. Let's add operatorId? to startService
content = content.replace(
  `  async startService(id: string, tenantId: string) {`,
  `  async startService(id: string, tenantId: string, operatorId?: string) {`
);

content = content.replace(
  `      const updated = await tx.visit.update({
        where: { id },
        data: { currentState: 'IN_SERVICE', serviceStart: new Date() },
      });`,
  `      const updated = await tx.visit.update({
        where: { id },
        data: { currentState: 'IN_SERVICE', serviceStart: new Date(), operatorId: operatorId || undefined },
      });
      // Contextual Flow Support: activate the first pending step
      await this.visitStepService.activateFirstPendingStep(updated.tenantId, updated.id, operatorId);`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Visit service updated");
