import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(
    tenantId: string,
    data: { name: string; phone?: string; email?: string },
  ) {
    return this.prisma.extendedClient.customer.create({
      data: {
        tenantId,
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    });
  }

  async findAll(tenantId: string, cursor?: string, limit: number = 50) {
    const customers = await this.prisma.extendedClient.customer.findMany({
      where: { tenantId },
      take: limit + 1, // fetch one extra to see if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        visits: {
          select: {
            id: true,
            createdAt: true,
            completedAt: true,
            currentState: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (customers.length > limit) {
      const nextItem = customers.pop();
      nextCursor = nextItem?.id;
    }

    const items = customers.map((c: any) => {
      const visits = c.visits || [];

      let totalWaitMs = 0;
      let completedCount = 0;
      let maxCreatedAt = 0;

      visits.forEach((v: any) => {
        const createdMs = v.createdAt.getTime();
        if (createdMs > maxCreatedAt) maxCreatedAt = createdMs;

        if (v.completedAt) {
          totalWaitMs += v.completedAt.getTime() - createdMs;
          completedCount++;
        }
      });

      let avgWaitMinutesStr = '—';
      if (completedCount > 0) {
        const mins = Math.round(totalWaitMs / completedCount / 60000);
        avgWaitMinutesStr = mins < 1 ? '<1 min' : `${mins} min`;
      }

      let lastVisitLabelStr = '—';
      if (visits.length > 0) {
        const diffDays = Math.floor((Date.now() - maxCreatedAt) / 86400000);
        if (diffDays === 0) lastVisitLabelStr = 'Today';
        else if (diffDays === 1) lastVisitLabelStr = 'Yesterday';
        else if (diffDays < 30) lastVisitLabelStr = `${diffDays}d ago`;
        else
          lastVisitLabelStr = new Date(maxCreatedAt).toLocaleDateString(
            'en-US',
            { month: 'short', day: 'numeric', year: 'numeric' },
          );
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        isVip: c.isVip,
        isBlocked: c.isBlocked,
        notes: c.notes,
        totalVisits: visits.length,
        avgWaitMinutes: avgWaitMinutesStr,
        lastVisitLabel: lastVisitLabelStr,
        lastVisitMs: maxCreatedAt,
      };
    });

    return { items, nextCursor };
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.extendedClient.customer.findFirst({
      where: { id, tenantId },
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            service: { include: { serviceFlow: true } },
            queue: { include: { location: true } },
            location: true,
            bookingPayments: true,
            visitSteps: {
              include: { templateStep: true },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    let age: number | null = null;
    let gender: string | null = null;
    for (const v of customer.visits || []) {
      // Map visitSteps to steps for frontend convenience
      (v as any).steps = (v as any).visitSteps;
      const meta = (v.metadata as any) || {};
      const form = (v.formResponses as any) || {};
      if (!age && (meta.age || form.age)) {
        const parsed = parseInt(meta.age || form.age, 10);
        if (!isNaN(parsed)) age = parsed;
      }
      if (!gender && (meta.gender || form.gender)) {
        gender = String(meta.gender || form.gender);
      }
      if (age && gender) break;
    }

    return {
      ...customer,
      age,
      gender,
    };
  }

  async update(id: string, tenantId: string, data: any) {
    const customer = await this.prisma.extendedClient.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.extendedClient.customer.update({
      where: { id },
      data,
    });
  }
}
