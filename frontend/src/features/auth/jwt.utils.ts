import type { JwtUserPayload } from './auth.types';

/**
 * Base64url-decode a segment of a JWT.
 * Replaces URL-safe chars and pads before calling atob.
 */
function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (padded.length % 4)) % 4;
  return atob(padded + '='.repeat(padding));
}

/**
 * Decode a JWT payload WITHOUT verifying the signature.
 * The API Gateway is the trust boundary — signature validation is server-side only.
 *
 * Maps the standard `sub` claim → `id` on the returned object.
 */
export function decodeJwt(token: string): JwtUserPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid JWT format: expected 3 segments, got ${parts.length}`);
  }
  const raw = base64UrlDecode(parts[1]);
  const claims = JSON.parse(raw) as Record<string, unknown>;
  return {
    id: claims.sub as string,
    email: claims.email as string,
    role: claims.role as JwtUserPayload['role'],
    exp: claims.exp as number,
    iat: (claims.iat as number) ?? 0,
  };
}

/**
 * Returns true if the token's `exp` claim is in the past.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const { exp } = decodeJwt(token);
    return exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/**
 * Safe wrapper around decodeJwt — returns null on any error.
 */
export function getPayload(token: string): JwtUserPayload | null {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}
