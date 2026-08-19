import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';

@Injectable()
export class VisitService {
  private readonly logger = new Logger(VisitService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Basic CRUD for controllers
  async create(createVisitDto: CreateVisitDto) {
    return this.prisma.visit.create({
      data: createVisitDto,
    });
  }

  async findAll(userTokenPayload: any, scope?: 'today' | 'history') {
    const where: any = { tenantId: userTokenPayload.tenantId };
    if (userTokenPayload.role === 'OPERATOR') {
      const user = await this.prisma.user.findUnique({ where: { id: userTokenPayload.userId } });
      if (user && user.allowedLocationIds && user.allowedLocationIds.length > 0) {
        where.locationId = { in: user.allowedLocationIds };
      }
    }
    if (scope === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else if (scope === 'history') {
      where.currentState = { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] };
    }
    return this.prisma.visit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        service: true,
        location: true,
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: { customer: true, service: true, location: true },
    });
    if (!visit) throw new NotFoundException(`Visit with ID ${id} not found`);
    return visit;
  }

  async findOnePublic(accessToken: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { accessToken },
      select: {
        id: true,
        queueId: true,
        displayId: true,
        accessToken: true,
        currentState: true,
        waitingStart: true,
        createdAt: true,
        customer: { select: { name: true } },
        service: { select: { name: true, expectedDuration: true } },
        location: { select: { name: true, address: true } },
        tenant: { select: { name: true } },
      },
    });
    if (!visit) throw new NotFoundException(`Visit with accessToken ${accessToken} not found`);
    return visit;
  }

  async update(id: string, tenantId: string, updateVisitDto: UpdateVisitDto) {
    await this.findOne(id, tenantId);
    return this.prisma.visit.update({ where: { id }, data: updateVisitDto });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.visit.delete({ where: { id } });
  }

  // --- STATE MACHINE METHODS ---

  async joinQueue(queueId: string, customerData: { name: string; phone?: string | null }) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { services: true }
    });
    
    if (!queue) throw new NotFoundException('Queue not found');
    if (!queue.services || queue.services.length === 0) {
      throw new BadRequestException('Queue has no linked services');
    }

    const serviceId = queue.services[0].id;
    const locationId = queue.locationId;
    if (!locationId) throw new BadRequestException('Queue is not assigned to a Location');

    return this.prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findFirst({
        where: { phone: customerData.phone || undefined, tenantId: queue.tenantId }
      });
      
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId: queue.tenantId,
            name: customerData.name || 'Walk-in',
            phone: customerData.phone,
          }
        });
      }

      const config = (queue.tokenDisplayConfig as any) || {};
      const prefix = config.prefix || 'Q';
      let numberPart = Math.floor(1000 + Math.random() * 9000).toString();
      const displayId = `${prefix}${numberPart}`;

      const visit = await tx.visit.create({
        data: {
          tenantId: queue.tenantId,
          customerId: customer.id,
          locationId: locationId,
          queueId,
          serviceId,
          displayId,
          currentState: 'WAITING',
          waitingStart: new Date(),
          metadata: {
            customerName: customerData.name,
            phone: customerData.phone
          }
        }
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CREATED',
          payload: { visitId: visit.id, queueId: queue.id, tenantId: queue.tenantId, displayId }
        }
      });

      return visit;
    });
  }

  async advanceTurn(queueId: string, operatorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldestWaiting = await tx.visit.findFirst({
        where: { queueId, currentState: 'WAITING' },
        orderBy: { createdAt: 'asc' }
      });

      if (!oldestWaiting) return null; // Queue is empty

      const visit = await tx.visit.update({
        where: { id: oldestWaiting.id },
        data: {
          currentState: 'IN_SERVICE',
          serviceStart: new Date(),
          operatorId,
        }
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CALLED',
          payload: { visitId: visit.id, queueId, tenantId: visit.tenantId, displayId: visit.displayId }
        }
      });

      return visit;
    });
  }

  async checkIn(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);
    if (visit.currentState === 'CHECKED_IN' || visit.currentState === 'IN_SERVICE' || visit.currentState === 'COMPLETED') {
      throw new ConflictException(`Visit is already ${visit.currentState.toLowerCase()}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.visit.update({
        where: { id },
        data: { currentState: 'CHECKED_IN', waitingStart: new Date() },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CHECKED_IN',
          payload: { visitId: updated.id, queueId: updated.queueId, tenantId: updated.tenantId }
        }
      });

      return updated;
    });
  }

  async startService(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);
    if (visit.currentState === 'IN_SERVICE' || visit.currentState === 'COMPLETED') {
      throw new ConflictException(`Visit is already ${visit.currentState.toLowerCase()}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.visit.update({
        where: { id },
        data: { currentState: 'IN_SERVICE', serviceStart: new Date() },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CALLED',
          payload: { visitId: updated.id, queueId: updated.queueId, tenantId: updated.tenantId }
        }
      });

      return updated;
    });
  }

  async completeService(id: string, tenantId?: string, operatorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({ where: { id } });
      if (!visit) throw new NotFoundException('Visit not found');
      
      if (tenantId && visit.tenantId !== tenantId) {
        throw new NotFoundException('Visit not found');
      }

      if (visit.currentState === 'COMPLETED' || visit.currentState === 'MISSED') {
        throw new BadRequestException('Visit is already completed or missed');
      }

      const updated = await tx.visit.update({
        where: { id },
        data: {
          currentState: 'COMPLETED',
          completedAt: new Date(),
          serviceEnd: new Date(),
          operatorId: operatorId || visit.operatorId,
        }
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_COMPLETED',
          payload: { visitId: updated.id, queueId: updated.queueId, tenantId: updated.tenantId }
        }
      });

      return updated;
    });
  }

  async skipVisit(visitId: string) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({ where: { id: visitId } });
      if (!visit) throw new NotFoundException('Visit not found');

      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          currentState: 'MISSED',
          completedAt: new Date(),
        }
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_MISSED',
          payload: { visitId: updated.id, queueId: updated.queueId, tenantId: updated.tenantId }
        }
      });

      return updated;
    });
  }
}
