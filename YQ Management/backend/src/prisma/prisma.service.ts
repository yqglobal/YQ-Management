import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public extendedClient: any;
  private readonly logger = new Logger('PrismaSecurity');

  private tenantPrivacyCache = new Map<string, { strictPrivacyMode: boolean; expiresAt: number }>();

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
      idleTimeoutMillis: 30000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    const tenantPrivacyCache = this.tenantPrivacyCache;
    const isStrictPrivacyEnabled = async (tenantId: string): Promise<boolean> => {
      if (!tenantId) return false;
      const now = Date.now();
      const cached = tenantPrivacyCache.get(tenantId);
      if (cached && cached.expiresAt > now) {
        return cached.strictPrivacyMode;
      }
      // Perform a raw query to avoid interceptor loops
      const res: any = await this.$queryRaw`SELECT "strictPrivacyMode" FROM "Tenant" WHERE id = ${tenantId} LIMIT 1`;
      const mode = res && res.length > 0 ? res[0].strictPrivacyMode : false;
      tenantPrivacyCache.set(tenantId, { strictPrivacyMode: mode, expiresAt: now + 60000 });
      return mode;
    };

    const self = this;
    this.extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const modelsWithTenant = [
              'Visit',
              'Appointment',
              'Customer',
              'Location',
              'Service',
              'Staff',
              'Resource',
              'Notification',
              'User',
              'Workspace',
            ];
            if (modelsWithTenant.includes(model)) {
              if (
                operation.startsWith('find') ||
                operation === 'update' ||
                operation === 'delete' ||
                operation === 'count'
              ) {
                const where = (args as any).where;
                if (!where || !where.tenantId) {
                  new Logger('PrismaSecurity').warn(
                    `[Prisma Security Warning] ${operation} on ${model} without tenantId filter!`,
                  );
                }
              }
            }

            // --- PII/PHI VAULT ENCRYPTION LOGIC ---
            const encryptUtil = require('../utils/encryption.util');

            // 1. Encryption on Write (create, update, upsert, createMany)
            if (model === 'Customer' && (operation === 'create' || operation === 'update')) {
              const data = (args as any).data;
              const tenantId = (args as any).data?.tenantId || (args as any).where?.tenantId;
              if (tenantId && await isStrictPrivacyEnabled(tenantId)) {
                if (data.name) data.name = encryptUtil.encrypt(data.name);
                if (data.email) data.email = encryptUtil.encrypt(data.email);
                if (data.phone) data.phone = encryptUtil.encrypt(data.phone);
              }
            }
            if (model === 'Visit' && (operation === 'create' || operation === 'update')) {
              const data = (args as any).data;
              const tenantId = (args as any).data?.tenantId || (args as any).where?.tenantId;
              if (tenantId && await isStrictPrivacyEnabled(tenantId)) {
                if (data.notes) data.notes = encryptUtil.encrypt(data.notes);
                if (data.formResponses) data.formResponses = encryptUtil.encryptJson(data.formResponses);
              }
            }

            // 2. Execute Query
            const result = await query(args);

            // 3. Decryption on Read (findUnique, findFirst, findMany)
            if (result) {
              const decryptRecord = (record: any, modelName: string) => {
                if (!record) return;
                if (modelName === 'Customer') {
                  if (record.name) record.name = encryptUtil.decrypt(record.name);
                  if (record.email) record.email = encryptUtil.decrypt(record.email);
                  if (record.phone) record.phone = encryptUtil.decrypt(record.phone);
                } else if (modelName === 'Visit') {
                  if (record.notes) record.notes = encryptUtil.decrypt(record.notes);
                  if (record.formResponses && typeof record.formResponses === 'string') {
                    record.formResponses = encryptUtil.decryptJson(record.formResponses);
                  }
                  if (record.customer) decryptRecord(record.customer, 'Customer');
                }
              };

              if (Array.isArray(result)) {
                result.forEach(r => decryptRecord(r, model as string));
              } else {
                decryptRecord(result, model as string);
              }
            }

            return result;
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
