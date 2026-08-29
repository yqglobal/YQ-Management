import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PAGE_PERMISSION_KEY = 'requirePagePermission';
export const RequirePagePermission = (pageId: string) =>
  SetMetadata(REQUIRE_PAGE_PERMISSION_KEY, pageId);
