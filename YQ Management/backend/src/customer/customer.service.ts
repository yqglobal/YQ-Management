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
    return this.prisma.extendedClient.customer.findMany({
      where: { tenantId },
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
