const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/visit-step/visit-step.service.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `  private async logEvent(
    visitStepId: string,
    visitId: string,
    tenantId: string,
    eventType: any,
    actorType: 'STAFF' | 'CUSTOMER' | 'SYSTEM',
    actorId?: string,
    payload?: any,
  ) {
    await this.prisma.visitStepEvent.create({
      data: {
        visitStepId,
        visitId,
        tenantId,
        eventType,
        actorType,
        actorId,
        payload,
      },
    });
  }`;

const newStr = `  private async logEvent(
    visitStepId: string,
    visitId: string,
    tenantId: string,
    eventType: any,
    actorType: 'STAFF' | 'CUSTOMER' | 'SYSTEM',
    actorId?: string,
    payload?: any,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.visitStepEvent.create({
        data: {
          visitStepId,
          visitId,
          tenantId,
          eventType,
          actorType,
          actorId,
          payload,
        },
      });
      await tx.outboxEvent.create({
        data: {
          type: eventType,
          tenantId,
          visitId,
          payload: { visitStepId, eventType, actorId, ...payload },
        },
      });
    });
  }`;

content = content.replace(targetStr, newStr);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Updated logEvent to emit outbox event");
