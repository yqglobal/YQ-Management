import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: PrismaService,
          useValue: {
            tenant: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
            workspace: { findUnique: jest.fn() },
            user: { findUnique: jest.fn() },
            token: { findFirst: jest.fn(), count: jest.fn(), update: jest.fn(), create: jest.fn() },
            queue: { findUnique: jest.fn() },
            message: { create: jest.fn() },
          },
        },
        {
          provide: RedisService,
          useValue: {
            client: {
              get: jest.fn(),
              set: jest.fn(),
              del: jest.fn(),
              lpush: jest.fn(),
              ltrim: jest.fn(),
              lrange: jest.fn(),
              publish: jest.fn(),
              ttl: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateValidationCode', () => {
    it('should generate and store a validation code', async () => {
      const mockTenant = { id: 'tenant-1', name: 'Test Tenant' };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.generateValidationCode('tenant-1');

      expect(result).toHaveProperty('validationCode');
      expect(result.validationCode).toMatch(/^WVC-[A-Z0-9]+-[A-Z0-9]{8}$/);
      expect(result.expiresIn).toBe(60);
      expect(redis.client.set).toHaveBeenCalledWith(
        'whatsapp:validation-code:tenant-1',
        expect.any(String),
        'EX',
        60,
      );
    });

    it('should throw if tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generateValidationCode('tenant-1')).rejects.toThrow('Tenant not found');
    });
  });

  describe('connectWithValidationCode', () => {
    it('should throw if tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.connectWithValidationCode('tenant-1', 'WVC-TEST')).rejects.toThrow('Tenant not found');
    });

    it('should throw if validation code is invalid', async () => {
      const mockTenant = { id: 'tenant-1', name: 'Test Tenant', whatsappInstanceId: null };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (redis.client.get as jest.Mock).mockResolvedValue(null);

      await expect(service.connectWithValidationCode('tenant-1', 'INVALID')).rejects.toThrow('Invalid or expired validation code');
    });
  });

  describe('extractQr', () => {
    it('should extract base64 image from data URL', () => {
      const result = (service as any).extractQr('data:image/png;base64,abc123');
      expect(result).toBe('data:image/png;base64,abc123');
    });

    it('should extract QR from code field', () => {
      const result = (service as any).extractQr({ code: '2@abcdefghijk' });
      expect(result).toBe('2@abcdefghijk');
    });

    it('should extract QR from qrCode field', () => {
      const result = (service as any).extractQr({ qrCode: '2@abcdefghijk' });
      expect(result).toBe('2@abcdefghijk');
    });

    it('should extract base64 from nested qrcode object', () => {
      const result = (service as any).extractQr({ qrcode: { base64: 'data:image/png;base64,test' } });
      expect(result).toBe('data:image/png;base64,test');
    });

    it('should extract QR from instance.qrCode', () => {
      const result = (service as any).extractQr({ instance: { qrCode: '2@instanceqr' } });
      expect(result).toBe('2@instanceqr');
    });

    it('should return null when no QR found', () => {
      const result = (service as any).extractQr({ instance: { state: 'open' } });
      expect(result).toBeNull();
    });
  });

  describe('extractState', () => {
    it('should return open for open state', () => {
      const result = (service as any).extractState({ instance: { state: 'open' } });
      expect(result).toBe('open');
    });

    it('should return connecting for connecting state', () => {
      const result = (service as any).extractState({ instance: { state: 'connecting' } });
      expect(result).toBe('connecting');
    });

    it('should return close for close state', () => {
      const result = (service as any).extractState({ instance: { state: 'close' } });
      expect(result).toBe('close');
    });

    it('should return close for unknown state', () => {
      const result = (service as any).extractState({ instance: { state: 'unknown' } });
      expect(result).toBe('close');
    });
  });

  describe('sendToTenant', () => {
    it('should return error when tenantId is missing', async () => {
      const result = await service.sendToTenant('', '1234567890', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing tenantId');
    });

    it('should return error when tenant has no instance', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 'tenant-1', whatsappInstanceId: null });
      const result = await service.sendToTenant('tenant-1', '1234567890', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toBe('WhatsApp not configured for tenant');
    });
  });

  describe('disconnect', () => {
    it('should return success when tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.disconnect('tenant-1');
      expect(result.success).toBe(true);
    });

    it('should logout and update DB when tenant exists', async () => {
      const mockTenant = { id: 'tenant-1', whatsappInstanceId: 'tenant_abc123' };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.disconnect('tenant-1');
      expect(result.success).toBe(true);
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { whatsappConnected: false },
      });
    });
  });

  describe('logTenantEvent', () => {
    it('should push event to Redis list', async () => {
      (redis.client.lpush as jest.Mock).mockResolvedValue(1);
      (redis.client.ltrim as jest.Mock).mockResolvedValue('OK');

      await service.logTenantEvent('tenant-1', 'TEST_EVENT', { key: 'value' });

      expect(redis.client.lpush).toHaveBeenCalledWith(
        'whatsapp:logs:tenant-1',
        expect.stringContaining('TEST_EVENT'),
      );
      expect(redis.client.ltrim).toHaveBeenCalledWith('whatsapp:logs:tenant-1', 0, 99);
    });
  });

  describe('generateCode', () => {
    it('should generate code with WVC prefix', () => {
      const code = (service as any).generateCode();
      expect(code).toMatch(/^WVC-[A-Z0-9]+-[A-Z0-9]{8}$/);
    });
  });

  describe('handleWebhook', () => {
    beforeEach(() => {
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue({ id: 'tenant-1', whatsappInstanceId: 'inst-1', chatbotEnabled: true });
      (prisma.token.findFirst as jest.Mock).mockResolvedValue(null);
      (redis.client.get as jest.Mock).mockResolvedValue(null);
      (redis.client.set as jest.Mock).mockResolvedValue('OK');
    });

    it('should handle connection.update open state', async () => {
      (prisma.tenant.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.handleWebhook('inst-1', {
        event: 'connection.update',
        data: { state: 'open' },
      });

      expect(result).toEqual({ success: true });
      expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
        where: { whatsappInstanceId: 'inst-1' },
        data: { whatsappConnected: true },
      });
    });

    it('should handle connection.update close with hard logout', async () => {
      (prisma.tenant.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue({ id: 'tenant-1' });

      const result = await service.handleWebhook('inst-1', {
        event: 'connection.update',
        data: { state: 'close', statusCode: 401 },
      });

      expect(result).toEqual({ success: true });
      expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
        where: { whatsappInstanceId: 'inst-1' },
        data: { whatsappConnected: false },
      });
    });

    it('should ignore outgoing messages', async () => {
      const result = await service.handleWebhook('inst-1', {
        event: 'messages.upsert',
        data: {
          key: { remoteJid: '123@s.whatsapp.net', fromMe: true },
          message: { conversation: 'Hello' },
        },
      });

      expect(result).toEqual({ ignored: true });
    });

    it('should ignore group messages', async () => {
      const result = await service.handleWebhook('inst-1', {
        event: 'messages.upsert',
        data: {
          key: { remoteJid: '123@g.us', fromMe: false },
          message: { conversation: 'Hello' },
        },
      });

      expect(result).toEqual({ ignored: true });
    });

    it('should deduplicate messages by id', async () => {
      (redis.client.get as jest.Mock).mockResolvedValue('1');

      const result = await service.handleWebhook('inst-1', {
        event: 'messages.upsert',
        data: {
          key: { id: 'msg-1', remoteJid: '123@s.whatsapp.net', fromMe: false },
          message: { conversation: 'Hello' },
        },
      });

      expect(result).toEqual({ ignored: true, reason: 'duplicate' });
    });

    it('should ignore empty messages', async () => {
      (redis.client.get as jest.Mock).mockResolvedValue(null);

      const result = await service.handleWebhook('inst-1', {
        event: 'messages.upsert',
        data: {
          key: { id: 'msg-2', remoteJid: '123@s.whatsapp.net', fromMe: false },
          message: {},
        },
      });

      expect(result).toEqual({ ignored: true });
    });

    it('should handle STATUS command for active token', async () => {
      const mockToken = {
        id: 'token-1',
        queueId: 'queue-1',
        joinedAt: new Date('2024-01-01T00:00:00Z'),
        queue: { name: 'General Queue' },
      };
      (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockToken);
      (prisma.token.count as jest.Mock).mockResolvedValue(2);

      const result = await service.handleWebhook('inst-1', {
        event: 'messages.upsert',
        data: {
          key: { id: 'msg-3', remoteJid: '123@s.whatsapp.net', fromMe: false },
          message: { conversation: 'STATUS' },
        },
      });

      expect(result).toEqual({ handled: true, action: 'status' });
      expect(prisma.token.count).toHaveBeenCalledWith({
        where: { queueId: 'queue-1', status: 'WAITING', joinedAt: { lt: mockToken.joinedAt } },
      });
    });

    it('should handle CANCEL command for active token', async () => {
      const mockToken = {
        id: 'token-1',
        queueId: 'queue-1',
        joinedAt: new Date('2024-01-01T00:00:00Z'),
        queue: { name: 'General Queue' },
      };
      (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockToken);
      (prisma.token.update as jest.Mock).mockResolvedValue({ id: 'token-1', status: 'MISSED' });

      const result = await service.handleWebhook('inst-1', {
        event: 'messages.upsert',
        data: {
          key: { id: 'msg-4', remoteJid: '123@s.whatsapp.net', fromMe: false },
          message: { conversation: 'CANCEL' },
        },
      });

      expect(result).toEqual({ handled: true, action: 'cancel' });
      expect(prisma.token.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { status: 'MISSED' },
      });
    });

    it('should handle unknown message for active token', async () => {
      const mockToken = {
        id: 'token-1',
        queueId: 'queue-1',
        joinedAt: new Date('2024-01-01T00:00:00Z'),
        queue: { name: 'General Queue' },
      };
      (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockToken);
      (prisma.message.create as jest.Mock).mockResolvedValue({ id: 'msg-1', body: 'Hello' });

      const result = await service.handleWebhook('inst-1', {
        event: 'messages.upsert',
        data: {
          key: { id: 'msg-5', remoteJid: '123@s.whatsapp.net', fromMe: false },
          message: { conversation: 'Hello' },
        },
      });

      expect(result).toEqual({ handled: true, action: 'message' });
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          tokenId: 'token-1',
          body: 'Hello',
          sender: 'CUSTOMER',
        },
      });
    });

    it('should ignore unsupported events', async () => {
      const result = await service.handleWebhook('inst-1', {
        event: 'messages.delete',
        data: {},
      });

      expect(result).toEqual({ ignored: true });
    });
  });

  describe('handleWebhook messages.update', () => {
    it('should log status updates', async () => {
      (prisma.tenant.findFirst as jest.Mock).mockResolvedValue({ id: 'tenant-1' });

      const result = await service.handleWebhook('inst-1', {
        event: 'messages.update',
        data: [
          { key: { id: 'msg-1' }, update: { status: 2 } },
          { key: { id: 'msg-2' }, update: { status: 3 } },
          { key: { id: 'msg-3' }, update: { status: 4 } },
        ],
      });

      expect(result).toEqual({ success: true });
      expect(redis.client.lpush).toHaveBeenCalledTimes(3);
    });
  });
});
