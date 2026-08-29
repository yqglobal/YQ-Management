import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'ws') {
      return true;
    }

    const client: Socket = context.switchToWs().getClient();
    
    try {
      // Extract token from auth payload or cookie
      const authHeader = client.handshake?.auth?.token;
      let token = authHeader;

      if (!token && client.handshake?.headers?.cookie) {
        const cookies = client.handshake.headers.cookie.split(';');
        const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

      if (!token) {
        throw new WsException('Missing authentication token');
      }

      // Verify the token
      const payload = this.jwtService.verify(token);
      
      // Attach the user to the socket object
      (client as any).user = payload;
      
      return true;
    } catch (err: any) {
      this.logger.warn(`Unauthorized WebSocket connection attempt: ${err.message}`);
      throw new WsException('Unauthorized');
    }
  }
}
