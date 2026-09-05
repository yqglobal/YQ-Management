import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PAGE_PERMISSION_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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
      if (
        !userPayload.allowedPages ||
        !userPayload.allowedPages.includes(requiredPageId)
      ) {
        throw new ForbiddenException(
          `You do not have permission to access the '${requiredPageId}' feature.`,
        );
      }
      return true;
    }

    return false;
  }
}
