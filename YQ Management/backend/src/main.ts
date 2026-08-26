import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis/redis-io.adapter';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Trust the first proxy (Caddy/Nginx) so we get real client IPs
  // instead of the reverse-proxy's internal IP
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(passport.initialize());

  // Build the list of allowed CORS origins from environment variables.
  // EXTRA_ALLOWED_ORIGINS is a comma-separated list of additional origins
  // (e.g. your production domain). This avoids hardcoding any hostnames here.
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.EXTRA_ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.match(/^https?:\/\/[a-z0-9-]+\.localhost:(3000|3001)$/i))
        return callback(null, true);
        
      // Allow dynamic subdomains of allowed origins (e.g. test.qmova.yqbuddy.com)
      const isSubdomain = allowedOrigins.some((allowed) => {
        try {
          const allowedHost = new URL(allowed).hostname;
          // Only allow subdomains if allowedHost is a valid domain (has a dot)
          if (!allowedHost.includes('.')) return false;
          const originHost = new URL(origin).hostname;
          return originHost.endsWith(`.${allowedHost}`);
        } catch (e) {
          return false;
        }
      });
      if (isSubdomain) return callback(null, true);

      callback(null, false);
    },
    credentials: true,
    maxAge: 86400,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  // NOTE: AllExceptionsFilter is registered globally via APP_FILTER in app.module.ts
  // with PrismaService injected. Do NOT also register it here — that would create
  // two competing error handlers with different capabilities.

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
