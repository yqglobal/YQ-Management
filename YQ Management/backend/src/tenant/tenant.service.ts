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
import { ServiceService } from '../service/service.service';
import { ServiceFlowService } from '../service-flow/service-flow.service';
import { BUSINESS_CATALOG } from '../service-flow/business-catalog';
import { ChangeIndustryDto } from './dto/change-industry.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => ServiceService))
    private readonly serviceService: ServiceService,
    @Inject(forwardRef(() => ServiceFlowService))
    private readonly serviceFlowService: ServiceFlowService,
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
          include: { plan: true },
        },
        paymentAccount: {
          select: { connectedAccountId: true, chargesEnabled: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with subdomain ${subdomain} not found`,
      );
    }

    // Enforce customBranding feature toggle
    const sub = tenant.subscriptions;
    const plan = sub?.plan;
    const hasCustomBranding = plan?.features
      ? (plan.features as any).customBranding === true
      : false;

    if (!hasCustomBranding) {
      tenant.branding = null;
    }

    const isSubscriptionActive =
      sub && (sub.status === 'ACTIVE' || sub.status === 'TRIAL');

    (tenant as any).planFeatures = { customBranding: hasCustomBranding };
    (tenant as any).isPaused = !isSubscriptionActive;

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
          select: {
            id: true,
            name: true,
            locationId: true,
            services: { select: { id: true } },
          },
        },
        invitations: { select: { id: true, email: true } },
        subscriptions: {
          include: { plan: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Enforce customBranding feature toggle
    const subscription = tenant.subscriptions;
    const plan = subscription?.plan;

    let planFeatures = plan?.features as any;
    if (typeof planFeatures === 'string') {
      try {
        planFeatures = JSON.parse(planFeatures);
      } catch (e) {
        planFeatures = {};
      }
    }

    if (typeof tenant.customerExperience === 'string') {
      try {
        (tenant as any).customerExperience = JSON.parse(
          tenant.customerExperience,
        );
      } catch (e) {}
    }

    if (typeof tenant.chatbotConfig === 'string') {
      try {
        (tenant as any).chatbotConfig = JSON.parse(tenant.chatbotConfig);
      } catch (e) {}
    }

    if (typeof tenant.branding === 'string') {
      try {
        (tenant as any).branding = JSON.parse(tenant.branding);
      } catch (e) {}
    }

    const isTrial = subscription?.status === 'TRIAL';
    const hasCustomBranding = isTrial || planFeatures?.customBranding === true;

    if (!hasCustomBranding) {
      tenant.branding = null;
    }

    const isSubscriptionActive =
      subscription &&
      (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL');

    (tenant as any).planFeatures = { customBranding: hasCustomBranding };
    (tenant as any).isPaused = !isSubscriptionActive;

    return tenant;
  }

  async getTenantRecentlyCalledTokens(tenantId: string) {
    return this.prisma.visit.findMany({
      where: {
        tenantId,
        currentState: { in: ['IN_SERVICE', 'COMPLETED', 'NO_SHOW'] },
        serviceStart: { not: null },
      },
      include: {
        customer: { select: { name: true } },
        queue: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { serviceStart: 'desc' },
      take: 10,
    });
  }

  async getTenantUpcomingTokens(tenantId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const visits = await this.prisma.visit.findMany({
      where: {
        tenantId,
        OR: [
          {
            currentState: { in: ['WAITING', 'CHECKED_IN'] },
          },
          {
            currentState: { in: ['SCHEDULED', 'CREATED', 'PENDING_PAYMENT'] },
            scheduledTime: { gte: todayStart, lte: todayEnd },
          },
        ],
      },
      include: {
        customer: { select: { name: true } },
        queue: { select: { name: true } },
        service: {
          select: {
            name: true,
            expectedDuration: true,
            emaExpectedDuration: true,
          },
        },
      },
      take: 30,
    });

    return visits.sort((a, b) => {
      const timeA = a.scheduledTime
        ? new Date(a.scheduledTime).getTime()
        : new Date(a.waitingStart || a.createdAt).getTime();
      const timeB = b.scheduledTime
        ? new Date(b.scheduledTime).getTime()
        : new Date(b.waitingStart || b.createdAt).getTime();

      if ((b.priority || 0) !== (a.priority || 0)) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return timeA - timeB;
    });
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
      chatbotEnabled?: boolean;
      chatbotConfig?: any;
      businessType?: string;
      strictPrivacyMode?: boolean;
      aiConfig?: any;
      supportEmail?: string | null;
      supportPhone?: string | null;
      showSupportInfo?: boolean;
      selfServeModeEnabled?: boolean;
      selfServeOtpEnabled?: boolean;
      setupComplete?: boolean;
      operatingMode?: any;
      staffViewLayout?: any;
      taxConfig?: any;
      invoicePrefix?: string;
      invoiceCounter?: number;
      whatsappProvider?: any;
      metaCloudAccountId?: string;
      metaCloudPhoneNumberId?: string;
      metaCloudToken?: string;
      whatsappConnected?: boolean;
      whatsappInstanceId?: string;
      whatsappPhone?: string;
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
    if (data.chatbotEnabled !== undefined)
      updateData.chatbotEnabled = data.chatbotEnabled;
    if (data.chatbotConfig !== undefined)
      updateData.chatbotConfig = data.chatbotConfig;
    if (data.businessType !== undefined)
      updateData.businessType = data.businessType;
    if (data.operatingMode !== undefined)
      updateData.operatingMode = data.operatingMode;
    if (data.staffViewLayout !== undefined)
      updateData.staffViewLayout = data.staffViewLayout;
    if (data.strictPrivacyMode !== undefined)
      updateData.strictPrivacyMode = data.strictPrivacyMode;
    if (data.aiConfig !== undefined) updateData.aiConfig = data.aiConfig;
    if (data.setupComplete !== undefined)
      updateData.setupComplete = data.setupComplete;

    if (data.supportEmail !== undefined)
      updateData.supportEmail = data.supportEmail;
    if (data.supportPhone !== undefined)
      updateData.supportPhone = data.supportPhone;
    if (data.showSupportInfo !== undefined)
      updateData.showSupportInfo = data.showSupportInfo;
    if (data.selfServeModeEnabled !== undefined)
      updateData.selfServeModeEnabled = data.selfServeModeEnabled;
    if (data.selfServeOtpEnabled !== undefined)
      updateData.selfServeOtpEnabled = data.selfServeOtpEnabled;

    if (data.taxConfig !== undefined) updateData.taxConfig = data.taxConfig;
    if (data.invoicePrefix !== undefined)
      updateData.invoicePrefix = data.invoicePrefix;
    if (data.invoiceCounter !== undefined)
      updateData.invoiceCounter = data.invoiceCounter;
    if (data.whatsappProvider !== undefined)
      updateData.whatsappProvider = data.whatsappProvider;
    if (data.metaCloudAccountId !== undefined)
      updateData.metaCloudAccountId = data.metaCloudAccountId;
    if (data.metaCloudPhoneNumberId !== undefined)
      updateData.metaCloudPhoneNumberId = data.metaCloudPhoneNumberId;
    if (data.metaCloudToken !== undefined)
      updateData.metaCloudToken = data.metaCloudToken;
    if (data.whatsappConnected !== undefined)
      updateData.whatsappConnected = data.whatsappConnected;
    if (data.whatsappInstanceId !== undefined)
      updateData.whatsappInstanceId = data.whatsappInstanceId;
    if (data.whatsappPhone !== undefined)
      updateData.whatsappPhone = data.whatsappPhone;

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

  async uploadLogo(
    tenantId: string,
    file: Express.Multer.File,
    baseUrl: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const sharp = require('sharp');
    const fs = require('fs');
    const path = require('path');

    const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const filename = `tenant-${tenantId}-${Date.now()}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Resize to max 256x256, maintain aspect ratio, convert to webp to save space
    await sharp(file.buffer)
      .resize({ width: 256, height: 256, fit: 'inside' })
      .webp({ quality: 80 })
      .toFile(filepath);

    const logoUrl = `${baseUrl}/uploads/logos/${filename}`;

    // Update tenant branding
    const branding = tenant.branding
      ? typeof tenant.branding === 'string'
        ? JSON.parse(tenant.branding)
        : tenant.branding
      : {};
    branding.logoUrl = logoUrl;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { branding },
    });

    return { logoUrl };
  }

  async getOnboardingState(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        locations: true,
        services: { include: { serviceFlow: { include: { steps: true } } } },
        queues: true,
        invitations: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [userCount, staffCount, flowCount, onlineVisitCount] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.staff.count({ where: { tenantId } }),
        this.prisma.serviceFlow.count({ where: { tenantId } }),
        this.prisma.visit.count({
          where: {
            tenantId,
            source: {
              in: ['ONLINE', 'QR_KIOSK', 'PORTAL', 'SELF_SERVE'] as any,
            },
          },
        }),
      ]);

    const hasJourney =
      flowCount > 0 ||
      tenant.services.some(
        (s) => (s as any).serviceFlow || (s as any).journeyStages,
      );

    const hasTeam =
      userCount > 1 ||
      staffCount > 0 ||
      (tenant.invitations && tenant.invitations.length > 0);

    const custExp =
      typeof tenant.customerExperience === 'object' &&
      tenant.customerExperience !== null
        ? (tenant.customerExperience as any)
        : {};

    const hasSharedQr = !!custExp.portalShared || onlineVisitCount > 0;

    return {
      queueCount: tenant.queues.length,
      serviceCount: tenant.services.length,
      locationCount: tenant.locations.length,
      staffCount: hasTeam ? 1 : 0,
      whatsappConnected:
        tenant.whatsappConnected ||
        !!tenant.whatsappInstanceId ||
        !!tenant.whatsappPhone,
      hasSharedQr,
      journeyCount: hasJourney ? 1 : 0,
      hasJourney,
      setupComplete: tenant.setupComplete,
    };
  }

  async getIndustryMigrationPreview(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, businessType: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const services = await this.prisma.service.findMany({
      where: { tenantId },
      include: {
        visits: {
          where: {
            currentState: {
              in: [
                'WAITING',
                'CHECKED_IN',
                'CALLED',
                'IN_SERVICE',
                'SERVING',
              ] as any,
            },
          },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const activeVisitsCount = services.reduce(
      (acc, s) => acc + s.visits.length,
      0,
    );

    const templateServices = services
      .filter(
        (s) =>
          s.description?.toLowerCase().includes('auto-provisioned') ||
          s.name.endsWith(' Service'),
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      }));

    const customServices = services
      .filter(
        (s) =>
          !s.description?.toLowerCase().includes('auto-provisioned') &&
          !s.name.endsWith(' Service'),
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      }));

    return {
      currentBusinessType: tenant.businessType || 'general',
      totalServices: services.length,
      templateServices,
      customServices,
      activeVisitsCount,
    };
  }

  async changeIndustry(tenantId: string, dto: ChangeIndustryDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // 1. Query current services
    const services = await this.prisma.service.findMany({
      where: { tenantId },
    });

    let removedCount = 0;

    // 2. Execute service strategy
    if (dto.serviceStrategy === 'REMOVE_TEMPLATE_ONLY') {
      const templateServices = services.filter(
        (s) =>
          s.description?.toLowerCase().includes('auto-provisioned') ||
          s.name.endsWith(' Service'),
      );
      for (const service of templateServices) {
        try {
          await this.serviceService.remove(
            service.id,
            tenantId,
            'delete_all',
            undefined,
            true, // keepHistory safely moves visits to Archived Services
          );
          removedCount++;
        } catch (err) {
          this.logger.error(
            `Error removing template service ${service.id}: ${err}`,
          );
        }
      }
    } else if (dto.serviceStrategy === 'DELETE_ALL') {
      for (const service of services) {
        try {
          await this.serviceService.remove(
            service.id,
            tenantId,
            'delete_all',
            undefined,
            true, // keepHistory safely moves visits to Archived Services
          );
          removedCount++;
        } catch (err) {
          this.logger.error(`Error removing service ${service.id}: ${err}`);
        }
      }
    }

    // 3. Find default staff view layout if mapped in BUSINESS_CATALOG
    let staffViewLayout: any = undefined;
    for (const ind of BUSINESS_CATALOG) {
      const sub = ind.subTypes?.find((s) => s.key === dto.newBusinessType);
      if (sub?.defaultStaffLayout) {
        staffViewLayout = sub.defaultStaffLayout;
        break;
      }
    }

    // 4. Update tenant businessType
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        businessType: dto.newBusinessType,
        ...(staffViewLayout ? { staffViewLayout } : {}),
      },
    });

    // Invalidate Redis caches
    try {
      if (tenant.subdomain) {
        await this.redisService.client.del(
          `tenant:subdomain:${tenant.subdomain}`,
        );
      }
      await this.redisService.client.del(`tenant:id:${tenantId}`);
    } catch (e) {
      this.logger.warn(`Failed to clear tenant cache for ${tenantId}`);
    }

    // 5. Auto-create initial service & flow blueprint if requested
    let createdServiceId: string | null = null;
    if (dto.provisionNewService !== false) {
      const location = await this.prisma.location.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });

      if (location) {
        let subLabel = dto.newBusinessType
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        let blueprintKey = 'general';

        for (const ind of BUSINESS_CATALOG) {
          const sub = ind.subTypes?.find((s) => s.key === dto.newBusinessType);
          if (sub) {
            subLabel = sub.name || sub.key;
            blueprintKey = sub.flowTemplateKey || 'general';
            break;
          }
        }

        try {
          const newService = await this.serviceService.create(tenantId, {
            name: `${subLabel} Service`,
            description: `Auto-provisioned for ${subLabel}`,
            locationId: location.id,
            expectedDuration: 20,
            allowAppointments: true,
          });

          if (newService?.id) {
            createdServiceId = newService.id;
            await this.serviceFlowService
              .applyIndustryTemplate(tenantId, newService.id, blueprintKey)
              .catch((err) =>
                this.logger.warn(
                  `Blueprint apply failed during changeIndustry: ${err}`,
                ),
              );
          }
        } catch (err) {
          this.logger.error(
            `Error auto-provisioning service for ${dto.newBusinessType}: ${err}`,
          );
        }
      }
    }

    return {
      success: true,
      businessType: updatedTenant.businessType,
      removedServicesCount: removedCount,
      createdServiceId,
    };
  }
}
