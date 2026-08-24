import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from '../appointment.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    appointment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    client: {
      publish: jest.fn(),
    },
  };
  const mockWhatsappService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an appointment if no conflict', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        appointmentApprovalMode: 'MANUAL',
      });
      mockPrismaService.appointment.findFirst.mockResolvedValue(null);
      mockPrismaService.appointment.create.mockResolvedValue({ id: 'app1' });

      const result = await service.create({
        staffId: 's1',
        scheduledStart: new Date('2026-01-01T10:00:00Z'),
        scheduledEnd: new Date('2026-01-01T11:00:00Z'),
      } as any);

      expect(result.id).toBe('app1');
      expect(mockPrismaService.appointment.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if staff is already booked', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.create({
          staffId: 's1',
          scheduledStart: new Date('2026-01-01T10:00:00Z'),
          scheduledEnd: new Date('2026-01-01T11:00:00Z'),
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.appointment.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw ConflictException if updated time conflicts', async () => {
      // existing appointment
      mockPrismaService.appointment.findFirst.mockResolvedValueOnce({
        id: 'app1',
        staffId: 's1',
        scheduledStart: new Date('2026-01-01T10:00:00Z'),
        scheduledEnd: new Date('2026-01-01T11:00:00Z'),
        status: 'SCHEDULED',
      });

      // overlapping appointment found
      mockPrismaService.appointment.findFirst.mockResolvedValueOnce({
        id: 'existing',
      });

      await expect(
        service.update('app1', 't1', {
          scheduledStart: new Date('2026-01-01T12:00:00Z'),
          scheduledEnd: new Date('2026-01-01T13:00:00Z'),
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.appointment.update).not.toHaveBeenCalled();
    });
  });
});
