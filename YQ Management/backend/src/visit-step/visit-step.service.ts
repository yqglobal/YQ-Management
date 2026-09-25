import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdvanceStepDto } from './dto/advance-step.dto';
import { RedeemEntitlementDto } from './dto/redeem-entitlement.dto';

@Injectable()
export class VisitStepService {
  private readonly logger = new Logger(VisitStepService.name);

  constructor(private readonly prisma: PrismaService) {}

  async instantiateStepsForVisit(
    tenantId: string,
    visitId: string,
    serviceId: string,
    bookingContext?: { accompanyingGuests?: number },
  ) {
    const flow = await this.prisma.serviceFlow.findUnique({
      where: { serviceId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!flow || !flow.isActive) {
      this.logger.debug(`No active flow found for service ${serviceId}.`);
      return;
    }

    const stepsToCreate = flow.steps.map((template) => {
      let allocated = template.entitlementFixed;
      if (template.entitlementFormula === 'accompanyingGuests + 1') {
        const guests = bookingContext?.accompanyingGuests || 0;
        allocated = guests + 1;
      }

      return {
        visitId,
        tenantId,
        templateStepId: template.id,
        stepOrder: template.stepOrder,
        name: template.name,
        type: template.type,
        status: template.stepOrder === 1 ? 'PENDING' : 'LOCKED',
        serviceId: template.serviceId,
        queueId: template.queueId,
        quantityAllocated: allocated,
      };
    });

    if (stepsToCreate.length > 0) {
      await this.prisma.visitStep.createMany({
        data: stepsToCreate as any,
      });

      const createdSteps = await this.prisma.visitStep.findMany({
        where: { visitId },
      });

      await this.prisma.visitStepEvent.createMany({
        data: createdSteps.map((s) => ({
          visitStepId: s.id,
          visitId,
          tenantId,
          eventType: 'UNLOCKED' as any,
          actorType: 'SYSTEM',
        })).filter((e, i) => stepsToCreate[i].status === 'PENDING'),
      });
    }
  }

  async getVisitSteps(tenantId: string, visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit || visit.tenantId !== tenantId) throw new NotFoundException('Visit not found');

    return this.prisma.visitStep.findMany({
      where: { visitId },
      orderBy: { stepOrder: 'asc' },
      include: { templateStep: true },
    });
  }

  async handleScan(tenantId: string, accessToken: string, staffId: string, targetStepId?: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { accessToken },
      include: { visitSteps: { include: { templateStep: true }, orderBy: { stepOrder: 'asc' } } },
    });

    if (!visit || visit.tenantId !== tenantId) {
      throw new NotFoundException('Invalid or expired QR code.');
    }

    const actionableSteps = visit.visitSteps.filter(
      (s) => s.status === 'PENDING' || s.status === 'ACTIVE' || s.status === 'DEFERRED',
    );

    if (actionableSteps.length === 0) {
      throw new BadRequestException('This QR code currently has no active stages to complete.');
    }

    let targetStep = actionableSteps[0];
    if (targetStepId) {
      const explicit = actionableSteps.find((s) => s.id === targetStepId);
      if (!explicit) {
         throw new BadRequestException('The requested stage is not currently actionable for this customer.');
      }
      targetStep = explicit;
    }

    if (targetStep.type === 'CHECKPOINT' || targetStep.type === 'SERVICE') {
      return this.activateStep(tenantId, targetStep.id, staffId);
    }
    if (targetStep.type === 'COLLECTION') {
      return { action: 'PROMPT_COLLECTION', step: targetStep };
    }
    if (targetStep.type === 'PAYMENT') {
       return { action: 'PROMPT_PAYMENT', step: targetStep };
    }
    return { action: 'MANUAL_ACTION_REQUIRED', step: targetStep };
  }

  async activateStep(tenantId: string, visitStepId: string, staffId: string) {
    const step = await this.prisma.visitStep.findUnique({ where: { id: visitStepId } });
    if (!step || step.tenantId !== tenantId) throw new NotFoundException('Step not found');
    
    if (step.status !== 'PENDING') {
      throw new BadRequestException(`Cannot activate step in status: ${step.status}`);
    }

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        assignedStaffId: staffId,
      },
    });

    await this.logEvent(step.id, step.visitId, tenantId, 'STEP_ACTIVATED', 'STAFF', staffId);
    return updated;
  }

  async advanceStep(tenantId: string, visitStepId: string, staffId: string, dto: AdvanceStepDto) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
      include: { templateStep: true },
    });
    if (!step || step.tenantId !== tenantId) throw new NotFoundException('Step not found');

    if (step.status === 'DONE' || step.status === 'SKIPPED') {
      throw new BadRequestException(`Step is already ${step.status}`);
    }

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        outcome: dto.outcome,
        staffNotes: dto.staffNotes,
      },
    });

    await this.logEvent(step.id, step.visitId, tenantId, 'COMPLETED', 'STAFF', staffId, { outcome: dto.outcome });
    await this.evaluateNextSteps(step.visitId);

    return updated;
  }

  async redeemCollection(tenantId: string, visitStepId: string, staffId: string, dto: RedeemEntitlementDto) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
      include: { templateStep: true },
    });
    if (!step || step.tenantId !== tenantId) throw new NotFoundException('Step not found');
    if (step.type !== 'COLLECTION') throw new BadRequestException('Not a collection step');

    const totalAllowed = step.quantityAllocated ?? 1;
    const remaining = totalAllowed - step.quantityRedeemed;

    if (dto.quantity > remaining) {
      throw new BadRequestException(`Cannot redeem ${dto.quantity}. Only ${remaining} remaining.`);
    }

    const newRedeemed = step.quantityRedeemed + dto.quantity;
    const isCompleted = newRedeemed >= totalAllowed;

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        quantityRedeemed: newRedeemed,
        lastRedeemedAt: new Date(),
        lastRedeemedBy: staffId,
        status: isCompleted ? 'DONE' : 'ACTIVE',
        completedAt: isCompleted ? new Date() : undefined,
      },
    });

    await this.logEvent(step.id, step.visitId, tenantId, 'ENTITLEMENT_REDEEMED', 'STAFF', staffId, {
      redeemed: dto.quantity,
      remaining: totalAllowed - newRedeemed,
      notes: dto.notes,
    });

    if (isCompleted) {
       await this.evaluateNextSteps(step.visitId);
    }

    return updated;
  }

  private async evaluateNextSteps(visitId: string) {
    const steps = await this.prisma.visitStep.findMany({
      where: { visitId },
      orderBy: { stepOrder: 'asc' },
    });

    let allPreviousCompleted = true;
    for (const step of steps) {
      if (step.status === 'DONE' || step.status === 'SKIPPED') {
        continue;
      }
      
      if (allPreviousCompleted && step.status === 'LOCKED') {
        await this.prisma.visitStep.update({
          where: { id: step.id },
          data: { status: 'PENDING', unlockedAt: new Date() },
        });
        break; 
      }
      allPreviousCompleted = false;
    }
  }

  private async logEvent(
    visitStepId: string, visitId: string, tenantId: string,
    eventType: any, actorType: 'STAFF' | 'CUSTOMER' | 'SYSTEM', actorId?: string, payload?: any,
  ) {
    await this.prisma.visitStepEvent.create({
      data: { visitStepId, visitId, tenantId, eventType, actorType, actorId, payload },
    });
  }
}
