import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createStaffDto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: {
        ...createStaffDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, locationId?: string) {
    return this.prisma.staff.findMany({
      where: {
        tenantId,
        ...(locationId && { locationId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId },
    });
    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }
    return staff;
  }

  async update(id: string, tenantId: string, updateStaffDto: UpdateStaffDto) {
    await this.findOne(id, tenantId); // verify exists
    return this.prisma.staff.update({
      where: { id },
      data: updateStaffDto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // verify exists
    return this.prisma.staff.delete({
      where: { id },
    });
  }
}
