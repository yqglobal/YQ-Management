import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger(QueueGateway.name);

  constructor(private readonly redisService: RedisService) {}

  private sanitizePayload(data: any): any {
    if (!data) return data;
    const sanitized = { ...data };
    
    // Explicitly delete PII fields that might be embedded
    if (sanitized.customer) delete sanitized.customer;
    if (sanitized.customerName) delete sanitized.customerName;
    if (sanitized.phone) delete sanitized.phone;
    if (sanitized.email) delete sanitized.email;
    if (sanitized.operatorUser) delete sanitized.operatorUser;
    
    // Also scrub nested objects if they contain these fields
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizePayload(sanitized[key]);
      }
    }
    return sanitized;
  }

  onModuleInit() {
    this.redisService.subscriber.subscribe('queue_events', (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe to queue_events channel', err);
      } else {
        this.logger.log(`Subscribed to queue_events channel (${count})`);
      }
    });

    this.redisService.subscriber.on('message', (channel, message) => {
      if (channel === 'queue_events') {
        try {
          const payload = JSON.parse(message);
          const { type, queueId, tenantId, ...data } = payload;
          const sanitizedData = this.sanitizePayload(data);
          
          if (queueId) {
            this.broadcastQueueUpdate(queueId, type, sanitizedData);
          }
          if (tenantId) {
            this.broadcastTenantUpdate(tenantId, type, sanitizedData);
          }
        } catch (error) {
          this.logger.error('Failed to parse queue_events message', error);
        }
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinQueueRoom')
  handleJoinQueueRoom(
    @MessageBody() queueId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`queue_${queueId}`);
    this.logger.log(`Client ${client.id} joined room queue_${queueId}`);
    return { event: 'joinedRoom', data: `queue_${queueId}` };
  }

  @SubscribeMessage('joinTenantRoom')
  handleJoinTenantRoom(
    @MessageBody() tenantId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`tenant_${tenantId}`);
    this.logger.log(`Client ${client.id} joined room tenant_${tenantId}`);
    return { event: 'joinedRoom', data: `tenant_${tenantId}` };
  }

  broadcastQueueUpdate(queueId: string, event: string, payload: any) {
    this.server.to(`queue_${queueId}`).emit(event, payload);
    // Also broadcast to the tenant admin room
    // For MVP, we might not have tenantId here, but assume it's sent in payload or separate call
  }

  broadcastTenantUpdate(tenantId: string, event: string, payload: any) {
    this.server.to(`tenant_${tenantId}`).emit(event, payload);
  }
}
