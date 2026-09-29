const fs = require('fs');
const path = require('path');

const vsPath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let vsContent = fs.readFileSync(vsPath, 'utf-8');

const targetStr = `        // Sync parent visit queueId and serviceId to ensure UI updates reflect the flow transition
        if (newSteps.length > 0) {
          const primaryNextStep = newSteps[0];
          await this.prisma.visit.update({
            where: { id: visitId },
            data: {
              queueId: primaryNextStep.queueId,
              serviceId: primaryNextStep.serviceId || undefined,
              currentState: 'WAITING', // reset to WAITING so they appear in the queue board
            },
          });
          
          const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
          const oldQueueId = visit?.queueId;
          const newQueueId = primaryNextStep.queueId;`;

const newStr = `        // Sync parent visit queueId and serviceId to ensure UI updates reflect the flow transition
        if (newSteps.length > 0) {
          const primaryNextStep = newSteps[0];
          const oldVisit = await this.prisma.visit.findUnique({ where: { id: visitId } });
          const oldQueueId = oldVisit?.queueId;
          const newQueueId = primaryNextStep.queueId;
          
          await this.prisma.visit.update({
            where: { id: visitId },
            data: {
              queueId: primaryNextStep.queueId,
              serviceId: primaryNextStep.serviceId || undefined,
              currentState: 'WAITING', // reset to WAITING so they appear in the queue board
            },
          });`;

vsContent = vsContent.replace(targetStr, newStr);
fs.writeFileSync(vsPath, vsContent, 'utf-8');
console.log("Fixed oldQueueId fetch");
