import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminController } from '../super-admin.controller';
import { SuperAdminService } from '../super-admin.service';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';
import { CommunicationLogService } from '../../communication/logging/communication-log.service';
import { TemplateService } from '../../communication/templates/template.service';
import { PaymentsService } from '../../payments/payments.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';

describe('SuperAdminController', () => {
  let controller: SuperAdminController;
  let service: SuperAdminService;

  const mockUser = {
    id: 'user-1',
    email: 'admin@test.com',
    role: 'SUPER_ADMIN',
  };

  const mockReq = {
    user: mockUser,
  };

  beforeEach(async () => {
    service = {
      getGlobalMetrics: jest.fn(),
      getAllTenants: jest.fn(),
      getTenantById: jest.fn(),
      deleteTenant: jest.fn(),
      getAllUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAllSubscriptions: jest.fn(),
      getPlatformAnalytics: jest.fn(),
      getRecentTransactions: jest.fn(),
      listPlans: jest.fn(),
      createPlan: jest.fn(),
      updatePlan: jest.fn(),
      archivePlan: jest.fn(),
      changePlanStatus: jest.fn(),
      duplicatePlan: jest.fn(),
    } as unknown as SuperAdminService;

    const emailProvider = {
      testConnection: jest.fn(),
      send: jest.fn(),
    };

    const whatsappService = {
      sendToTenant: jest.fn().mockResolvedValue({ success: true, providerId: 'mock-wa-id' }),
    };

    const communicationLogService = {
      log: jest.fn(),
      getFailedLogs: jest.fn(),
    };

    const templateService = {
      getEmailTemplateKeys: jest.fn().mockReturnValue([]),
      getWhatsAppTemplateKeys: jest.fn().mockReturnValue([]),
    };

    const paymentsService = {
      generateTestPaymentLink: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        { provide: SuperAdminService, useValue: service },
        { provide: 'EmailProvider', useValue: emailProvider },
        { provide: WhatsappService, useValue: whatsappService },
        { provide: CommunicationLogService, useValue: communicationLogService },
        { provide: TemplateService, useValue: templateService },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return global metrics', async () => {
      service.getGlobalMetrics.mockResolvedValue({ totalTenants: 10 });
      const result = await controller.getMetrics(mockReq);
      expect(result).toEqual({ totalTenants: 10 });
    });

    it('should throw UnauthorizedException for non-super-admin', async () => {
      const req = { user: { role: 'TENANT_ADMIN' } };
      await expect(controller.getMetrics(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getTenants', () => {
    it('should return all tenants', async () => {
      service.getAllTenants.mockResolvedValue([]);
      const result = await controller.getTenants(mockReq);
      expect(result).toEqual([]);
    });

    it('should pass search query', async () => {
      service.getAllTenants.mockResolvedValue([]);
      await controller.getTenants(mockReq, 'test');
      expect(service.getAllTenants).toHaveBeenCalledWith({ search: 'test' });
    });
  });

  describe('getTenantById', () => {
    it('should return a tenant', async () => {
      service.getTenantById.mockResolvedValue({ id: '1', name: 'Test' });
      const result = await controller.getTenantById(mockReq, '1');
      expect(result.name).toBe('Test');
    });
  });

  describe('listPlans', () => {
    it('should return all plans', async () => {
      service.listPlans.mockResolvedValue([]);
      const result = await controller.listPlans(mockReq);
      expect(result).toEqual([]);
    });

    it('should pass status filter and pagination', async () => {
      service.listPlans.mockResolvedValue([]);
      await controller.listPlans(mockReq, 'ACTIVE', 0, 10);
      expect(service.listPlans).toHaveBeenCalledWith('ACTIVE', 0, 10);
    });
  });

  describe('createPlan', () => {
    it('should create a plan', async () => {
      const dto = { name: 'Pro Plan', price: 99.99 };
      service.createPlan.mockResolvedValue({ id: '1', ...dto });
      const result = await controller.createPlan(mockReq, dto);
      expect(result.name).toBe('Pro Plan');
    });
  });

  describe('updatePlan', () => {
    it('should update a plan', async () => {
      service.updatePlan.mockResolvedValue({ id: '1', name: 'Updated' });
      const result = await controller.updatePlan(mockReq, '1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('archivePlan', () => {
    it('should archive a plan', async () => {
      service.archivePlan.mockResolvedValue({ id: '1', active: false });
      const result = await controller.archivePlan(mockReq, '1');
      expect(result.active).toBe(false);
    });
  });

  describe('changePlanStatus', () => {
    it('should change plan status', async () => {
      service.changePlanStatus.mockResolvedValue({ id: '1', active: true });
      const result = await controller.changePlanStatus(mockReq, '1', { status: 'ACTIVE' });
      expect(service.changePlanStatus).toHaveBeenCalledWith('1', 'ACTIVE');
    });
  });

  describe('duplicatePlan', () => {
    it('should duplicate a plan', async () => {
      service.duplicatePlan.mockResolvedValue({ id: '2', name: 'Copy of Basic' });
      const result = await controller.duplicatePlan(mockReq, '1', { name: 'Copy of Basic' });
      expect(result.name).toBe('Copy of Basic');
    });
  });
});