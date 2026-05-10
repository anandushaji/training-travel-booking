import React from 'react';
import { useAppSelector } from '../../../app/hooks';
import { selectUser } from '../authSlice';
import { ROLE_RANK } from '../auth.types';
import type { UserRole } from '../auth.types';

interface RoleGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
}

/**
 * Renders children only when the authenticated user's role satisfies
 * the required role (using the hierarchy ADMIN > MANAGER > EMPLOYEE).
 *
 * Returns null when:
 *  - No user is authenticated (auth.user === null)
 *  - The user's role rank is below the required role rank
 *
 * NOTE: If the UserRole enum changes, update ROLE_RANK in auth.types.ts.
 */
export function RoleGuard({ requiredRole, children }: RoleGuardProps): React.ReactElement | null {
  const user = useAppSelector(selectUser);

  if (!user || ROLE_RANK[user.role] < ROLE_RANK[requiredRole]) {
    return null;
  }

  return <>{children}</>;
}
