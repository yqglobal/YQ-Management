import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * TenantGuard — ensures the authenticated user has a tenantId.
 * Replaces the old WorkspaceGuard.
 * Import { TenantGuard } from '../auth/tenant.guard' in controllers.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (!user.tenantId) {
      throw new ForbiddenException(
        'No tenant associated with this account. Please complete onboarding.',
      );
    }
    return true;
  }
}
