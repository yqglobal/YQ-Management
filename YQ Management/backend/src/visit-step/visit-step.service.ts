import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdvanceStepDto } from './dto/advance-step.dto';
import { RedeemEntitlementDto } from './dto/redeem-entitlement.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VisitStepService {
  private readonly logger = new Logger(VisitStepService.name);

  constructor(private readonly prisma: PrismaService) {}

  async instantiateStepsForVisit(
    tenantId: string,
    visitId: string,
    serviceId: string,
    bookingContext?: { accompanyingGuests?: number },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || this.prisma;
    const flow = await db.serviceFlow.findUnique({
      where: { serviceId },
      include: { steps: { include: { transitions: true }, orderBy: { stepOrder: 'asc' } } },
    });

    if (!flow || !flow.isActive || flow.steps.length === 0) {
      this.logger.debug(`No active flow found for service ${serviceId}.`);
      return;
    }

    const allTransitions = flow.steps.flatMap(s => s.transitions);
    const targetStepIds = new Set(allTransitions.map(t => t.toStepId));
    
    let rootSteps = flow.steps.filter(s => !targetStepIds.has(s.id));
    if (rootSteps.length === 0) {
      rootSteps = flow.steps.filter(s => s.stepOrder === 1);
    }
    if (rootSteps.length === 0) {
      rootSteps = [flow.steps[0]];
    }

    const stepsToCreate = rootSteps.map((template) => {
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
        status: 'PENDING',
        serviceId: template.serviceId,
        queueId: template.queueId,
        quantityAllocated: allocated,
      };
    });

    await db.visitStep.createMany({
      data: stepsToCreate as any,
    });

    const createdSteps = await db.visitStep.findMany({
      where: { visitId },
    });

    await db.visitStepEvent.createMany({
      data: createdSteps.map((s) => ({
        visitStepId: s.id,
        visitId,
        tenantId,
        eventType: 'UNLOCKED' as any,
        actorType: 'SYSTEM',
      })),
    });
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
    await this.evaluateNextSteps(step.visitId, step.id, dto.outcome);

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
       await this.evaluateNextSteps(step.visitId, step.id);
    }

    return updated;
  }

  private async evaluateNextSteps(visitId: string, completedVisitStepId?: string, outcome?: any) {
    if (!completedVisitStepId) return;

    const completedStep = await this.prisma.visitStep.findUnique({
      where: { id: completedVisitStepId },
      include: { templateStep: { include: { transitions: true } } },
    });
    
    if (!completedStep || !completedStep.templateStep) return;

    const activeSteps = await this.prisma.visitStep.findMany({
      where: { visitId, status: { in: ['PENDING', 'ACTIVE', 'DEFERRED'] } }
    });
    if (activeSteps.length > 0) return; // Wait until all parallel branches resolve

    const transitions = completedStep.templateStep.transitions;
    let nextTemplateIds: string[] = [];

    if (transitions.length > 0) {
      for (const t of transitions) {
        if (!t.condition) {
          if (t.toStepId) nextTemplateIds.push(t.toStepId);
          continue;
        }
        
        const condition = t.condition as any;
        if (condition?.outcome && outcome === condition.outcome) {
           if (t.toStepId) nextTemplateIds.push(t.toStepId);
        }
      }
      
      if (nextTemplateIds.length === 0) {
        const defaultTransition = transitions.find(t => t.isDefault);
        if (defaultTransition && defaultTransition.toStepId) {
          nextTemplateIds.push(defaultTransition.toStepId);
        }
      }
    } else {
       const flow = await this.prisma.serviceFlow.findUnique({
         where: { id: completedStep.templateStep.flowId },
         include: { steps: { orderBy: { stepOrder: 'asc' } } }
       });
       if (flow) {
         const currentIndex = flow.steps.findIndex(s => s.id === completedStep.templateStepId);
         if (currentIndex !== -1 && currentIndex < flow.steps.length - 1) {
           nextTemplateIds.push(flow.steps[currentIndex + 1].id);
         }
       }
    }

    nextTemplateIds = [...new Set(nextTemplateIds.filter(Boolean))];

    if (nextTemplateIds.length > 0) {
       // Infinite Loop Protection Circuit Breaker
       const currentStepCount = await this.prisma.visitStep.count({ where: { visitId } });
       if (currentStepCount > 100) {
         this.logger.error(`Infinite loop protection triggered for visit ${visitId}. Aborting branch instantiation.`);
         return;
       }

       const nextTemplates = await this.prisma.flowStepTemplate.findMany({
         where: { id: { in: nextTemplateIds } }
       });
       
       const stepsToCreate = nextTemplates.map((template) => ({
          visitId,
          tenantId: completedStep.tenantId,
          templateStepId: template.id,
          stepOrder: template.stepOrder,
          name: template.name,
          type: template.type,
          status: 'PENDING',
          serviceId: template.serviceId,
          queueId: template.queueId,
          quantityAllocated: template.entitlementFixed,
       }));
       
       if (stepsToCreate.length > 0) {
         await this.prisma.visitStep.createMany({
            data: stepsToCreate as any,
         });

         const newSteps = await this.prisma.visitStep.findMany({
            where: { visitId, templateStepId: { in: nextTemplateIds }, status: 'PENDING' }
         });

         await this.prisma.visitStepEvent.createMany({
            data: newSteps.map((s) => ({
              visitStepId: s.id,
              visitId,
              tenantId: s.tenantId,
              eventType: 'UNLOCKED' as any,
              actorType: 'SYSTEM',
            })),
         });
       }
    } else {
       await this.prisma.visit.update({
         where: { id: visitId },
         data: { currentState: 'COMPLETED' }
       });
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
