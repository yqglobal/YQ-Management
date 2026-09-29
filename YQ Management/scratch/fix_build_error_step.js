const fs = require('fs');
const path = require('path');

const vsPath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let vsContent = fs.readFileSync(vsPath, 'utf-8');

// The replacement was in evaluateNextSteps
const targetStr = `          const oldQueueId = step.visit.queueId;
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
          }`;

const newStr = `          const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
          const oldQueueId = visit?.queueId;
          const newQueueId = primaryNextStep.queueId;
          
          const eventsToCreate = [];
          
          if (oldQueueId) {
             eventsToCreate.push({
                type: 'VISIT_UPDATED',
                payload: { visitId, tenantId: completedStep.tenantId, queueId: oldQueueId },
             });
          }
          if (newQueueId && newQueueId !== oldQueueId) {
             eventsToCreate.push({
                type: 'VISIT_UPDATED',
                payload: { visitId, tenantId: completedStep.tenantId, queueId: newQueueId },
             });
          }`;

vsContent = vsContent.replace(targetStr, newStr);

const targetStr2 = `      if (step.visit.queueId) {
          await this.prisma.outboxEvent.create({
            data: {
              type: 'VISIT_COMPLETED',
              payload: { visitId, tenantId: step.tenantId, queueId: step.visit.queueId },
            }
          });
      }`;

const newStr2 = `      const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
      if (visit?.queueId) {
          await this.prisma.outboxEvent.create({
            data: {
              type: 'VISIT_COMPLETED',
              payload: { visitId, tenantId: completedStep.tenantId, queueId: visit.queueId },
            }
          });
      }`;

vsContent = vsContent.replace(targetStr2, newStr2);

fs.writeFileSync(vsPath, vsContent, 'utf-8');
console.log("Fixed step reference error");
