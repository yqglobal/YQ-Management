import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PoliciesService {
  constructor(private prisma: PrismaService) {}

  async acceptPolicy(userId: string, policyType: any, version: string, ipAddress?: string, userAgent?: string) {
    // Upsert or find the policy
    let policy = await this.prisma.extendedClient.policy.findUnique({
      where: { type_version: { type: policyType, version } }
    });

    if (!policy) {
      policy = await this.prisma.extendedClient.policy.create({
        data: {
          type: policyType,
          version,
          content: 'Auto-generated policy reference',
          active: true,
        }
      });
    }

    // Record acceptance
    return this.prisma.extendedClient.policyAcceptance.create({
      data: {
        userId,
        policyId: policy.id,
        ipAddress,
        userAgent,
      }
    });
  }

  async saveCookiePreferences(userId: string | undefined, anonymousId: string | undefined, preferences: any, ipAddress?: string, userAgent?: string) {
    if (userId) {
      // Find existing
      const existing = await this.prisma.extendedClient.cookiePreference.findFirst({
        where: { userId }
      });
      
      if (existing) {
        return this.prisma.extendedClient.cookiePreference.update({
          where: { id: existing.id },
          data: { ...preferences, ipAddress, userAgent }
        });
      } else {
        return this.prisma.extendedClient.cookiePreference.create({
          data: { userId, ...preferences, ipAddress, userAgent }
        });
      }
    } else if (anonymousId) {
      const existing = await this.prisma.extendedClient.cookiePreference.findUnique({
        where: { anonymousId }
      });
      
      if (existing) {
        return this.prisma.extendedClient.cookiePreference.update({
          where: { id: existing.id },
          data: { ...preferences, ipAddress, userAgent }
        });
      } else {
        return this.prisma.extendedClient.cookiePreference.create({
          data: { anonymousId, ...preferences, ipAddress, userAgent }
        });
      }
    }
    throw new Error('Must provide userId or anonymousId');
  }
}
