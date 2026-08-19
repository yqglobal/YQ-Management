import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly header = 'x-request-id';

  use(req: Request, res: Response, next: NextFunction) {
    const existing = req.headers[this.header];
    const requestId = Array.isArray(existing) ? existing[0] : existing;

    const id =
      requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    req.headers[this.header] = id;
    res.setHeader(this.header, id);

    (req as any).requestId = id;
    (req as any).id = id;

    next();
  }
}
