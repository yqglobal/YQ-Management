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
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('VisitService', () => {
  let service: VisitService;
  let prisma: PrismaService;

  // Build mock in two steps to avoid implicit circular reference
  const mockPrismaService: any = {
    visit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    visitStep: {
      updateMany: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
        {
          provide: AppointmentService,
          useValue: { updateAvgActualDuration: jest.fn().mockReturnValue(Promise.resolve()) },
        },
        { provide: CommunicationService, useValue: {} },
        { provide: ServiceService, useValue: {} },
        { provide: BlockOffService, useValue: {} },
        {
          provide: VisitStepService,
          useValue: {
            activateFirstPendingStep: jest.fn(),
            advanceStep: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VisitService>(VisitService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a visit if found and belongs to tenant', async () => {
      const mockVisit = { id: 'v1', tenantId: 't1' };
      mockPrismaService.visit.findFirst.mockResolvedValue(mockVisit);

      const result = await service.findOne('v1', 't1');
      expect(result).toEqual(mockVisit);
      expect(mockPrismaService.visit.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1', tenantId: 't1' },
        }),
      );
    });

    it('should throw NotFoundException if visit not found', async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue(null);

      await expect(service.findOne('v1', 't1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it("should throw NotFoundException if trying to update someone else's visit", async () => {
      mockPrismaService.visit.findFirst.mockResolvedValue(null);

      await expect(
        service.update('v1', 't1', { status: 'IN_SERVICE' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.visit.update).not.toHaveBeenCalled();
    });
  });

  describe('checkIn', () => {
    it('should transition status to CHECKED_IN and set checkInTime', async () => {
      const mockVisit = { id: 'v1', tenantId: 't1', currentState: 'SCHEDULED' };
      mockPrismaService.visit.findFirst.mockResolvedValue(mockVisit);
      mockPrismaService.visit.update.mockResolvedValue({
        ...mockVisit,
        currentState: 'CHECKED_IN',
      });

      await service.checkIn('v1', 't1');

      expect(mockPrismaService.visit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: expect.objectContaining({ currentState: 'CHECKED_IN' }),
        }),
      );
    });

    it('should throw ConflictException if already checked in', async () => {
      const mockVisit = {
        id: 'v1',
        tenantId: 't1',
        currentState: 'CHECKED_IN',
      };
      mockPrismaService.visit.findFirst.mockResolvedValue(mockVisit);

      await expect(service.checkIn('v1', 't1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('startService', () => {
    it('should transition status to IN_SERVICE', async () => {
      const mockVisit = {
        id: 'v1',
        tenantId: 't1',
        currentState: 'CHECKED_IN',
      };
      mockPrismaService.visit.findFirst.mockResolvedValue(mockVisit);

      await service.startService('v1', 't1');

      expect(mockPrismaService.visit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentState: 'IN_SERVICE' }),
        }),
      );
    });

    it('should throw ConflictException if already in service', async () => {
      const mockVisit = {
        id: 'v1',
        tenantId: 't1',
        currentState: 'IN_SERVICE',
      };
      mockPrismaService.visit.findFirst.mockResolvedValue(mockVisit);

      await expect(service.startService('v1', 't1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('completeService', () => {
    it('should complete visit, mark active step DONE, and skip pending steps by default', async () => {
      const mockVisit = {
        id: 'v1',
        tenantId: 't1',
        currentState: 'IN_SERVICE',
        serviceId: 's1',
        serviceStart: new Date(Date.now() - 60000),
        visitSteps: [
          { id: 'step1', status: 'ACTIVE', stepOrder: 1 },
          { id: 'step2', status: 'PENDING', stepOrder: 2 },
        ],
      };
      mockPrismaService.visit.findUnique.mockResolvedValue(mockVisit);
      mockPrismaService.visit.update.mockResolvedValue({
        ...mockVisit,
        currentState: 'COMPLETED',
        completedAt: new Date(),
        serviceStart: mockVisit.serviceStart,
      });
      mockPrismaService.visitStep.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.service.findUnique.mockResolvedValue({ id: 's1', expectedDuration: 15 });
      mockPrismaService.service.update.mockResolvedValue({});

      const result = await service.completeService('v1', 't1');

      expect(mockPrismaService.visitStep.updateMany).toHaveBeenCalledWith({
        where: { visitId: 'v1', status: 'ACTIVE' },
        data: expect.objectContaining({ status: 'DONE' }),
      });
      expect(mockPrismaService.visitStep.updateMany).toHaveBeenCalledWith({
        where: {
          visitId: 'v1',
          status: { in: ['PENDING', 'QUEUED', 'DEFERRED', 'LOCKED'] },
        },
        data: expect.objectContaining({ status: 'SKIPPED' }),
      });
      expect(mockPrismaService.visit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: expect.objectContaining({
            currentState: 'COMPLETED',
            currentStepId: null,
          }),
        }),
      );
      expect(mockPrismaService.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'VISIT_COMPLETED' }),
        }),
      );
    });

    it('should advance step only when opts.forceComplete is explicitly false', async () => {
      const mockVisit = {
        id: 'v1',
        tenantId: 't1',
        currentState: 'IN_SERVICE',
        visitSteps: [
          { id: 'step1', status: 'ACTIVE', stepOrder: 1 },
          { id: 'step2', status: 'PENDING', stepOrder: 2 },
        ],
      };
      mockPrismaService.visit.findUnique.mockResolvedValue(mockVisit);
      const visitStepService = (service as any).visitStepService;

      await service.completeService('v1', 't1', 'op1', { forceComplete: false });

      expect(visitStepService.advanceStep).toHaveBeenCalledWith(
        't1',
        'step1',
        'op1',
        {},
      );
      expect(mockPrismaService.visitStep.updateMany).not.toHaveBeenCalled();
    });
  });
});

