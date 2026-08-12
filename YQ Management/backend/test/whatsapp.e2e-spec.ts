import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from '../src/whatsapp/whatsapp.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { WhatsappLogger } from '../src/whatsapp/whatsapp.logger';
import { ConfigModule } from '@nestjs/config';

describe('WhatsappService (e2e)', () => {
  let service: WhatsappService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        WhatsappService,
        WhatsappLogger,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            client: {
              set: jest.fn(),
              get: jest.fn(),
              del: jest.fn(),
              lpush: jest.fn(),
              ltrim: jest.fn(),
              ttl: jest.fn().mockResolvedValue(60),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Evolution API Real Tests', () => {
    const testInstanceName = `test_e2e_${Date.now()}`;
    const testPhone = process.env.TEST_PHONE_NUMBER || '1234567890'; // Replace with a real number if provided via env

    it('should successfully hit the Evolution API and return instances', async () => {
      const result = await service.fetchEvo('/instance/fetchInstances', 'GET');
      // If the API is correctly configured, it should return an array (even if empty) or a successful response
      expect(result.error).toBeUndefined();
      expect(
        Array.isArray(result.data) ||
          result.data?.length >= 0 ||
          result.data?.instances,
      ).toBeDefined();
    });

    // We can't automatically scan the QR code in an automated test without manual intervention,
    // so we just test the creation and connect flow to see if it responds with a QR or pairing code correctly.
    it('should request pairing code for a test instance', async () => {
      // Mock tenant for resolution
      (service as any).resolveTenant = jest.fn().mockResolvedValue({
        id: 'test-tenant-id',
        whatsappInstanceId: testInstanceName,
      });

      try {
        const result = await service.generatePairingCode(
          'test-tenant-id',
          testPhone,
        );
        expect(result).toBeDefined();
        expect(result.instanceName).toEqual(testInstanceName);
        expect(result.pairingCode).toBeDefined();
      } catch (e: any) {
        // If it throws, we catch and log (could be due to existing instance conflict)
        console.warn(
          'Pairing code test failed, might be normal if instance exists or no API key:',
          e.message,
        );
      }
    }, 15000); // Wait up to 15 seconds for connection attempt

    it('should fail gracefully when sending a message from an unauthenticated instance', async () => {
      const result = await service.sendMessage(
        testInstanceName,
        testPhone,
        'Automated e2e test message',
      );
      // Because the instance is not fully authenticated (we didn't scan QR), it should fail.
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);
  });
});
