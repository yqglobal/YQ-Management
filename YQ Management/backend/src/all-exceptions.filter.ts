import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      error:
        exception instanceof Error
          ? {
              message: exception.message,
              stack: exception.stack,
              name: exception.name,
            }
          : exception,
    };

    this.logger.error(errorLog, 'Unhandled exception');

    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();
      message =
        typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody
          ? (responseBody as any).message
          : responseBody;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const formattedMessage = Array.isArray(message) ? message : [message];

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: formattedMessage,
    });
  }
}
