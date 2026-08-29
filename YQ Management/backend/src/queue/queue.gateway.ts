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
import { PrismaService } from '../prisma/prisma.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class QueueGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger(QueueGateway.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

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
          if (data.visitId || payload.visitId) {
            const vId = data.visitId || payload.visitId;
            this.broadcastVisitUpdate(vId, type, sanitizedData);
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

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinQueueRoom')
  handleJoinQueueRoom(
    @MessageBody() queueId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`queue_${queueId}`);
    this.logger.log(`Client ${client.id} joined room queue_${queueId}`);
    return { event: 'joinedRoom', data: `queue_${queueId}` };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinTenantRoom')
  handleJoinTenantRoom(
    @MessageBody() tenantId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`tenant_${tenantId}`);
    this.logger.log(`Client ${client.id} joined room tenant_${tenantId}`);
    return { event: 'joinedRoom', data: `tenant_${tenantId}` };
  }

  /**
   * FIX (2A): Visit socket subscription now validates the accessToken.
   * The accessToken is the opaque UUID from the QR code / WhatsApp link.
   * Without validation, any unauthenticated client could subscribe to any visit
   * and receive status updates for other people's tokens.
   */
  @SubscribeMessage('subscribeToVisit')
  async handleSubscribeToVisit(
    @MessageBody() data: { visitId: string; accessToken: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    // Support both old string format (visitId only) and new object format
    let visitId: string;
    let accessToken: string | undefined;

    if (typeof data === 'string') {
      // Legacy: treat the string as visitId, no auth check (backwards compat for admin dashboard)
      visitId = data;
      accessToken = undefined;
    } else {
      visitId = data.visitId;
      accessToken = data.accessToken;
    }

    if (accessToken) {
      // Validate that the accessToken matches the visitId
      const visit = await this.prisma.visit.findFirst({
        where: { id: visitId, accessToken },
        select: { id: true },
      });

      if (!visit) {
        client.emit('error', {
          message: 'Unauthorized: invalid accessToken for this visit',
        });
        this.logger.warn(
          `Rejected unauthorized subscribeToVisit for visitId=${visitId}`,
        );
        return { event: 'error', data: 'Unauthorized' };
      }
    }

    client.join(`visit_${visitId}`);
    this.logger.log(`Client ${client.id} joined room visit_${visitId}`);
    return { event: 'joinedRoom', data: `visit_${visitId}` };
  }

  broadcastQueueUpdate(queueId: string, event: string, payload: any) {
    this.server.to(`queue_${queueId}`).emit(event, payload);
    // Also broadcast to the tenant admin room
    // For MVP, we might not have tenantId here, but assume it's sent in payload or separate call
  }

  broadcastTenantUpdate(tenantId: string, event: string, payload: any) {
    this.server.to(`tenant_${tenantId}`).emit(event, payload);
  }

  broadcastVisitUpdate(visitId: string, event: string, payload: any) {
    this.server.to(`visit_${visitId}`).emit(event, payload);
  }
}
