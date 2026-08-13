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
          
          if (queueId) {
            this.broadcastQueueUpdate(queueId, type, data);
          }
          if (tenantId) {
            this.broadcastTenantUpdate(tenantId, type, data);
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
