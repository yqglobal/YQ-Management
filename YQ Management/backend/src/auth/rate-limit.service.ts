import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(private readonly redisService: RedisService) {
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  }

  async checkLimit(ip: string, route: string): Promise<void> {
    const key = `ratelimit:${ip}:${route}`;
    const now = Date.now();

    try {
      const current = await this.redisService.client.get(key);

      if (!current) {
        await this.redisService.client.setex(
          key,
          Math.ceil(this.windowMs / 1000),
          '1',
        );
        return;
      }

      const count = parseInt(current, 10);

      if (count >= this.maxRequests) {
        const ttl = await this.redisService.client.ttl(key);
        throw new BadRequestException(
          `Too many requests. Please try again in ${ttl} seconds.`,
        );
      }

      await this.redisService.client.incr(key);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.redisService.client.on('error', (err) => {
        this.logger.error(
          { error: err?.message || err },
          'Redis rate limit error',
        );
      });
    }
  }
}
