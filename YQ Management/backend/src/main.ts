import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis/redis-io.adapter';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(passport.initialize());

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    maxAge: 86400,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const server = await app.listen(process.env.PORT ?? 3000);

  process.on('SIGTERM', async () => {
    const logger = app.get(Logger);
    logger.log('Received SIGTERM, shutting down gracefully...');
    await server.close();
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    const logger = app.get(Logger);
    logger.log('Received SIGINT, shutting down gracefully...');
    await server.close();
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  });
}
bootstrap();
