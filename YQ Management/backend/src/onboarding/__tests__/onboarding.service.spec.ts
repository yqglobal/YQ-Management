import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from '../onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: any;

  const mockPlans = [
    {
      id: 'plan-trial',
      name: 'Starter (14 Days Trial)',
      type: 'TRIAL',
      price: 0,
      currency: 'ZAR',
      active: true,
      sortOrder: 1,
      limits: JSON.stringify({
        maxLocations: 1,
        maxServices: 5,
        maxStaff: 3,
        maxQueues: 5,
      }),
    },
    {
      id: 'plan-standard',
      name: 'Standard Plan',
      type: 'STANDARD',
      price: 79900,
      currency: 'ZAR',
      active: true,
      sortOrder: 2,
      limits: JSON.stringify({
        maxLocations: 1,
        maxServices: 5,
        maxStaff: 5,
        maxQueues: 5,
      }),
    },
    {
      id: 'plan-premium',
      name: 'Premium Plan',
      type: 'PREMIUM',
      price: 164900,
      currency: 'ZAR',
      active: true,
      sortOrder: 3,
      limits: JSON.stringify({
        maxLocations: 3,
        maxServices: 20,
        maxStaff: 20,
        maxQueues: 20,
      }),
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise Plan',
      type: 'ENTERPRISE',
      price: 499999,
      currency: 'ZAR',
      active: true,
      sortOrder: 4,
      limits: JSON.stringify({
        maxLocations: 10,
        maxServices: 100,
        maxStaff: 100,
        maxQueues: 100,
      }),
    },
  ];

  beforeEach(async () => {
    prisma = {
      plan: {
        findMany: jest.fn().mockResolvedValue(mockPlans),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return mockPlans.find((p) => p.id === where.id) || null;
        }),
        findFirst: jest.fn().mockImplementation(() => mockPlans[0]),
      },
      tenant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-1', operatingMode: 'QUEUE_ONLY' }),
        update: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      location: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'loc-1', name: 'Main Branch' }),
      },
      service: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'svc-1', name: 'Consultation' }),
      },
      queue: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'q-1', name: 'Consultation Desk' }),
      },
      subscription: {
        upsert: jest.fn().mockResolvedValue({ id: 'sub-1', status: 'TRIAL' }),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  describe('checkPlanFit', () => {
    it('fits trial plan when requirements are 1 location and 3 services (within dynamic limit of 5)', async () => {
      const res = await service.checkPlanFit(1, 3);
      expect(res.trialFits).toBe(true);
      expect(res.recommendedPlanId).toBe('plan-trial');
      expect(res.plans[0].fits).toBe(true);
      expect(res.plans[0].isTrial).toBe(true);
    });

    it('fits trial plan when requirements are exactly 1 location and 5 services', async () => {
      const res = await service.checkPlanFit(1, 5);
      expect(res.trialFits).toBe(true);
      expect(res.recommendedPlanId).toBe('plan-trial');
    });

    it('does not fit trial when user selects 6 services for 1 location (exceeds trial maxServices of 5)', async () => {
      const res = await service.checkPlanFit(1, 6);
      expect(res.trialFits).toBe(false);
      // Premium is the first plan that accommodates 6 services (limit: 20)
      expect(res.recommendedPlanId).toBe('plan-premium');
      expect(res.plans[0].fits).toBe(false); // Trial doesn't fit
      expect(res.plans[0].shortfall.services).toBe(1);
    });

    it('does not fit trial when user adds 2 locations (exceeds trial maxLocations of 1)', async () => {
      const res = await service.checkPlanFit(2, 3);
      expect(res.trialFits).toBe(false);
      // Premium accommodates up to 3 locations
      expect(res.recommendedPlanId).toBe('plan-premium');
      expect(res.plans[0].fits).toBe(false);
      expect(res.plans[0].shortfall.locations).toBe(1);
    });
  });

  describe('provisionMulti', () => {
    it('throws BadRequestException when no locations provided', async () => {
      await expect(
        service.provisionMulti('tenant-1', { locations: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when selected setup exceeds plan limits', async () => {
      await expect(
        service.provisionMulti('tenant-1', {
          planId: 'plan-trial', // Trial limit: 5 services, 1 location
          locations: [
            {
              name: 'Branch A',
              businessType: 'general_practice',
              services: [
                { name: 'S1' },
                { name: 'S2' },
                { name: 'S3' },
                { name: 'S4' },
                { name: 'S5' },
                { name: 'S6' }, // 6 services exceeds 5
              ],
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('provisions atomically and creates trial subscription within limits', async () => {
      const res = await service.provisionMulti('tenant-1', {
        planId: 'plan-trial',
        locations: [
          {
            name: 'Downtown Dental',
            address: '42 Main St',
            businessType: 'dental_clinic',
            blueprintKey: 'healthcare',
            services: [
              { name: 'Check-up', seedFlow: true },
              { name: 'Cleaning', seedFlow: true },
            ],
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.locations).toHaveLength(1);
      expect(res.locations[0].serviceIds).toHaveLength(2);
      expect(res.locations[0].serviceIdsWithFlow).toHaveLength(2);

      // Verify subscription upsert was called with trial status
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          create: expect.objectContaining({
            planId: 'plan-trial',
            status: 'TRIAL',
          }),
        }),
      );

      // Verify tenant was updated with setupComplete: true
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({
            setupComplete: true,
          }),
        }),
      );
    });
  });
});
