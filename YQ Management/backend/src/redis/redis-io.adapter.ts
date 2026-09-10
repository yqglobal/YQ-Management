import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });
    pubClient.on('error', (err) => {
      console.error('Redis adapter pubClient error:', err);
    });

    const subClient = pubClient.duplicate();
    subClient.on('error', (err) => {
      console.error('Redis adapter subClient error:', err);
    });

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const serverOptions: any = {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
      // Explicit heartbeat settings to prevent idle disconnections.
      // Default is 25s interval + 20s timeout = 45s before a dead client is detected.
      // With these settings: 10s interval + 5s timeout = 15s max before cleanup.
      // This ensures mobile/laptop sleep reconnects are handled quickly and
      // rooms (tenant_xxx, queue_xxx) are never left in a stale state.
      pingInterval: 10000,
      pingTimeout: 5000,
    };
    const server = super.createIOServer(port, serverOptions);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
