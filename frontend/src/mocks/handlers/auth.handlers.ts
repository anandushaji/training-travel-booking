import { http, HttpResponse } from 'msw';
import type { TokenPairResponse } from '../../features/auth/auth.types';

export const defaultTokenPair: TokenPairResponse = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresIn: 28800,
  user: { id: 'u1', email: 'test@corp.com', role: 'EMPLOYEE', exp: 9999999999, iat: 1000000000 },
};

// Use absolute URL matching http://localhost/api/* so Node.js native fetch
// (undici) and RTK Query's fetchBaseQuery both work in the jsdom test environment.
export const authHandlers = [
  http.post('http://localhost/api/auth/login', () => HttpResponse.json(defaultTokenPair)),
  http.post('http://localhost/api/auth/refresh', () =>
    HttpResponse.json({
      ...defaultTokenPair,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }),
  ),
  http.post('http://localhost/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
