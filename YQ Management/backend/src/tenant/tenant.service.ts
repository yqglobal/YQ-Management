import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupGhostTenants() {
    this.logger.log('Running ghost tenant cleanup job...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const ghostTenants = await this.prisma.tenant.findMany({
      where: {
        name: 'My Company',
        createdAt: { lt: twentyFourHoursAgo },
        users: { none: {} },
        
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
    const cacheKey = `tenant:subdomain:${subdomain}`;
    try {
      const cached = await this.redisService.client.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      this.logger.warn(`Failed to read tenant cache for ${subdomain}`);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        locations: {
          select: { id: true, name: true, address: true, city: true },
        },
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with subdomain ${subdomain} not found`,
      );
    }

    // Enforce customBranding feature toggle
    const plan = tenant.subscriptions?.[0]?.plan;
    const hasCustomBranding = plan?.features
      ? (plan.features as any).customBranding === true
      : false;

    if (!hasCustomBranding) {
      tenant.branding = null;
    }

    (tenant as any).planFeatures = { customBranding: hasCustomBranding };

    try {
      await this.redisService.client.set(
        cacheKey,
        JSON.stringify(tenant),
        'EX',
        60,
      );
    } catch (e) {
      this.logger.warn(`Failed to set tenant cache for ${subdomain}`);
    }

    return tenant;
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        locations: { select: { id: true, name: true } },
        services: { select: { id: true, name: true } },
        queues: {
          select: { id: true, name: true, locationId: true, services: { select: { id: true } } },
        },
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Enforce customBranding feature toggle
    const subscription = tenant.subscriptions?.[0];
    const plan = subscription?.plan;

    // Parse features if stored as string
    let planFeatures = plan?.features as any;
    if (typeof planFeatures === 'string') {
      try {
        planFeatures = JSON.parse(planFeatures);
      } catch (e) {
        planFeatures = {};
      }
    }

    const isTrial = subscription?.status === 'TRIAL';
    const hasCustomBranding = isTrial || planFeatures?.customBranding === true;

    if (!hasCustomBranding) {
      tenant.branding = null;
    }

    (tenant as any).planFeatures = { customBranding: hasCustomBranding };

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

  async updateTenant(
    id: string,
    data: {
      name?: string;
      branding?: any;
      customerExperience?: any;
      subdomain?: string;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Validate subdomain uniqueness if being changed
    if (data.subdomain && data.subdomain !== tenant.subdomain) {
      const normalized = data.subdomain
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-');
      const existing = await this.prisma.tenant.findFirst({
        where: { subdomain: normalized, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          `The subdomain "${normalized}" is already taken. Please choose another.`,
        );
      }
      data.subdomain = normalized;
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subdomain !== undefined) updateData.subdomain = data.subdomain;
    if (data.branding !== undefined) updateData.branding = data.branding;
    if (data.customerExperience !== undefined)
      updateData.customerExperience = data.customerExperience;

    return this.prisma.tenant.update({
      where: { id },
      data: updateData,
    });
  }

  async exportData(tenantId: string) {
    this.logger.log(`Exporting data for tenant ${tenantId}`);

    // Fetch all relevant data for the tenant
    const [
      tenant,
      workspaces,
      users,
      locations,
      staff,
      services,
      queues,
      customers,
      visits,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      [] /* this.prisma.workspace.findMany({ where: { tenantId } }) */,
      this.prisma.user.findMany({
        where: { tenantId },
        select: { id: true, email: true, role: true },
      }), // Omit password/googleId
      this.prisma.location.findMany({ where: { tenantId } }),
      this.prisma.staff.findMany({ where: { tenantId } }),
      this.prisma.service.findMany({ where: { tenantId } }),
      this.prisma.queue.findMany({ where: { tenantId } }),
      this.prisma.customer.findMany({ where: { tenantId } }),
      this.prisma.visit.findMany({ where: { tenantId } }),
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
      visits,
    };
  }
}
