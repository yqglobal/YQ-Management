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
        }`;

const newStr = `        // Sync parent visit queueId and serviceId to ensure UI updates reflect the flow transition
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
          
          const oldQueueId = step.visit.queueId;
          const newQueueId = primaryNextStep.queueId;
          
          const eventsToCreate = [];
          
          if (oldQueueId) {
             eventsToCreate.push({
                type: 'VISIT_UPDATED',
                payload: { visitId, tenantId: step.tenantId, queueId: oldQueueId },
             });
          }
          if (newQueueId && newQueueId !== oldQueueId) {
             eventsToCreate.push({
                type: 'VISIT_UPDATED',
                payload: { visitId, tenantId: step.tenantId, queueId: newQueueId },
             });
          }
          
          if (eventsToCreate.length > 0) {
             await this.prisma.outboxEvent.createMany({
                data: eventsToCreate,
             });
          }
        }`;

vsContent = vsContent.replace(targetStr, newStr);

// Also need to emit VISIT_UPDATED when the flow completes entirely
const targetStr2 = `    } else {
      await this.prisma.visit.update({
        where: { id: visitId },
        data: { currentState: 'COMPLETED' },
      });
    }`;
    
const newStr2 = `    } else {
      await this.prisma.visit.update({
        where: { id: visitId },
        data: { currentState: 'COMPLETED' },
      });
      if (step.visit.queueId) {
          await this.prisma.outboxEvent.create({
            data: {
              type: 'VISIT_COMPLETED',
              payload: { visitId, tenantId: step.tenantId, queueId: step.visit.queueId },
            }
          });
      }
    }`;
    
vsContent = vsContent.replace(targetStr2, newStr2);

fs.writeFileSync(vsPath, vsContent, 'utf-8');
console.log("Updated visit-step.service.ts outbox logic");
