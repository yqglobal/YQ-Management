import { Test, TestingModule } from '@nestjs/testing';
import { VisitStepService } from '../visit-step.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('VisitStepService', () => {
  let service: VisitStepService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaMock = {
      serviceFlow: {
        findUnique: jest.fn(),
      },
      visitStep: {
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ id: 'mock-step' }]),
      },
      visitStepEvent: {
        createMany: jest.fn(),
      },
    };

    const notifMock = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitStepService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notifMock },
      ],
    }).compile();

    service = module.get<VisitStepService>(VisitStepService);
    prisma = module.get(PrismaService);
  });

  describe('instantiateStepsForVisit', () => {
    it('should silently return if no active flow is found', async () => {
      (prisma.serviceFlow.findUnique as any).mockResolvedValue(null);
      await service.instantiateStepsForVisit('t1', 'v1', 's1');
      expect(prisma.visitStep.createMany).not.toHaveBeenCalled();
    });

    it('should ignore CHECK_IN and CHECK_OUT steps', async () => {
      (prisma.serviceFlow.findUnique as any).mockResolvedValue({
        isActive: true,
        steps: [
          { type: 'CHECK_IN', transitions: [] },
          { type: 'CHECK_OUT', transitions: [] },
        ],
      } as any);

      await service.instantiateStepsForVisit('t1', 'v1', 's1');
      expect(prisma.visitStep.createMany).not.toHaveBeenCalled();
    });

    it('should correctly calculate entitlements based on accompanyingGuests + 1', async () => {
      (prisma.serviceFlow.findUnique as any).mockResolvedValue({
        isActive: true,
        steps: [
          {
            id: 'template1',
            type: 'COLLECTION',
            transitions: [],
            entitlementFormula: 'accompanyingGuests + 1',
            entitlementFixed: 0,
            stepOrder: 1,
            trigger: 'MANUAL_STAFF',
          },
        ],
      } as any);

      await service.instantiateStepsForVisit('t1', 'v1', 's1', {
        accompanyingGuests: 2,
      });

      expect(prisma.visitStep.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            templateStepId: 'template1',
            status: 'PENDING',
            quantityAllocated: 3, // 2 + 1
          }),
        ],
      });
    });

    it('should auto-activate if the first step trigger is AUTOMATIC', async () => {
      (prisma.serviceFlow.findUnique as any).mockResolvedValue({
        isActive: true,
        steps: [
          {
            id: 'template1',
            type: 'SERVICE',
            transitions: [],
            trigger: 'AUTOMATIC',
            stepOrder: 1,
          },
        ],
      } as any);

      await service.instantiateStepsForVisit('t1', 'v1', 's1');

      expect(prisma.visitStep.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            templateStepId: 'template1',
            status: 'PENDING',
          }),
        ],
      });
    });
  });
});
