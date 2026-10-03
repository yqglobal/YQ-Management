import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdvanceStepDto } from './dto/advance-step.dto';
import { RedeemEntitlementDto } from './dto/redeem-entitlement.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VisitStepService {
  private readonly logger = new Logger(VisitStepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      include: {
        steps: {
          include: { transitions: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!flow || !flow.isActive || flow.steps.length === 0) {
      this.logger.debug(`No active flow found for service ${serviceId}.`);
      return;
    }

    const allTransitions = flow.steps.flatMap((s) => s.transitions);
    const targetStepIds = new Set(allTransitions.map((t) => t.toStepId));

    let rootSteps = flow.steps.filter((s) => !targetStepIds.has(s.id));
    if (rootSteps.length === 0) {
      rootSteps = flow.steps.filter((s) => s.stepOrder === 1);
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

      let status = 'PENDING';
      let deferredUntil: Date | null = null;
      if (template.deferredByDays || template.deferredByHours) {
        status = 'DEFERRED';
        deferredUntil = new Date(
          Date.now() + 
          (template.deferredByDays || 0) * 24 * 60 * 60 * 1000 + 
          (template.deferredByHours || 0) * 60 * 60 * 1000
        );
      }

      return {
        visitId,
        tenantId,
        templateStepId: template.id,
        stepOrder: template.stepOrder,
        name: template.name,
        type: template.type,
        status: status,
        deferredUntil,
        serviceId: template.serviceId,
        queueId: template.queueId,
        quantityAllocated: allocated,
        expiresAt: template.expiresAfterDays 
          ? new Date(Date.now() + template.expiresAfterDays * 24 * 60 * 60 * 1000)
          : template.expiresAfterHours 
            ? new Date(Date.now() + template.expiresAfterHours * 60 * 60 * 1000)
            : null,
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
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
    });
    if (!visit || visit.tenantId !== tenantId)
      throw new NotFoundException('Visit not found');

    return this.prisma.visitStep.findMany({
      where: { visitId },
      orderBy: { stepOrder: 'asc' },
      include: { templateStep: true },
    });
  }

  async handleScan(
    tenantId: string,
    accessToken: string,
    staffId: string,
    targetStepId?: string,
  ) {
    const visit = await this.prisma.visit.findUnique({
      where: { accessToken },
      include: {
        visitSteps: {
          include: { templateStep: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!visit || visit.tenantId !== tenantId) {
      throw new NotFoundException('Invalid or expired QR code.');
    }

    // First, sweep any expired steps for this visit
    const now = new Date();
    for (const step of visit.visitSteps) {
      if (
        (step.status === 'PENDING' || step.status === 'ACTIVE' || step.status === 'DEFERRED') &&
        step.expiresAt && step.expiresAt < now
      ) {
        await this.prisma.visitStep.update({
          where: { id: step.id },
          data: { status: 'EXPIRED' },
        });
        await this.logEvent(step.id, step.visitId, tenantId, 'EXPIRED', 'SYSTEM');
        step.status = 'EXPIRED'; // update in-memory for the filter below
      }
    }

    const actionableSteps = visit.visitSteps.filter(
      (s) =>
        s.status === 'PENDING' ||
        s.status === 'ACTIVE' ||
        s.status === 'DEFERRED',
    );

    if (actionableSteps.length === 0) {
      throw new BadRequestException(
        'This QR code currently has no active stages to complete.',
      );
    }

    let targetStep = actionableSteps[0];
    if (targetStepId) {
      const explicit = actionableSteps.find((s) => s.id === targetStepId);
      if (!explicit) {
        throw new BadRequestException(
          'The requested stage is not currently actionable for this customer.',
        );
      }
      targetStep = explicit;
    }

    if (targetStep.type === 'CHECKPOINT' || targetStep.type === 'SERVICE') {
      if (targetStep.status === 'ACTIVE') {
        // Scanning an already active step completes it
        return this.advanceStep(tenantId, targetStep.id, staffId, {});
      }
      return this.activateStep(tenantId, targetStep.id, staffId);
    }
    if (targetStep.type === 'COLLECTION') {
      return { action: 'PROMPT_COLLECTION', step: targetStep };
    }
    if (targetStep.type === 'PAYMENT') {
      return { action: 'PROMPT_PAYMENT', step: targetStep };
    }
    if (targetStep.type === 'FORM') {
      return { action: 'FORM_REQUIRED', step: targetStep };
    }
    return { action: 'MANUAL_ACTION_REQUIRED', step: targetStep };
  }


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

  async activateStep(tenantId: string, visitStepId: string, staffId: string) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
      include: { templateStep: true },
    });
    if (!step || step.tenantId !== tenantId)
      throw new NotFoundException('Step not found');

    if (step.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot activate step in status: ${step.status}`,
      );
    }

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        assignedStaffId: staffId,
      },
    });

    await this.logEvent(
      step.id,
      step.visitId,
      tenantId,
      'STEP_ACTIVATED',
      staffId === 'SYSTEM' ? 'SYSTEM' : 'STAFF',
      staffId === 'SYSTEM' ? undefined : staffId,
    );

    // If it's a notification, immediately advance it.
    // The WhatsApp message is handled asynchronously via the outbox event.
    if (step.templateStep.type === 'NOTIFICATION') {
      await this.advanceStep(tenantId, step.id, 'SYSTEM', { outcome: 'SENT' });
    }

    return updated;
  }

  async advanceStep(
    tenantId: string,
    visitStepId: string,
    staffId: string,
    dto: AdvanceStepDto,
  ) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
      include: {
        templateStep: true,
        visit: {
          include: {
            customer: { select: { phone: true, name: true } },
            location: { select: { name: true } },
          },
        },
      },
    });
    if (!step || step.tenantId !== tenantId)
      throw new NotFoundException('Step not found');

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

    await this.logEvent(
      step.id,
      step.visitId,
      tenantId,
      'COMPLETED',
      'STAFF',
      staffId,
      { outcome: dto.outcome },
    );

    // Notify customer about next step if enabled and customer has a phone
    const nextInstruction = step.templateStep?.customerInstruction;
    const customerPhone = (step.visit as any)?.customer?.phone;
    if (
      step.templateStep?.notifyCustomerOnActivation &&
      nextInstruction &&
      customerPhone
    ) {
      const locationName =
        (step.visit as any)?.location?.name || 'the service area';
      const msg =
        `📋 *Next Step: ${step.name}*\n\n` +
        `${nextInstruction}\n\n` +
        `📍 Location: *${locationName}*`;
      this.notificationsService
        .sendWhatsAppMessage(customerPhone, msg, tenantId)
        .catch((e) =>
          this.logger.warn(
            `Step notification failed for step ${step.id}: ${e.message}`,
          ),
        );
    }

    await this.evaluateNextSteps(step.visitId, step.id, dto.outcome);

    return updated;
  }

  async skipStep(
    tenantId: string,
    visitStepId: string,
    staffId: string,
  ) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
    });
    if (!step || step.tenantId !== tenantId)
      throw new NotFoundException('Step not found');

    if (step.status === 'DONE' || step.status === 'SKIPPED') {
      throw new BadRequestException(`Step is already ${step.status}`);
    }

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'SKIPPED',
        completedAt: new Date(),
        staffNotes: 'Skipped manually by staff',
      },
    });

    await this.logEvent(
      step.id,
      step.visitId,
      tenantId,
      'SKIPPED',
      'STAFF',
      staffId,
    );

    await this.evaluateNextSteps(step.visitId, step.id);

    return updated;
  }

  /**
   * Staff-facing revert: undo a SKIPPED step and set it back to ACTIVE.
   * Cascades: any steps that were unlocked as a result of the skip are re-locked.
   */
  async revertStep(
    tenantId: string,
    visitStepId: string,
    staffId: string,
  ) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
      include: { visit: true },
    });
    if (!step || step.tenantId !== tenantId)
      throw new NotFoundException('Step not found');

    if (step.status !== 'SKIPPED') {
      throw new BadRequestException('Only SKIPPED steps can be reverted');
    }

    if (step.visit.currentState === 'COMPLETED' || step.visit.currentState === 'CANCELLED') {
      throw new BadRequestException('Cannot revert a step on a completed or cancelled visit');
    }

    // Find all steps that came after this one in the flow that may now need to be locked again
    const subsequentSteps = await this.prisma.visitStep.findMany({
      where: {
        visitId: step.visitId,
        stepOrder: { gt: step.stepOrder ?? 0 },
        status: { in: ['ACTIVE', 'PENDING', 'QUEUED', 'DEFERRED'] },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      // Revert the step to ACTIVE
      await tx.visitStep.update({
        where: { id: step.id },
        data: {
          status: 'ACTIVE',
          completedAt: null,
          staffNotes: step.staffNotes
            ? `${step.staffNotes} | Reverted by staff`
            : 'Reverted by staff',
        },
      });

      // Lock any steps that were unlocked downstream
      if (subsequentSteps.length > 0) {
        await tx.visitStep.updateMany({
          where: { id: { in: subsequentSteps.map((s) => s.id) } },
          data: { status: 'LOCKED' },
        });
      }
    });

    await this.logEvent(step.id, step.visitId, tenantId, 'ACTIVE', 'STAFF', staffId);

    return { success: true, stepId: step.id };
  }

  async redeemCollection(
    tenantId: string,
    visitStepId: string,
    staffId: string,
    dto: RedeemEntitlementDto,
  ) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
      include: { templateStep: true },
    });
    if (!step || step.tenantId !== tenantId)
      throw new NotFoundException('Step not found');
    if (step.type !== 'COLLECTION')
      throw new BadRequestException('Not a collection step');

    const totalAllowed = step.quantityAllocated ?? 1;

    // Use atomic update to prevent race conditions (over-redemption)
    const result = await this.prisma.visitStep.updateMany({
      where: {
        id: step.id,
        quantityRedeemed: { lte: totalAllowed - dto.quantity },
      },
      data: {
        quantityRedeemed: { increment: dto.quantity },
        lastRedeemedAt: new Date(),
        lastRedeemedBy: staffId,
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(`Cannot redeem ${dto.quantity}. Limit exceeded or already fulfilled.`);
    }

    // Fetch the updated step to check if it's completed
    const updated = await this.prisma.visitStep.findUnique({
      where: { id: step.id },
    });

    const newRedeemed = updated!.quantityRedeemed || 0;
    const isCompleted = newRedeemed >= totalAllowed;

    if (isCompleted) {
      await this.prisma.visitStep.update({
        where: { id: step.id },
        data: { status: 'DONE', completedAt: new Date() },
      });
    }

    await this.logEvent(
      step.id,
      step.visitId,
      tenantId,
      'ENTITLEMENT_REDEEMED',
      'STAFF',
      staffId,
      {
        redeemed: dto.quantity,
        remaining: totalAllowed - newRedeemed,
        notes: dto.notes,
      },
    );

    if (isCompleted) {
      await this.evaluateNextSteps(step.visitId, step.id);
    }

    return updated;
  }

  async submitForm(
    tenantId: string,
    visitStepId: string,
    staffId: string,
    formData: any,
  ) {
    const step = await this.prisma.visitStep.findUnique({
      where: { id: visitStepId },
      include: { templateStep: true },
    });
    if (!step || step.tenantId !== tenantId)
      throw new NotFoundException('Step not found');
    if (step.type !== 'FORM')
      throw new BadRequestException('Not a form step');
    if (step.status === 'DONE' || step.status === 'SKIPPED')
      throw new BadRequestException(`Step is already ${step.status}`);

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        formData,
      },
    });

    await this.logEvent(
      step.id,
      step.visitId,
      tenantId,
      'COMPLETED',
      'STAFF',
      staffId,
      { formData },
    );

    await this.evaluateNextSteps(step.visitId, step.id);
    return updated;
  }

  public async evaluateNextSteps(
    visitId: string,
    completedVisitStepId?: string,
    outcome?: any,
  ) {
    if (!completedVisitStepId) return;

    return this.prisma.$transaction(async (tx) => {
      // Lock the visit row to prevent parallel SEF branch race conditions
      await tx.$queryRaw`SELECT id FROM "Visit" WHERE id = ${visitId} FOR UPDATE`;

      const completedStep = await tx.visitStep.findUnique({
        where: { id: completedVisitStepId },
        include: { templateStep: { include: { transitions: true } } },
      });

      if (!completedStep || !completedStep.templateStep) return;

      const activeSteps = await tx.visitStep.findMany({
        where: {
          visitId,
          id: { not: completedVisitStepId },
          status: { in: ['PENDING', 'ACTIVE', 'DEFERRED'] },
        },
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
        const defaultTransition = transitions.find((t) => t.isDefault);
        if (defaultTransition && defaultTransition.toStepId) {
          nextTemplateIds.push(defaultTransition.toStepId);
        }
      }
    } else {
      const flow = await this.prisma.serviceFlow.findUnique({
        where: { id: completedStep.templateStep.flowId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      if (flow) {
        const currentIndex = flow.steps.findIndex(
          (s) => s.id === completedStep.templateStepId,
        );
        if (currentIndex !== -1 && currentIndex < flow.steps.length - 1) {
          nextTemplateIds.push(flow.steps[currentIndex + 1].id);
        }
      }
    }

    nextTemplateIds = [...new Set(nextTemplateIds.filter(Boolean))];

    if (nextTemplateIds.length > 0) {
      // Infinite Loop Protection Circuit Breaker
      const existingSteps = await tx.visitStep.findMany({
        where: { visitId },
        select: { templateStepId: true },
      });
      
      if (existingSteps.length > 20) {
        this.logger.error(
          `Infinite loop protection triggered for visit ${visitId}. (>20 steps). Aborting.`,
        );
        return;
      }

      const instantiatedTemplateIds = new Set(existingSteps.map(s => s.templateStepId));
      for (const nextId of nextTemplateIds) {
        if (instantiatedTemplateIds.has(nextId)) {
          this.logger.error(
            `CIRCULAR_FLOW_DETECTED: templateStepId ${nextId} already instantiated for visit ${visitId}. Aborting to prevent loop.`,
          );
          return;
        }
      }

      const nextTemplates = await tx.flowStepTemplate.findMany({
        where: { id: { in: nextTemplateIds } },
      });

      const stepsToCreate = nextTemplates.map((template) => {
        let status = 'PENDING';
        let deferredUntil: Date | null = null;
        if (template.deferredByDays || template.deferredByHours) {
          status = 'DEFERRED';
          deferredUntil = new Date(
            Date.now() + 
            (template.deferredByDays || 0) * 24 * 60 * 60 * 1000 + 
            (template.deferredByHours || 0) * 60 * 60 * 1000
          );
        }

        return {
          visitId,
          tenantId: completedStep.tenantId,
          templateStepId: template.id,
          stepOrder: template.stepOrder,
          name: template.name,
          type: template.type,
          status: status,
          deferredUntil,
          serviceId: template.serviceId,
          queueId: template.queueId,
          quantityAllocated: template.entitlementFixed,
          expiresAt: template.expiresAfterDays 
            ? new Date(Date.now() + template.expiresAfterDays * 24 * 60 * 60 * 1000)
            : template.expiresAfterHours 
              ? new Date(Date.now() + template.expiresAfterHours * 60 * 60 * 1000)
              : null,
        };
      });

      if (stepsToCreate.length > 0) {
        await tx.visitStep.createMany({
          data: stepsToCreate as any,
        });

        const newSteps = await tx.visitStep.findMany({
          where: {
            visitId,
            templateStepId: { in: nextTemplateIds },
            status: 'PENDING',
          },
        });

        await tx.visitStepEvent.createMany({
          data: newSteps.map((s) => ({
            visitStepId: s.id,
            visitId,
            tenantId: s.tenantId,
            eventType: 'UNLOCKED' as any,
            actorType: 'SYSTEM',
          })),
        });

        // Sync parent visit queueId and serviceId to ensure UI updates reflect the flow transition
        if (newSteps.length > 0) {
          const primaryNextStep = newSteps[0];
          const oldVisit = await tx.visit.findUnique({ where: { id: visitId } });
          const oldQueueId = oldVisit?.queueId;
          const newQueueId = primaryNextStep.queueId;
          
          await tx.visit.update({
            where: { id: visitId },
            data: {
              queueId: primaryNextStep.queueId,
              serviceId: primaryNextStep.serviceId || undefined,
              currentState: 'WAITING', // reset to WAITING so they appear in the queue board
            },
          });
          
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
          }
          
          if (eventsToCreate.length > 0) {
             await tx.outboxEvent.createMany({
                data: eventsToCreate,
             });
          }
        }
      }
    } else {
      await tx.visit.update({
        where: { id: visitId },
        data: { currentState: 'COMPLETED', completedAt: new Date() },
      });
      const visit = await tx.visit.findUnique({ where: { id: visitId } });
      if (visit?.queueId) {
          await tx.outboxEvent.create({
            data: {
              type: 'VISIT_COMPLETED',
              payload: { visitId, tenantId: completedStep.tenantId, queueId: visit.queueId },
            }
          });
      }
    }
    }); // End of transaction
  }

  private async logEvent(
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
          payload: { tenantId, visitId, visitStepId, eventType, actorId, ...payload },
        },
      });
    });
  }

  async skipStepPublic(accessToken: string, stepId: string) {
    const step = await this.prisma.visitStep.findFirst({
      where: { id: stepId, visit: { accessToken } },
      include: { templateStep: true },
    });
    
    if (!step) throw new NotFoundException('Step not found');
    if (step.status !== 'ACTIVE' && step.status !== 'PENDING') {
      throw new BadRequestException(`Cannot skip step in status ${step.status}`);
    }
    if (!step.templateStep?.isOptional) {
      throw new BadRequestException('This step is mandatory and cannot be skipped');
    }

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'SKIPPED',
        completedAt: new Date(),
        staffNotes: 'Skipped by customer',
      },
    });

    await this.logEvent(
      step.id,
      step.visitId,
      step.tenantId,
      'SKIPPED',
      'CUSTOMER',
      'CUSTOMER',
    );

    await this.evaluateNextSteps(step.visitId, step.id);
    return updated;
  }

  async submitFormPublic(accessToken: string, stepId: string, formData: any) {
    const step = await this.prisma.visitStep.findFirst({
      where: { id: stepId, visit: { accessToken } },
      include: { templateStep: true },
    });
    
    if (!step) throw new NotFoundException('Step not found');
    if (step.type !== 'FORM')
      throw new BadRequestException('Not a form step');
    if (step.status === 'DONE' || step.status === 'SKIPPED') {
      throw new BadRequestException(`Cannot submit form on step in status ${step.status}`);
    }

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        formData,
      },
    });

    await this.logEvent(
      step.id,
      step.visitId,
      step.tenantId,
      'COMPLETED',
      'CUSTOMER',
      'CUSTOMER',
      { formData },
    );

    await this.evaluateNextSteps(step.visitId, step.id);
    return updated;
  }

  async revertStepPublic(accessToken: string, stepId: string) {
    const step = await this.prisma.visitStep.findFirst({
      where: { id: stepId, visit: { accessToken } },
      include: { visit: { include: { visitSteps: true } } },
    });
    
    if (!step) throw new NotFoundException('Step not found');
    if (step.status !== 'SKIPPED') {
      throw new BadRequestException(`Can only revert skipped steps`);
    }

    // Find steps that were unlocked after this one, and lock them.
    const subsequentActiveSteps = step.visit.visitSteps.filter(
       s => (s.status === 'ACTIVE' || s.status === 'PENDING') && s.stepOrder > step.stepOrder
    );

    for (const subStep of subsequentActiveSteps) {
       await this.prisma.visitStep.update({
         where: { id: subStep.id },
         data: { status: 'LOCKED' }
       });
    }

    const updated = await this.prisma.visitStep.update({
      where: { id: step.id },
      data: {
        status: 'ACTIVE',
        completedAt: null,
        staffNotes: 'Reverted by customer',
      },
    });

    await this.logEvent(
      step.id,
      step.visitId,
      step.tenantId,
      'REVERTED',
      'CUSTOMER',
      'CUSTOMER',
    );

    return updated;
  }
}
