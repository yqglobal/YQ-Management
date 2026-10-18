import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INDUSTRY_TEMPLATES } from '../service-flow/industry-templates';
import { BUSINESS_CATALOG } from '../service-flow/business-catalog';

export interface OnboardingServiceItem {
  name: string;
  description?: string;
  expectedDuration?: number;
  allowAppointments?: boolean;
  seedFlow?: boolean; // Whether to apply the industry flow template to this service
}

export interface OnboardingLocationPayload {
  name: string;
  address?: string;
  businessType: string;
  blueprintKey?: string;
  enableWaitlist?: boolean;
  operatingMode?: string;
  services: OnboardingServiceItem[];
}

export interface MultiLocationProvisionPayload {
  locations: OnboardingLocationPayload[];
  planId?: string;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  getIndustries() {
    return INDUSTRY_TEMPLATES.map((t) => ({
      id: t.key,
      title: t.name,
      description: t.description,
      industry: t.industry,
      services: t.steps.map((s) => ({
        name: s.name,
        formConfig: [],
      })),
      blueprintKey: t.key,
    }));
  }

  getBusinessCatalog() {
    return BUSINESS_CATALOG.map((industry) => ({
      key: industry.key,
      name: industry.name,
      description: industry.description,
      icon: industry.icon,
      subTypes: industry.subTypes.map((sub) => ({
        key: sub.key,
        name: sub.name,
        description: sub.description,
        services: sub.services,
        flowTemplateKey: sub.flowTemplateKey,
      })),
    }));
  }

  /**
   * Check which plan best fits the user's intended resource usage.
   * Returns sorted plan fit results from cheapest to most expensive.
   */
  async checkPlanFit(totalLocations: number, totalServices: number) {
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });

    const results = plans.map((plan) => {
      let limits: Record<string, any> = {};
      try {
        limits =
          typeof plan.limits === 'string'
            ? JSON.parse(plan.limits)
            : (plan.limits as any) || {};
      } catch {
        limits = {};
      }

      const maxLocations = limits.maxLocations ?? Infinity;
      const maxServices = limits.maxServices ?? Infinity;
      const fitsLocations = totalLocations <= maxLocations;
      const fitsServices = totalServices <= maxServices;
      const fits = fitsLocations && fitsServices;
      const isTrial = plan.price === 0 || plan.type === 'TRIAL';

      return {
        plan: {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          price: plan.price,
          currency: plan.currency,
          limits,
          features: plan.features,
          sortOrder: plan.sortOrder,
        },
        fits,
        fitsLocations,
        fitsServices,
        isTrial,
        shortfall: {
          locations: Math.max(
            0,
            totalLocations - (maxLocations === Infinity ? 0 : maxLocations),
          ),
          services: Math.max(
            0,
            totalServices - (maxServices === Infinity ? 0 : maxServices),
          ),
        },
      };
    });

    const recommendedResult = results.find((r) => r.fits);
    const trialFits = results.find((r) => r.isTrial && r.fits) !== undefined;

    return {
      requirements: { locations: totalLocations, services: totalServices },
      trialFits,
      recommendedPlanId: recommendedResult?.plan.id ?? null,
      plans: results,
    };
  }

  /**
   * Provision multiple locations at once (new multi-location provisioning).
   * Validates plan quota limits against live DB plan configuration.
   * Activates trial subscription if plan is trial/free.
   * Returns a map of { locationId, serviceIds[], blueprintKeysApplied[] } per location.
   */
  async provisionMulti(
    tenantId: string,
    payload: MultiLocationProvisionPayload,
  ) {
    if (!payload.locations?.length) {
      throw new BadRequestException('At least one location is required.');
    }

    const totalLocations = payload.locations.length;
    const totalServices = payload.locations.reduce(
      (sum, loc) => sum + (loc.services?.length || 0),
      0,
    );

    // Resolve target plan for validation and subscription assignment
    let plan = payload.planId
      ? await this.prisma.plan.findUnique({ where: { id: payload.planId } })
      : null;

    if (!plan) {
      // Default to the active trial plan if none specified
      plan = await this.prisma.plan.findFirst({
        where: {
          active: true,
          OR: [{ price: 0 }, { type: 'TRIAL' }],
        },
        orderBy: { sortOrder: 'asc' },
      });
    }

    if (plan) {
      let limits: Record<string, any> = {};
      try {
        limits =
          typeof plan.limits === 'string'
            ? JSON.parse(plan.limits)
            : (plan.limits as any) || {};
      } catch {
        limits = {};
      }

      const maxLocations = limits.maxLocations ?? Infinity;
      const maxServices = limits.maxServices ?? Infinity;

      if (totalLocations > maxLocations) {
        throw new BadRequestException(
          `Your setup has ${totalLocations} location(s), but the selected plan (${plan.name}) allows a maximum of ${maxLocations}. Please choose a plan that accommodates your setup or reduce the number of locations.`,
        );
      }

      if (totalServices > maxServices) {
        throw new BadRequestException(
          `Your setup has ${totalServices} service(s), but the selected plan (${plan.name}) allows a maximum of ${maxServices}. Please choose a plan that accommodates your setup or deselect some services.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Assign or update subscription for this tenant if plan was determined
      if (plan) {
        const isTrial = plan.price === 0 || plan.type === 'TRIAL';
        const now = new Date();
        const trialEndDate = isTrial
          ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          : null;

        await tx.subscription.upsert({
          where: { tenantId },
          create: {
            tenantId,
            planId: plan.id,
            status: isTrial ? 'TRIAL' : 'ACTIVE',
            trialStartDate: isTrial ? now : null,
            trialEndDate,
            currentPeriodStart: now,
            currentPeriodEnd:
              trialEndDate ||
              new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
          update: {
            planId: plan.id,
            status: isTrial ? 'TRIAL' : 'ACTIVE',
            trialStartDate: isTrial ? now : undefined,
            trialEndDate,
            currentPeriodEnd:
              trialEndDate ||
              new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const provisionedLocations: Array<{
        locationId: string;
        locationName: string;
        serviceIds: string[];
        serviceIdsWithFlow: string[];
        blueprintKey: string | null;
      }> = [];

      for (const locPayload of payload.locations) {
        // 2. Create Location
        const location = await tx.location.create({
          data: {
            tenantId,
            name: locPayload.name,
            address: locPayload.address,
          },
        });

        const serviceIds: string[] = [];
        const serviceIdsWithFlow: string[] = [];

        // 3. Create Services and Queues
        for (const svc of locPayload.services) {
          const service = await tx.service.create({
            data: {
              tenantId,
              locationId: location.id,
              name: svc.name,
              description: svc.description || '',
              allowAppointments: svc.allowAppointments ?? true,
              expectedDuration: svc.expectedDuration ?? 30,
            },
          });

          serviceIds.push(service.id);
          if (svc.seedFlow) {
            serviceIdsWithFlow.push(service.id);
          }

          await tx.queue.create({
            data: {
              tenantId,
              locationId: location.id,
              name: `${svc.name} Desk`,
              status: 'ACTIVE',
              services: { connect: [{ id: service.id }] },
            },
          });
        }

        // 4. Update Tenant settings per-location business type (first location defines tenant defaults)
        if (provisionedLocations.length === 0) {
          const tenant = await tx.tenant.findUnique({
            where: { id: tenantId },
          });
          if (tenant) {
            const cx = (tenant.customerExperience as Record<string, any>) || {};
            cx.enableWaitlist = locPayload.enableWaitlist ?? true;

            // Find default staff layout for the selected business sub-type
            let staffViewLayout = null;
            for (const industry of BUSINESS_CATALOG) {
              const subType = industry.subTypes.find(
                (s) => s.key === locPayload.businessType,
              );
              if (subType?.defaultStaffLayout) {
                staffViewLayout = subType.defaultStaffLayout;
                break;
              }
            }

            const validModes = ['QUEUE_ONLY', 'APPOINTMENTS', 'JOURNEY'];
            const resolvedMode = validModes.includes(
              locPayload.operatingMode ?? '',
            )
              ? locPayload.operatingMode
              : tenant.operatingMode || 'QUEUE_ONLY';

            await tx.tenant.update({
              where: { id: tenantId },
              data: {
                customerExperience: cx,
                businessType: locPayload.businessType,
                operatingMode: resolvedMode as any,
                setupComplete: true,
                ...(staffViewLayout ? { staffViewLayout } : {}),
              },
            });
          }
        }

        provisionedLocations.push({
          locationId: location.id,
          locationName: locPayload.name,
          serviceIds,
          serviceIdsWithFlow,
          blueprintKey: locPayload.blueprintKey ?? null,
        });
      }

      return { success: true, locations: provisionedLocations };
    });
  }

  /**
   * Legacy single-location provision for backward compatibility.
   */
  async provision(
    tenantId: string,
    payload: {
      locationName: string;
      locationAddress?: string;
      services: any[];
      templateId?: string;
      blueprintKey?: string;
      operatingMode: string;
      enableWaitlist: boolean;
      businessType: string;
      planId?: string;
    },
  ) {
    // Delegate to multi-location with single location
    const result = await this.provisionMulti(tenantId, {
      planId: payload.planId,
      locations: [
        {
          name: payload.locationName,
          address: payload.locationAddress,
          businessType: payload.businessType,
          blueprintKey: payload.blueprintKey,
          operatingMode: payload.operatingMode,
          enableWaitlist: payload.enableWaitlist,
          services: payload.services.map((s) => ({
            ...s,
            seedFlow: Boolean(payload.blueprintKey),
          })),
        },
      ],
    });

    // Return legacy shape
    const firstLoc = result.locations[0];
    return {
      success: result.success,
      serviceIds: firstLoc?.serviceIds ?? [],
      serviceIdsWithFlow: firstLoc?.serviceIdsWithFlow ?? [],
      locationId: firstLoc?.locationId,
    };
  }
}
