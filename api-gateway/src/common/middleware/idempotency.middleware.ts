import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  use(
    req: Request & { idempotencyKey?: string },
    _res: Response,
    next: NextFunction,
  ): void {
    const existing = req.headers['idempotency-key'];
    req.idempotencyKey =
      (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    next();
  }
}
