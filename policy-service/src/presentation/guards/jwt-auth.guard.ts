import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../application/use-cases/validate-policy.use-case';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.decodeJwt(token);
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid JWT token');
    }
  }

  private decodeJwt(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    const payloadBase64 = parts[1];
    if (!payloadBase64) throw new Error('Invalid JWT');
    const payload = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    return JSON.parse(payload) as JwtPayload;
  }
}
