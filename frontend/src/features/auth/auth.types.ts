export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

/**
 * Role hierarchy: ADMIN > MANAGER > EMPLOYEE.
 * WARNING: Adding a new role requires updating ROLE_RANK in RoleGuard.tsx too.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export interface JwtUserPayload {
  id: string;   // sub claim — traveler UUID
  email: string;
  role: UserRole;
  exp: number;  // epoch seconds
  iat: number;  // epoch seconds
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: JwtUserPayload;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: JwtUserPayload | null;
  isAuthenticated: boolean;
}
