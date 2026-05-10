import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Stub JWT guard — validates presence of `Authorization: Bearer <token>`.
 * In production the API Gateway forwards a pre-validated JWT; this service
 * only decodes the claims (no signature verification needed).
 * A real implementation would use @nestjs/passport + passport-jwt.
 * For tests, override this guard with a mock that injects req.user directly.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & { user?: { sub: string; role: string } }
    >();

    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return false;

    // Decode without verify — signature is validated upstream by API Gateway
    try {
      const token = auth.split(' ')[1];
      const payload = JSON.parse(
        Buffer.from(token!.split('.')[1]!, 'base64').toString('utf8'),
      );
      req.user = { sub: payload.sub, role: payload.role };
      return true;
    } catch {
      return false;
    }
  }
}
