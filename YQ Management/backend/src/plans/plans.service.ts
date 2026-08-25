import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/plan.dto';
import { UpdatePlanDto } from './dto/plan.dto';
import { Plan } from '@prisma/client';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPlans(
    statusFilter?: string,
    offset = 0,
    limit = 50,
  ): Promise<Plan[]> {
    const where: Record<string, unknown> = {};
    if (statusFilter) {
      where.active = statusFilter === 'ACTIVE';
    }
    let plans = await this.prisma.plan.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    if (!plans || plans.length === 0) {
      this.logger.log(
        'No plans found in database. Seeding default SaaS pricing plans...',
      );
      try {
        await this.createPlan({
          name: 'Starter (14 Days Trial)',
          description:
            'Perfect for small retail or single service point environments.',
          type: 'STANDARD',
          price: 0,
          currency: 'ZAR',
          billingInterval: 'monthly' as any,
          trialDays: 14,
          status: 'ACTIVE',
          sortOrder: 1,
          features: {
            whatsappNotifications: false,
            whatsappChat: false,
            whatsappChatbot: false,
          },
          limits: { maxQueues: 1, maxTokens: 100 },
        });
        await this.createPlan({
          name: 'Standard Plan',
          description:
            'Ideal for busy clinics, restaurants, and customer service centers.',
          type: 'STANDARD',
          price: 499,
          currency: 'ZAR',
          billingInterval: 'monthly' as any,
          trialDays: 0,
          status: 'ACTIVE',
          sortOrder: 2,
          features: {
            whatsappNotifications: true,
            whatsappChat: false,
            whatsappChatbot: false,
          },
          limits: { maxQueues: 5, maxTokens: 1000 },
        });
        await this.createPlan({
          name: 'Premium Plan',
          description:
            'Comprehensive solution for healthcare networks and large retail chains.',
          type: 'PREMIUM',
          price: 1499,
          currency: 'ZAR',
          billingInterval: 'monthly' as any,
          trialDays: 0,
          status: 'ACTIVE',
          sortOrder: 3,
          features: {
            whatsappNotifications: true,
            whatsappChat: true,
            whatsappChatbot: true,
          },
          limits: { maxQueues: 20, maxTokens: 10000 },
        });
        await this.createPlan({
          name: 'Enterprise Plan',
          description:
            'Special request for enterprise environments with custom features.',
          type: 'ENTERPRISE',
          price: 4999,
          currency: 'ZAR',
          billingInterval: 'monthly' as any,
          trialDays: 0,
          status: 'ACTIVE',
          sortOrder: 4,
          features: {
            whatsappNotifications: true,
            whatsappChat: true,
            whatsappChatbot: true,
            customBranding: true,
            apiAccess: true,
            advancedAnalytics: true,
            multiLocation: true,
          },
          limits: { maxQueues: 100, maxTokens: 50000 },
        });
        plans = await this.prisma.plan.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
      } catch (error) {
        this.logger.error(
          'Failed to auto-seed default SaaS plans',
          error as Error,
        );
      }
    }

    return plans;
  }

  async getPlan(id: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }
    return plan;
  }

  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type || 'standard',
        active: (dto.status || 'ACTIVE') === 'ACTIVE',
        billingInterval: dto.billingInterval || 'monthly',
        price: dto.price ?? 0,
        currency: dto.currency || 'ZAR',
        trialDays: dto.trialDays ?? 0,
        features: (dto.features ?? null) as any,
        limits: (dto.limits ?? null) as any,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    this.logger.log(`Plan created: ${plan.name} (${plan.id})`);
    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const existing = await this.getPlan(id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.billingInterval !== undefined)
      data.billingInterval = dto.billingInterval;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.trialDays !== undefined) data.trialDays = dto.trialDays;
    if (dto.features !== undefined) data.features = dto.features;
    if (dto.limits !== undefined) data.limits = dto.limits;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const updated = await this.prisma.plan.update({
      where: { id },
      data,
    });
    this.logger.log(`Plan updated: ${updated.name} (${updated.id})`);
    return updated;
  }

  async changePlanStatus(id: string, status: string): Promise<Plan> {
    const existing = await this.getPlan(id);
    const updated = await this.prisma.plan.update({
      where: { id },
      data: { active: status === 'ACTIVE' },
    });
    this.logger.log(`Plan ${id} status changed to ${status}`);
    return updated;
  }

  async duplicatePlan(id: string, newName: string): Promise<Plan> {
    const existing = await this.getPlan(id);
    const duplicated = await this.prisma.plan.create({
      data: {
        name: newName,
        description: existing.description ?? undefined,
        type: existing.type,
        billingInterval: existing.billingInterval,
        price: existing.price,
        currency: existing.currency,
        trialDays: existing.trialDays,
        features: existing.features ?? undefined,
        limits: existing.limits ?? undefined,
        active: true,
        sortOrder: existing.sortOrder,
      },
    });
    this.logger.log(`Plan duplicated: ${existing.name} -> ${duplicated.name}`);
    return duplicated;
  }

  async deletePlan(id: string): Promise<Plan> {
    const existing = await this.getPlan(id);

    // Check if any subscriptions are using this plan
    const subCount = await this.prisma.subscription.count({
      where: { planId: id },
    });

    if (subCount > 0) {
      throw new Error(
        `Cannot delete plan because it is currently assigned to ${subCount} subscriptions. Please reassign them first or archive the plan instead.`,
      );
    }

    const deleted = await this.prisma.plan.delete({
      where: { id },
    });
    this.logger.log(`Plan permanently deleted: ${deleted.name} (${deleted.id})`);
    return deleted;
  }
}
