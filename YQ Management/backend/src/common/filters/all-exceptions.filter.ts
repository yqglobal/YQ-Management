import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    // In certain situations `httpAdapter` might not be available in the constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let stack = undefined;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || JSON.stringify(res);
      stack = exception.stack;
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    } else {
      message = String(exception);
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message,
    };

    // Determine log level based on status code
    const level = httpStatus >= 500 ? 'ERROR' : 'WARN';

    // Extract tenant info if present
    const user = (request as any).user;
    const tenantId = user?.tenantId || request.body?.tenantId || null;

    const contextPayload = {
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: user?.id || user?.userId,
      query: request.query,
    };

    // Attempt to log to DB, fallback to terminal if DB fails
    try {
      await this.prisma.systemLog.create({
        data: {
          level,
          message,
          stackTrace: stack,
          context: contextPayload,
          tenantId,
        }
      });
    } catch (dbError) {
      this.logger.error('Failed to write to SystemLog table', dbError);
    }

    if (level === 'ERROR') {
      this.logger.error(`${request.method} ${request.url} - ${message}`, stack);
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${message}`);
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
