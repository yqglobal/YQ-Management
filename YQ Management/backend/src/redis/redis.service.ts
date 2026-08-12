import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;
  public readonly subscriber: Redis;

  constructor() {
    const redisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      // Keep retries limited to avoid noisy infinite retry logs
      maxRetriesPerRequest: 5,
      // Reconnect strategy: exponential backoff up to ~30s
      retryStrategy: (times: number) =>
        Math.min(30000, Math.pow(2, times) * 100),
      // Do not block the event loop indefinitely when offline
      enableOfflineQueue: false,
    } as any;

    this.client = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);
  }

  onModuleInit() {
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('ready', () => this.logger.log('Redis ready'));
    this.client.on('close', () => this.logger.warn('Redis connection closed'));
    this.client.on('reconnecting', () =>
      this.logger.warn('Redis reconnecting'),
    );
    this.client.on('error', (err) => this.logger.error(`Redis Error: ${err}`));

    // Subscriber mirrors some events for better debugging
    this.subscriber.on('error', (err) =>
      this.logger.error(`Redis Subscriber Error: ${err}`),
    );
    this.subscriber.on('connect', () =>
      this.logger.log('Redis subscriber connected'),
    );
  }

  onModuleDestroy() {
    this.client.quit();
    this.subscriber.quit();
  }
}
