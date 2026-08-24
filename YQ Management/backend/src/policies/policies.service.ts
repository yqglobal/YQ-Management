import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class PoliciesService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async getAcceptedPolicies(userId: string) {
    return this.prisma.extendedClient.policyAcceptance.findMany({
      where: { userId },
      include: { policy: true },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  async acceptPolicy(
    userId: string,
    policyType: any,
    version: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Upsert or find the policy
    let policy = await this.prisma.extendedClient.policy.findUnique({
      where: { type_version: { type: policyType, version } },
    });

    if (!policy) {
      policy = await this.prisma.extendedClient.policy.create({
        data: {
          type: policyType,
          version,
          content: 'Auto-generated policy reference',
          active: true,
        },
      });
    }

    // Record acceptance
    const result = await this.prisma.extendedClient.policyAcceptance.create({
      data: {
        userId,
        policyId: policy.id,
        ipAddress,
        userAgent,
      },
    });

    // Check if both required policies are accepted
    const accepted = await this.getAcceptedPolicies(userId);
    const hasTos = accepted.some(
      (a: any) => a.policy.type === 'TERMS_OF_SERVICE',
    );
    const hasPrivacy = accepted.some(
      (a: any) => a.policy.type === 'PRIVACY_POLICY',
    );

    if (hasTos && hasPrivacy) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.tenantId && user.role === 'TENANT_ADMIN') {
        const sub = await this.prisma.subscription.findUnique({
          where: { tenantId: user.tenantId },
        });
        if (!sub) {
          const starterPlan = await this.prisma.plan.findFirst({
            where: { name: { contains: 'Starter' } },
          });
          if (starterPlan) {
            await this.subscriptionService.startFreeTrial(
              user.tenantId,
              starterPlan.id,
              starterPlan.trialDays || 14,
            );
          }
        }
      }
    }

    return result;
  }

  async saveCookiePreferences(
    userId: string | undefined,
    anonymousId: string | undefined,
    preferences: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (userId) {
      // Find existing
      const existing =
        await this.prisma.extendedClient.cookiePreference.findFirst({
          where: { userId },
        });

      if (existing) {
        return this.prisma.extendedClient.cookiePreference.update({
          where: { id: existing.id },
          data: { ...preferences, ipAddress, userAgent },
        });
      } else {
        return this.prisma.extendedClient.cookiePreference.create({
          data: { userId, ...preferences, ipAddress, userAgent },
        });
      }
    } else if (anonymousId) {
      const existing =
        await this.prisma.extendedClient.cookiePreference.findUnique({
          where: { anonymousId },
        });

      if (existing) {
        return this.prisma.extendedClient.cookiePreference.update({
          where: { id: existing.id },
          data: { ...preferences, ipAddress, userAgent },
        });
      } else {
        return this.prisma.extendedClient.cookiePreference.create({
          data: { anonymousId, ...preferences, ipAddress, userAgent },
        });
      }
    }
    throw new Error('Must provide userId or anonymousId');
  }
}
