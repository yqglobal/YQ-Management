import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
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

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
      idleTimeoutMillis: 30000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });

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
                  // In a strict mode we would throw an error here,
                  // but because some background jobs or superadmin actions might not have a tenantId,
                  // we log a warning instead of throwing an error for now.
                  new Logger('PrismaSecurity').warn(
                    `[Prisma Security Warning] ${operation} on ${model} without tenantId filter!`,
                  );
                }
              }
            }
            return query(args);
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
