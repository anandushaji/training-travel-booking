import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  selectUser,
  selectIsAuthenticated,
  selectRefreshToken,
  setCredentials,
} from '../../features/auth/authSlice';
import { logoutAction } from '../../features/auth/logoutAction';
import { useLoginMutation, useLogoutApiMutation } from '../../features/auth/authApi';
import type { LoginRequest, JwtUserPayload } from '../../features/auth/auth.types';

export interface UseAuthReturn {
  user: JwtUserPayload | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const refreshToken = useAppSelector(selectRefreshToken);
  const [loginMutation, { isLoading, error: loginError }] = useLoginMutation();
  const [logoutApiMutation] = useLogoutApiMutation();

  const login = async (credentials: LoginRequest): Promise<void> => {
    const result = await loginMutation(credentials);
    if ('error' in result) {
      const err = result.error as { status?: number; data?: { message?: string } };
      // Always surface a user-friendly message for 401; other errors use
      // the server message when available, falling back to a generic string.
      const message =
        err?.status === 401
          ? 'Invalid email or password'
          : (err?.data?.message ?? 'Login failed. Please try again.');
      throw new Error(message);
    }
    dispatch(setCredentials(result.data));
  };

  const logout = (): void => {
    const rt = refreshToken; // captured before state is cleared

    // Clear auth state + RTK cache synchronously
    dispatch(logoutAction());

    // Fire-and-forget: best-effort server-side token invalidation
    if (rt) {
      logoutApiMutation({ refreshToken: rt }).catch(() => {
        // Intentionally swallowed — logout is non-blocking
      });
    }
  };

  const errorMessage = loginError
    ? ((loginError as { data?: { message?: string } })?.data?.message ?? 'Login failed')
    : null;

  return {
    user,
    isAuthenticated,
    login,
    logout,
    isLoading,
    error: errorMessage,
  };
}
