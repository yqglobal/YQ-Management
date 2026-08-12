import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupGhostTenants() {
    this.logger.log('Running ghost tenant cleanup job...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const ghostTenants = await this.prisma.tenant.findMany({
      where: {
        name: 'My Company',
        createdAt: { lt: twentyFourHoursAgo },
        users: { none: {} },
        workspaces: { none: {} },
        queues: { none: {} },
      },
    });

    if (ghostTenants.length > 0) {
      const ids = ghostTenants.map((t) => t.id);
      await this.prisma.tenant.deleteMany({
        where: { id: { in: ids } },
      });
      this.logger.log(`Cleaned up ${ghostTenants.length} ghost tenants.`);
    } else {
      this.logger.log('No ghost tenants found.');
    }
  }

  async getTenantBySubdomain(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with subdomain ${subdomain} not found`,
      );
    }

    return tenant;
  }

  async createTenant(data: {
    name: string;
    subdomain: string;
    branding?: any;
  }) {
    return this.prisma.tenant.create({
      data,
    });
  }

  async getAllTenants() {
    return this.prisma.tenant.findMany();
  }

  async updateTenant(id: string, data: { name?: string; branding?: any }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        branding: data.branding !== undefined ? data.branding : undefined,
      },
    });
  }

  async exportData(tenantId: string) {
    this.logger.log(`Exporting data for tenant ${tenantId}`);
    
    // Fetch all relevant data for the tenant
    const [tenant, workspaces, users, locations, staff, services, queues, customers, visits] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.workspace.findMany({ where: { tenantId } }),
      this.prisma.user.findMany({ where: { tenantId }, select: { id: true, email: true, role: true } }), // Omit password/googleId
      this.prisma.location.findMany({ where: { tenantId } }),
      this.prisma.staff.findMany({ where: { tenantId } }),
      this.prisma.service.findMany({ where: { tenantId } }),
      this.prisma.queue.findMany({ where: { tenantId } }),
      this.prisma.customer.findMany({ where: { tenantId } }),
      this.prisma.visit.findMany({ where: { tenantId } })
    ]);

    return {
      exportDate: new Date().toISOString(),
      tenant,
      workspaces,
      users,
      locations,
      staff,
      services,
      queues,
      customers,
      visits
    };
  }
}
