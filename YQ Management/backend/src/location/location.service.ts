import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class LocationService {
  constructor(
    private prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async create(
    tenantId: string,
    data: { name: string; address?: string; city?: string },
  ) {
    const currentLocationsCount =
      await this.prisma.extendedClient.location.count({
        where: { tenantId },
      });

    await this.subscriptionService.checkLimit(
      tenantId,
      'locations',
      currentLocationsCount,
    );

    return this.prisma.extendedClient.location.create({
      data: {
        tenantId,
        name: data.name,
        address: data.address,
        city: data.city,
      },
    });
  }

  async findAll(tenantId: string, reqUser?: any) {
    const where: any = { tenantId };

    if (reqUser && (reqUser.role === 'OPERATOR' || reqUser.role === 'MANAGER')) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: reqUser.userId || reqUser.sub },
      });
      if (dbUser && dbUser.allowedLocationIds) {
        if (dbUser.allowedLocationIds.length > 0) {
          where.id = { in: dbUser.allowedLocationIds };
        } else {
          where.id = { in: [] };
        }
      }
    }

    return this.prisma.extendedClient.location.findMany({
      where,
      include: { services: true },
    });
  }

  async findOne(id: string, tenantId: string, reqUser?: any) {
    const where: any = { id, tenantId };

    if (reqUser && (reqUser.role === 'OPERATOR' || reqUser.role === 'MANAGER')) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: reqUser.userId || reqUser.sub },
      });
      if (dbUser && dbUser.allowedLocationIds) {
        if (dbUser.allowedLocationIds.length > 0) {
          if (!dbUser.allowedLocationIds.includes(id)) {
            throw new NotFoundException('Location not found');
          }
        } else {
          throw new NotFoundException('Location not found');
        }
      }
    }

    const location = await this.prisma.extendedClient.location.findFirst({
      where,
      include: { services: true },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(
    id: string,
    tenantId: string,
    data: { name?: string; address?: string; city?: string },
  ) {
    return this.prisma.extendedClient.location
      .update({
        where: { id_tenantId: { id, tenantId } },
        data,
      })
      .catch(async (e: any) => {
        // Safe update
        const exists = await this.findOne(id, tenantId);
        return this.prisma.extendedClient.location.update({
          where: { id: exists.id },
          data,
        });
      });
  }

  async remove(id: string, tenantId: string) {
    const exists = await this.findOne(id, tenantId);
    return this.prisma.extendedClient.location.delete({
      where: { id: exists.id },
    });
  }
}
