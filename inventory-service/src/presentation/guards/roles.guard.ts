import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Reads X-User-Role header (injected by API Gateway) and enforces @Roles metadata.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const role = request.headers['x-user-role'];
    if (!role) {
      throw new ForbiddenException('Missing X-User-Role header');
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(`Role ${role} is not authorised`);
    }
    return true;
  }
}
