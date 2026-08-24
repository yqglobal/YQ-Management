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

  async findAll(tenantId: string) {
    const customers = await this.prisma.extendedClient.customer.findMany({
      where: { tenantId },
      include: {
        visits: {
          select: { id: true, createdAt: true, completedAt: true, currentState: true }
        }
      }
    });

    return customers.map((c: any) => {
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
        const mins = Math.round((totalWaitMs / completedCount) / 60000);
        avgWaitMinutesStr = mins < 1 ? '<1 min' : `${mins} min`;
      }

      let lastVisitLabelStr = '—';
      if (visits.length > 0) {
        const diffDays = Math.floor((Date.now() - maxCreatedAt) / 86400000);
        if (diffDays === 0) lastVisitLabelStr = 'Today';
        else if (diffDays === 1) lastVisitLabelStr = 'Yesterday';
        else if (diffDays < 30) lastVisitLabelStr = `${diffDays}d ago`;
        else lastVisitLabelStr = new Date(maxCreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalVisits: visits.length,
        avgWaitMinutes: avgWaitMinutesStr,
        lastVisitLabel: lastVisitLabelStr,
        lastVisitMs: maxCreatedAt
      };
    });
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.extendedClient.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
