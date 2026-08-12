import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';

@Injectable()
export class VisitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVisitDto: CreateVisitDto) {
    return this.prisma.visit.create({
      data: createVisitDto,
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.visit.findMany({
      where: { tenantId },
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
      include: {
        customer: true,
        service: true,
        location: true,
      },
    });

    if (!visit) {
      throw new NotFoundException(`Visit with ID ${id} not found`);
    }

    return visit;
  }

  async update(id: string, tenantId: string, updateVisitDto: UpdateVisitDto) {
    // Ensure visit exists
    await this.findOne(id, tenantId);

    return this.prisma.visit.update({
      where: { id },
      data: updateVisitDto,
    });
  }

  async remove(id: string, tenantId: string) {
    // Ensure visit exists
    await this.findOne(id, tenantId);

    return this.prisma.visit.delete({
      where: { id },
    });
  }

  async checkIn(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);

    if (
      visit.currentState === 'CHECKED_IN' ||
      visit.currentState === 'IN_SERVICE' ||
      visit.currentState === 'COMPLETED'
    ) {
      throw new ConflictException(
        `Visit is already ${visit.currentState.toLowerCase()}`,
      );
    }

    return this.prisma.visit.update({
      where: { id },
      data: {
        currentState: 'CHECKED_IN',
        waitingStart: new Date(),
      },
    });
  }

  async startService(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);

    if (
      visit.currentState === 'IN_SERVICE' ||
      visit.currentState === 'COMPLETED'
    ) {
      throw new ConflictException(
        `Visit is already ${visit.currentState.toLowerCase()}`,
      );
    }

    return this.prisma.visit.update({
      where: { id },
      data: {
        currentState: 'IN_SERVICE',
        serviceStart: new Date(),
      },
    });
  }

  async completeService(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);

    if (visit.currentState === 'COMPLETED') {
      throw new ConflictException('Visit is already completed');
    }

    return this.prisma.visit.update({
      where: { id },
      data: {
        currentState: 'COMPLETED',
        serviceEnd: new Date(),
      },
    });
  }
}
