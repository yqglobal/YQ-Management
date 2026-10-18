import { Test, TestingModule } from '@nestjs/testing';
import { ServiceFlowService } from '../service-flow.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('ServiceFlowService', () => {
  let service: ServiceFlowService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    // Mock the PrismaService
    const prismaMock = {
      serviceFlow: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      flowStepTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceFlowService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ServiceFlowService>(ServiceFlowService);
    prisma = module.get(PrismaService);
  });

  describe('createFlow', () => {
    it('should throw ConflictException if flow for service already exists', async () => {
      (prisma.serviceFlow.findUnique as any).mockResolvedValue({
        id: 'flow-1',
        serviceId: 'service-1',
      } as any);

      await expect(
        service.createFlow('tenant-1', {
          name: 'Test',
          serviceId: 'service-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a flow and ensure bookends if it does not exist', async () => {
      (prisma.serviceFlow.findUnique as any)
        .mockResolvedValueOnce(null) // first check for existing
        .mockResolvedValueOnce({ id: 'flow-new', steps: [] } as any); // return at end

      (prisma.serviceFlow.create as any).mockResolvedValue({
        id: 'flow-new',
      } as any);

      (prisma.flowStepTemplate.findMany as any).mockResolvedValue([]);
      (prisma.flowStepTemplate.findFirst as any).mockResolvedValue(null);
      (prisma.flowStepTemplate.create as any).mockResolvedValue({} as any);

      const result = await service.createFlow('tenant-1', {
        name: 'New Flow',
        serviceId: 'service-2',
      });

      expect(prisma.serviceFlow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'New Flow',
          serviceId: 'service-2',
        }),
      });

      // Verify it returns the found unique flow at the end
      expect(result).toEqual({ id: 'flow-new', steps: [] });
    });
  });
});
