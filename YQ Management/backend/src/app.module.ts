import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import createLogRoutingTransport from './config/log-routing';
import { AppController } from './app.controller';
import { HealthController } from './health/health.controller';
import { KeepAliveService } from './health/keep-alive.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AppService } from './app.service';
import { TenantModule } from './tenant/tenant.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantContextMiddleware } from './tenant/middlewares/tenant-context/tenant-context.middleware';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { TokenModule } from './token/token.module';
import { RedisModule } from './redis/redis.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { EmailModule } from './email/email.module';
import { CommunicationModule } from './communication/communication.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MessagesModule } from './messages/messages.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { VisitModule } from './visit/visit.module';
import { AppointmentModule } from './appointment/appointment.module';
import { LocationModule } from './location/location.module';
import { ServiceModule } from './service/service.module';
import { StaffModule } from './staff/staff.module';
import { ResourceModule } from './resource/resource.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'debug',
        stream: createLogRoutingTransport(),
        serializers: {
          req: (req: any) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            body: req.raw?.body || req.body,
            remoteAddress: req.remoteAddress,
          }),
          res: (res: any) => ({
            statusCode: res.statusCode,
          }),
        },
        customSuccessMessage: (req: any, res: any, responseTime: number) => {
          return `HTTP ${req.method} ${req.url} -> Status ${res.statusCode} (${responseTime}ms)`;
        },
        customErrorMessage: (req: any, res: any, err: Error) => {
          return `HTTP ${req.method} ${req.url} -> ERROR: ${err.message}`;
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    ScheduleModule.forRoot(),
    TenantModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    QueueModule,
    TokenModule,
    RedisModule,
    NotificationsModule,
    WhatsappModule,
    PaymentsModule,
    PlansModule,
    SuperAdminModule,
    EmailModule,
    CommunicationModule,
    WebhooksModule,
    AnalyticsModule,
    MessagesModule,
    WorkspaceModule,
    AuditModule,
    VisitModule,
    AppointmentModule,
    LocationModule,
    ServiceModule,
    StaffModule,
    ResourceModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    KeepAliveService,
    {
      provide: 'APP_INTERCEPTOR',
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer
      .apply(TenantContextMiddleware)
      .exclude('/health', '/auth/*path')
      .forRoutes('*');
  }
}
