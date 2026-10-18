import { PermissionsGuard } from '../permissions.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PAGE_PERMISSION_KEY } from '../permissions.decorator';
import { Role } from '@prisma/client';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  };

  it('should allow access if no page permission is required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ role: Role.MANAGER });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access if user is not authenticated', async () => {
    reflector.getAllAndOverride.mockReturnValue('settings');
    const context = createMockContext(null);
    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should bypass checks for SUPER_ADMIN, OWNER, and ADMIN', async () => {
    reflector.getAllAndOverride.mockReturnValue('restricted-page');

    for (const role of [Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN]) {
      const context = createMockContext({ role });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }
  });

  it('should throw ForbiddenException for MANAGER if required page is not in allowedPages', async () => {
    reflector.getAllAndOverride.mockReturnValue('billing');
    const context = createMockContext({
      role: Role.MANAGER,
      allowedPages: ['settings', 'dashboard'],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      /You do not have permission/,
    );
  });

  it('should allow MANAGER if required page is in allowedPages', async () => {
    reflector.getAllAndOverride.mockReturnValue('billing');
    const context = createMockContext({
      role: Role.MANAGER,
      allowedPages: ['billing', 'dashboard'],
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException for MANAGER if required page is not in allowedPages', async () => {
    reflector.getAllAndOverride.mockReturnValue('flow:advance');
    const context = createMockContext({
      role: Role.MANAGER,
      allowedPages: [],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow MANAGER if required page is in allowedPages', async () => {
    reflector.getAllAndOverride.mockReturnValue('flow:advance');
    const context = createMockContext({
      role: Role.MANAGER,
      allowedPages: ['flow:advance'],
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if allowedPages is completely undefined for MANAGER', async () => {
    reflector.getAllAndOverride.mockReturnValue('flow:skip');
    const context = createMockContext({
      role: Role.MANAGER,
      // allowedPages is undefined
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
