import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const ROLES_KEY = 'roles';

export function Roles(...roles: string[]): MethodDecorator & ClassDecorator {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    const metadata = roles;
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, metadata, descriptor.value);
    } else {
      Reflect.defineMetadata(ROLES_KEY, metadata, target);
    }
    return descriptor ?? target as any;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as { role?: string } | undefined;

    if (!user || !user.role) {
      throw new ForbiddenException('No role assigned');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role "${user.role}" is not allowed. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
