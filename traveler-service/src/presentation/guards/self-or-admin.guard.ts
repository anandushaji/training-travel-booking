import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * For `PUT /travelers/:id/preferences`:
 * - ADMIN or MANAGER may update any traveler's preferences.
 * - EMPLOYEE may only update their own (JWT subject must equal path :id).
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & { user?: { sub: string; role: string }; params: { id?: string } }
    >();

    const user = req.user;
    if (!user) return false;

    if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;

    // EMPLOYEE: must be operating on their own travelerId
    return user.sub === req.params.id;
  }
}
