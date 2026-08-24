import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getAudienceCounts() {
    const totalTenants = await this.prisma.user.count({ where: { role: 'TENANT_ADMIN' } });
    const subscribers = await this.prisma.marketingSubscriber.count({ where: { active: true } });
    
    // Break down tenants by plan status
    const tenantSubscriptions = await this.prisma.subscription.findMany({
      select: { status: true, plan: { select: { name: true } } },
    });

    const planBreakdown = tenantSubscriptions.reduce((acc, sub) => {
      acc[sub.plan.name] = (acc[sub.plan.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTenants,
      subscribers,
      planBreakdown,
    };
  }

  async sendCampaign(audience: string, subject: string, htmlContent: string) {
    let emails: string[] = [];

    if (audience === 'ALL_TENANTS' || audience === 'ALL') {
      const users = await this.prisma.user.findMany({
        where: { role: 'TENANT_ADMIN' },
        select: { email: true },
      });
      emails = emails.concat(users.map(u => u.email));
    }

    if (audience === 'SUBSCRIBERS' || audience === 'ALL') {
      const subs = await this.prisma.marketingSubscriber.findMany({
        where: { active: true },
        select: { email: true },
      });
      emails = emails.concat(subs.map(s => s.email));
    }

    if (audience.startsWith('PLAN_')) {
      const planName = audience.replace('PLAN_', '');
      const subs = await this.prisma.subscription.findMany({
        where: { plan: { name: planName } },
        select: { tenant: { select: { users: { where: { role: 'TENANT_ADMIN' }, select: { email: true } } } } },
      });
      subs.forEach(s => {
        if (s.tenant) {
          s.tenant.users.forEach(u => emails.push(u.email));
        }
      });
    }

    // Deduplicate emails
    emails = [...new Set(emails)];

    if (emails.length === 0) {
      return { success: false, message: 'No recipients found for this audience' };
    }

    return this.emailService.sendMarketingEmail(emails, subject, htmlContent);
  }

  async addSubscriber(email: string, name?: string) {
    return this.prisma.marketingSubscriber.upsert({
      where: { email },
      update: { active: true, name },
      create: { email, name, source: 'WEBSITE' },
    });
  }

  async unsubscribe(email: string) {
    return this.prisma.marketingSubscriber.update({
      where: { email },
      data: { active: false },
    });
  }
}
