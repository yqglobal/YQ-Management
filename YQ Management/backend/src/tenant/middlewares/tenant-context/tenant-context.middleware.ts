import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../../tenant.service';

export interface RequestWithTenant extends Request {
  tenant: any;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    const host = req.headers.host;
    if (!host) {
      throw new BadRequestException('Host header is missing');
    }

    const manualSubdomain = req.headers['x-tenant-subdomain'] as string;
    let subdomain = manualSubdomain;

    if (!subdomain) {
      if (
        !host.includes('onrender.com') &&
        !host.includes('localhost') &&
        !host.includes('127.0.0.1')
      ) {
        const parts = host.split('.');
        if (parts.length > 1) {
          subdomain = parts[0];
        }
      }
    }

    if (!subdomain) {
      return next(); // Don't block requests without subdomain, as admin routes use JWT
    }

    try {
      const tenant = await this.tenantService.getTenantBySubdomain(subdomain);
      req.tenant = tenant;
      next();
    } catch (err) {
      next(err);
    }
  }
}
