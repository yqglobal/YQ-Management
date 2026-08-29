import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PAGE_PERMISSION_KEY } from './permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPageId = this.reflector.getAllAndOverride<string>(
      REQUIRE_PAGE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPageId) {
      return true; // No specific page permission required
    }

    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;

    if (!userPayload) {
      return false; // Not authenticated
    }

    // Admins and owners bypass page permissions usually, but let's check roles
    if (userPayload.role === 'OWNER' || userPayload.role === 'ADMIN') {
      return true;
    }

    if (userPayload.role === 'OPERATOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userPayload.userId },
        select: { allowedPages: true }
      });

      if (!user || !user.allowedPages || !user.allowedPages.includes(requiredPageId)) {
        throw new ForbiddenException(`You do not have permission to access the '${requiredPageId}' feature.`);
      }
      return true;
    }

    return false;
  }
}
