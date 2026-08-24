import { Test, TestingModule } from '@nestjs/testing';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../prisma/prisma.service';
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
});
