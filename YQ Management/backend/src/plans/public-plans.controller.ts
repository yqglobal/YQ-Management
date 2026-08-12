import { Controller, Get, Logger } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('public/plans')
export class PublicPlansController {
  private readonly logger = new Logger(PublicPlansController.name);

  constructor(private readonly plansService: PlansService) {}

  @Get()
  async getActivePlans() {
    let plans = await this.plansService.listPlans('ACTIVE', 0, 50);
    if (!plans || plans.length === 0) {
      this.logger.log(
        'No active plans found in DB. Seeding default SaaS pricing plans...',
      );
      try {
        await this.plansService.createPlan({
          name: 'Starter (Free Trial)',
          description:
            'Perfect for small retail or single service point environments.',
          type: 'STANDARD',
          price: 0,
          currency: 'ZAR',
          billingInterval: 'monthly' as any,
          trialDays: 14,
          status: 'ACTIVE',
          sortOrder: 1,
          features: { whatsappNotifications: false },
          limits: { maxQueues: 1, maxTokens: 100 },
        });
        await this.plansService.createPlan({
          name: 'Standard Pro',
          description:
            'Ideal for busy clinics, restaurants, and customer service centers.',
          type: 'STANDARD',
          price: 499,
          currency: 'ZAR',
          billingInterval: 'monthly' as any,
          trialDays: 0,
          status: 'ACTIVE',
          sortOrder: 2,
          features: { whatsappNotifications: true },
          limits: { maxQueues: 5, maxTokens: 1000 },
        });
        await this.plansService.createPlan({
          name: 'Enterprise Network',
          description:
            'Comprehensive solution for healthcare networks and large retail chains.',
          type: 'ENTERPRISE',
          price: 1499,
          currency: 'ZAR',
          billingInterval: 'monthly' as any,
          trialDays: 0,
          status: 'ACTIVE',
          sortOrder: 3,
          features: { whatsappNotifications: true },
          limits: { maxQueues: 20, maxTokens: 10000 },
        });
        plans = await this.plansService.listPlans('ACTIVE', 0, 50);
      } catch (error) {
        this.logger.error(
          'Failed to auto-seed default SaaS plans',
          error as Error,
        );
      }
    }
    return plans;
  }
}
