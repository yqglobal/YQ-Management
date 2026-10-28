import { Test, TestingModule } from '@nestjs/testing';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { RedisService } from '../../redis/redis.service';
import { SubscriptionService } from '../../subscription/subscription.service';
import { AppointmentService } from '../../appointment/appointment.service';
import { CommunicationService } from '../../communication/communication.service';
import { ServiceService } from '../../service/service.service';
import { BlockOffService } from '../../block-off/block-off.service';
import { VisitStepService } from '../../visit-step/visit-step.service';

describe('VisitService - Temporal Booking & Queue Hygiene Engine', () => {
  let service: VisitService;
  let prisma: any;

  const mockPrismaService: any = {
    visit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    appointment: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  mockPrismaService.$transaction = jest.fn(
    async (cb: (tx: any) => Promise<any>) => cb(mockPrismaService),
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: SubscriptionService, useValue: {} },
        { provide: AppointmentService, useValue: {} },
        { provide: CommunicationService, useValue: {} },
        { provide: ServiceService, useValue: {} },
        { provide: BlockOffService, useValue: {} },
        { provide: VisitStepService, useValue: {} },
      ],
    }).compile();

    service = module.get<VisitService>(VisitService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('autoSweepStaleVisits', () => {
    it('should find and auto-close stale unserviced visits from previous days', async () => {
      const staleVisitIds = [{ id: 'visit-old-1' }, { id: 'visit-old-2' }];
      prisma.visit.findMany
        .mockResolvedValueOnce(staleVisitIds) // stale waiting visits
        .mockResolvedValueOnce([]); // lingering in_service
      prisma.appointment.findMany.mockResolvedValueOnce([]); // past scheduled appts
      prisma.visit.updateMany.mockResolvedValue({ count: 2 });

      await service.autoSweepStaleVisits('tenant-1', 'loc-1', 'UTC');

      expect(prisma.visit.findMany).toHaveBeenCalled();
      expect(prisma.visit.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['visit-old-1', 'visit-old-2'] } },
        data: expect.objectContaining({
          currentState: 'NO_SHOW',
          cancelReason: 'Day Rollover / Unattended (Auto-closed)',
        }),
      });
    });

    it('should auto-complete lingering in-service visits from previous days', async () => {
      const inServiceIds = [{ id: 'in-service-yesterday' }];
      prisma.visit.findMany
        .mockResolvedValueOnce([]) // stale waiting
        .mockResolvedValueOnce(inServiceIds); // lingering in_service
      prisma.appointment.findMany.mockResolvedValueOnce([]);
      prisma.visit.updateMany.mockResolvedValue({ count: 1 });

      await service.autoSweepStaleVisits('tenant-1', 'loc-1', 'UTC');

      expect(prisma.visit.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['in-service-yesterday'] } },
        data: expect.objectContaining({
          currentState: 'COMPLETED',
          cancelReason: 'Day Rollover Auto-Complete',
        }),
      });
    });
  });

  describe('findAll (scope = today)', () => {
    it('should invoke JIT auto-sweep and bind active visit states to today window', async () => {
      const spyAutoSweep = jest
        .spyOn(service, 'autoSweepStaleVisits')
        .mockResolvedValue(undefined);
      prisma.visit.findMany.mockResolvedValue([]);

      await service.findAll(
        { tenantId: 'tenant-1', role: 'ADMIN' },
        'today',
        'loc-1',
        undefined,
        'UTC',
      );

      expect(spyAutoSweep).toHaveBeenCalledWith('tenant-1', 'loc-1', 'UTC');
      expect(prisma.visit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            locationId: 'loc-1',
            OR: expect.arrayContaining([
              expect.objectContaining({
                currentState: {
                  in: [
                    'WAITING',
                    'IN_SERVICE',
                    'CALLED',
                    'CHECKED_IN',
                    'ON_HOLD',
                    'PENDING_PAYMENT',
                  ],
                },
                OR: expect.any(Array),
              }),
            ]),
            NOT: expect.objectContaining({
              AND: expect.arrayContaining([
                { currentState: { in: ['SCHEDULED', 'CREATED'] } },
                expect.objectContaining({ scheduledTime: expect.any(Object) }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('validateToken temporal date boundaries', () => {
    it('should reject an appointment scheduled for a past date', async () => {
      const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago
      prisma.visit.findFirst.mockResolvedValue({
        id: 'visit-past',
        currentState: 'WAITING',
        scheduledTime: pastDate,
        createdAt: pastDate,
        checkInTime: null,
        queue: { location: { timezone: 'UTC' } },
        customer: { name: 'Past Customer' },
        service: { name: 'Consultation' },
        visitSteps: [],
      });

      const result = await service.validateToken('visit-past', 'tenant-1');

      expect(result.valid).toBe(false);
      expect((result as any).isPast).toBe(true);
      expect(result.reason).toContain('past date');
    });

    it('should reject future appointments without allowEarlyCheckIn override', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days from now
      prisma.visit.findFirst.mockResolvedValue({
        id: 'visit-future',
        currentState: 'CREATED',
        scheduledTime: futureDate,
        createdAt: new Date(),
        checkInTime: null,
        queue: { location: { timezone: 'UTC' } },
        customer: { name: 'Future Customer' },
        service: { name: 'Consultation' },
        visitSteps: [],
      });

      const result = await service.validateToken('visit-future', 'tenant-1');

      expect(result.valid).toBe(false);
      expect((result as any).isFuture).toBe(true);
      expect((result as any).canOverride).toBe(true);
      expect(result.reason).toContain('future date');
    });

    it('should allow future appointments when allowEarlyCheckIn is true', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      prisma.visit.findFirst.mockResolvedValue({
        id: 'visit-future-allowed',
        currentState: 'CREATED',
        scheduledTime: futureDate,
        createdAt: new Date(),
        checkInTime: null,
        queue: { location: { timezone: 'UTC' } },
        customer: { name: 'Future Customer' },
        service: { name: 'Consultation' },
        visitSteps: [],
      });

      const result = await service.validateToken(
        'visit-future-allowed',
        'tenant-1',
        undefined,
        {
          allowEarlyCheckIn: true,
        },
      );

      expect(result.valid).toBe(true);
      expect(result.customerName).toBe('Future Customer');
    });

    it('should reject stale walk-in tickets issued on previous days', async () => {
      const oldDate = new Date(Date.now() - 72 * 60 * 60 * 1000);
      prisma.visit.findFirst.mockResolvedValue({
        id: 'visit-stale-walkin',
        currentState: 'WAITING',
        scheduledTime: null,
        createdAt: oldDate,
        checkInTime: null,
        queue: { location: { timezone: 'UTC' } },
        customer: { name: 'Stale Walkin Customer' },
        service: { name: 'General Support' },
        visitSteps: [],
      });

      const result = await service.validateToken(
        'visit-stale-walkin',
        'tenant-1',
      );

      expect(result.valid).toBe(false);
      expect((result as any).isPast).toBe(true);
      expect(result.reason).toContain('previous date');
    });
  });
});
