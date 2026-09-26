import {
  Injectable, NotFoundException, ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';


@Injectable()
export class ServiceFlowService {
  private readonly logger = new Logger(ServiceFlowService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Flow CRUD ───────────────────────────────────────────────────────────────

  async createFlow(tenantId: string, dto: CreateFlowDto) {
    // Check if flow already exists for this service
    const existing = await this.prisma.serviceFlow.findUnique({
      where: { serviceId: dto.serviceId },
    });
    if (existing) {
      throw new ConflictException(`A flow already exists for service ${dto.serviceId}. Use updateFlow or deleteFlow first.`);
    }
    return this.prisma.serviceFlow.create({
      data: {
        tenantId,
        serviceId: dto.serviceId,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        allowPartialCompletion: dto.allowPartialCompletion ?? false,
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async getFlowByServiceId(tenantId: string, serviceId: string) {
    const flow = await this.prisma.serviceFlow.findUnique({
      where: { serviceId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { transitions: true },
        },
      },
    });
    if (!flow || flow.tenantId !== tenantId) return null;
    return flow;
  }

  async getFlowWithSteps(tenantId: string, flowId: string) {
    const flow = await this.prisma.serviceFlow.findUnique({
      where: { id: flowId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { transitions: true },
        },
        service: { select: { id: true, name: true } },
      },
    });
    if (!flow || flow.tenantId !== tenantId) throw new NotFoundException('Flow not found');
    return flow;
  }

  async updateFlow(tenantId: string, flowId: string, dto: UpdateFlowDto) {
    const flow = await this.prisma.serviceFlow.findUnique({ where: { id: flowId } });
    if (!flow || flow.tenantId !== tenantId) throw new NotFoundException('Flow not found');
    const { serviceId, ...rest } = dto; // serviceId is immutable after creation
    return this.prisma.serviceFlow.update({
      where: { id: flowId },
      data: rest,
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async deleteFlow(tenantId: string, flowId: string) {
    const flow = await this.prisma.serviceFlow.findUnique({ where: { id: flowId } });
    if (!flow || flow.tenantId !== tenantId) throw new NotFoundException('Flow not found');
    await this.prisma.serviceFlow.delete({ where: { id: flowId } });
  }

  async duplicateFlow(tenantId: string, flowId: string) {
    const flow = await this.prisma.serviceFlow.findUnique({
      where: { id: flowId },
      include: { steps: { include: { transitions: true } } },
    });
    if (!flow || flow.tenantId !== tenantId) throw new NotFoundException('Flow not found');
    // Create new flow without linking to a service (user picks service after)
    const newFlow = await this.prisma.serviceFlow.create({
      data: {
        tenantId,
        serviceId: '', // placeholder — user must update
        name: `${flow.name} (Copy)`,
        description: flow.description,
        isActive: false,
        allowPartialCompletion: flow.allowPartialCompletion,
      },
    });
    // Duplicate steps
    const stepIdMap = new Map<string, string>();
    for (const step of flow.steps) {
      const newStep = await this.prisma.flowStepTemplate.create({
        data: {
          flowId: newFlow.id,
          stepOrder: step.stepOrder,
          name: step.name,
          description: step.description,
          type: step.type,
          trigger: step.trigger,
          serviceId: step.serviceId,
          queueId: step.queueId,
          isOptional: step.isOptional,
          isRepeatable: step.isRepeatable,
          requiresQrScan: step.requiresQrScan,
          requiresStaffAction: step.requiresStaffAction,
          prerequisites: step.prerequisites ?? undefined,
          deferredByDays: step.deferredByDays ?? undefined,
          deferredByHours: step.deferredByHours ?? undefined,
          expiresAfterDays: step.expiresAfterDays ?? undefined,
          entitlementUnit: step.entitlementUnit ?? undefined,
          entitlementFixed: step.entitlementFixed ?? undefined,
          entitlementFormula: step.entitlementFormula ?? undefined,
          allowPartialRedemption: step.allowPartialRedemption,
          preventDoubleRedemption: step.preventDoubleRedemption,
          customerInstruction: step.customerInstruction ?? undefined,
          staffInstruction: step.staffInstruction ?? undefined,
          locationDescription: step.locationDescription ?? undefined,
          floorNumber: step.floorNumber ?? undefined,
          roomNumber: step.roomNumber ?? undefined,
          buildingWing: step.buildingWing ?? undefined,
          mapImageUrl: step.mapImageUrl ?? undefined,
          notifyCustomerOnActivation: step.notifyCustomerOnActivation,
          notificationTemplate: step.notificationTemplate ?? undefined,
          notifyStaffOnActivation: step.notifyStaffOnActivation,
          stepPrice: step.stepPrice ?? undefined,
          stepPriceCurrency: step.stepPriceCurrency,
          isPriceVariable: step.isPriceVariable,
          outcomeOptions: step.outcomeOptions ?? undefined,
        },
      });
      stepIdMap.set(step.id, newStep.id);
    }
    return this.getFlowWithSteps(tenantId, newFlow.id);
  }

  // ── Step CRUD ───────────────────────────────────────────────────────────────

  async createStep(tenantId: string, flowId: string, dto: CreateStepDto) {
    const flow = await this.prisma.serviceFlow.findUnique({ where: { id: flowId } });
    if (!flow || flow.tenantId !== tenantId) throw new NotFoundException('Flow not found');

    const { transitions, ...stepData } = dto;

    const step = await this.prisma.flowStepTemplate.create({
      data: {
        flowId,
        ...stepData,
        type: (stepData.type as any) ?? 'SERVICE',
        trigger: (stepData.trigger as any) ?? 'MANUAL_STAFF',
      },
    });

    // Create transitions if provided
    if (transitions?.length) {
      await this.prisma.flowStepTransition.createMany({
        data: transitions.map((t, i) => ({
          fromStepId: step.id,
          toStepId: t.toStepId,
          flowId,
          condition: t.condition ?? undefined,
          label: t.label,
          priority: t.priority ?? i,
          isDefault: t.isDefault ?? false,
        })),
      });
    }

    return this.prisma.flowStepTemplate.findUnique({
      where: { id: step.id },
      include: { transitions: true },
    });
  }

  async updateStep(tenantId: string, stepId: string, dto: UpdateStepDto) {
    const step = await this.prisma.flowStepTemplate.findUnique({
      where: { id: stepId },
      include: { flow: true },
    });
    if (!step || step.flow.tenantId !== tenantId) throw new NotFoundException('Step not found');

    const { transitions, stepOrder, flowId: _fid, serviceId: _sid, ...updateData } = dto as any;

    const updated = await this.prisma.flowStepTemplate.update({
      where: { id: stepId },
      data: updateData,
    });

    // Replace transitions if provided
    if (transitions !== undefined) {
      await this.prisma.flowStepTransition.deleteMany({ where: { fromStepId: stepId } });
      if (transitions.length) {
        await this.prisma.flowStepTransition.createMany({
          data: transitions.map((t: any, i: number) => ({
            fromStepId: stepId,
            toStepId: t.toStepId,
            flowId: step.flowId,
            condition: t.condition ?? undefined,
            label: t.label,
            priority: t.priority ?? i,
            isDefault: t.isDefault ?? false,
          })),
        });
      }
    }

    return this.prisma.flowStepTemplate.findUnique({
      where: { id: stepId },
      include: { transitions: true },
    });
  }

  async deleteStep(tenantId: string, stepId: string) {
    const step = await this.prisma.flowStepTemplate.findUnique({
      where: { id: stepId },
      include: { flow: true },
    });
    if (!step || step.flow.tenantId !== tenantId) throw new NotFoundException('Step not found');
    await this.prisma.flowStepTemplate.delete({ where: { id: stepId } });
  }

  async reorderSteps(tenantId: string, flowId: string, orderedStepIds: string[]) {
    const flow = await this.prisma.serviceFlow.findUnique({ where: { id: flowId } });
    if (!flow || flow.tenantId !== tenantId) throw new NotFoundException('Flow not found');

    await this.prisma.$transaction(
      orderedStepIds.map((stepId, index) =>
        this.prisma.flowStepTemplate.update({
          where: { id: stepId },
          data: { stepOrder: index + 1 },
        }),
      ),
    );

    return this.getFlowWithSteps(tenantId, flowId);
  }

  // ── Industry Templates ──────────────────────────────────────────────────────

  async listIndustryTemplates(tenantId?: string) {
    const templates = await this.prisma.blueprintFlow.findMany({
      where: tenantId ? {
        OR: [
          { tenantId: null },
          { tenantId: tenantId }
        ]
      } : { tenantId: null },
      include: {
        _count: { select: { steps: true } }
      }
    });

    return templates.map(t => ({
      key: t.key,
      name: t.name,
      description: t.description,
      businessTypes: t.businessTypes,
      stepCount: t._count.steps,
    }));
  }

  async applyIndustryTemplate(tenantId: string, serviceId: string, templateKey: string) {
    const template = await this.prisma.blueprintFlow.findUnique({
      where: { key: templateKey },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!template) throw new BadRequestException(`Template "${templateKey}" not found`);
    if (template.tenantId && template.tenantId !== tenantId) {
      throw new BadRequestException(`Template "${templateKey}" not available for this tenant`);
    }

    // Remove existing flow if any
    const existing = await this.prisma.serviceFlow.findUnique({ where: { serviceId } });
    if (existing) {
      if (existing.tenantId !== tenantId) throw new NotFoundException('Service not found');
      await this.prisma.serviceFlow.delete({ where: { id: existing.id } });
    }

    // Create flow
    const flow = await this.prisma.serviceFlow.create({
      data: {
        tenantId,
        serviceId,
        name: template.name,
        description: template.description,
        isActive: true,
      },
    });

    // Create all steps
    for (const stepData of template.steps) {
      const { id, blueprintId, ...data } = stepData as any;
      await this.prisma.flowStepTemplate.create({
        data: {
          flowId: flow.id,
          ...data,
        },
      });
    }

    return this.getFlowWithSteps(tenantId, flow.id);
  }

  // ── Shared Utilities ────────────────────────────────────────────────────────

  async getFlowForVisitInstantiation(serviceId: string) {
    return this.prisma.serviceFlow.findUnique({
      where: { serviceId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }
}
