import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUDIT_KEY } from './audit.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if there is specific audit metadata
    const audit = this.reflector.getAllAndOverride<{
      action: string;
      resource: string;
    }>(AUDIT_KEY, [context.getHandler(), context.getClass()]);

    // Skip GET requests unless explicitly decorated with @Audit()
    if (request.method === 'GET' && !audit) {
      return next.handle();
    }

    // Skip auth and audit/log endpoints to avoid noise and loops
    if (
      request.url.startsWith('/auth') ||
      request.url.startsWith('/audit/log')
    ) {
      return next.handle();
    }

    const user = request.user;
    const userId = user?.id || user?.userId || null;
    let tenantId = user?.tenantId || request.body?.tenantId || null;
    if (!tenantId && request.headers['x-tenant-id']) {
      tenantId = request.headers['x-tenant-id'];
    }
    const customerId = request.body?.customerId || null;

    const safeBody = { ...request.body };
    const sensitiveKeys = ['password', 'newpassword', 'token', 'secret'];
    for (const key of Object.keys(safeBody)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        safeBody[key] = '[REDACTED]';
      }
    }

    return next.handle().pipe(
      tap({
        next: (resData) =>
          this.logAction(
            audit,
            request,
            response,
            safeBody,
            resData,
            startTime,
            tenantId,
            userId,
            customerId,
          ),
        error: (err) =>
          this.logAction(
            audit,
            request,
            response,
            safeBody,
            null,
            startTime,
            tenantId,
            userId,
            customerId,
            err,
          ),
      }),
    );
  }

  private logAction(
    audit: any,
    request: any,
    response: any,
    safeBody: any,
    resData: any,
    startTime: number,
    tenantId: string | null,
    userId: string | null,
    customerId: string | null,
    error?: any,
  ) {
    const durationMs = Date.now() - startTime;
    const statusCode = error ? error.status || 500 : response.statusCode;
    const resourceId = resData?.id || request.params?.id || null;

    const action = audit?.action || `${request.method} ${request.url}`;
    const resource = audit?.resource || request.url;

    this.prisma.auditLog
      .create({
        data: {
          tenantId,
          userId,
          customerId,
          action,
          resource,
          resourceId,
          endpoint: request.url,
          method: request.method,
          statusCode,
          durationMs,
          details: {
            request: safeBody,
            response: resData,
            error: error?.message,
          } as any,
          ipAddress:
            request.headers['x-forwarded-for'] ||
            request.ip ||
            request.connection?.remoteAddress,
          userAgent: request.headers['user-agent'],
        },
      })
      .catch((err) => {
        this.logger.error(
          `Failed to create absolute audit log: ${action}`,
          err,
        );
      });
  }
}
