import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { decodeJwt, isTokenExpired, getPayload } from '../jwt.utils';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'u1',
    email: 'a@b.com',
    role: 'EMPLOYEE',
    exp: 9999999999,
    iat: 1000000000,
    ...overrides,
  };
}

function encodeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-sig`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('decodeJwt', () => {
  it('REQ-AUTH-02-S01: extracts payload from a valid token', () => {
    const token = encodeJwt(makePayload());
    const result = decodeJwt(token);
    expect(result.id).toBe('u1');
    expect(result.email).toBe('a@b.com');
    expect(result.role).toBe('EMPLOYEE');
    expect(result.exp).toBe(9999999999);
  });

  it('maps sub claim to id field', () => {
    const token = encodeJwt(makePayload({ sub: 'uuid-123' }));
    expect(decodeJwt(token).id).toBe('uuid-123');
  });

  it('throws for tokens with wrong number of segments', () => {
    expect(() => decodeJwt('not.a.valid.jwt.here')).toThrow();
    expect(() => decodeJwt('only.two')).toThrow();
  });
});

describe('isTokenExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('REQ-AUTH-02-S02: returns true for a past exp claim', () => {
    const token = encodeJwt(makePayload({ exp: 1 })); // epoch 1 = 1970-01-01
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns false for a future exp claim', () => {
    const token = encodeJwt(makePayload({ exp: 9999999999 }));
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for a malformed token', () => {
    expect(isTokenExpired('bad')).toBe(true);
  });
});

describe('getPayload', () => {
  it('REQ-AUTH-02-S03: returns null for a malformed token without throwing', () => {
    expect(() => getPayload('not.a.jwt')).not.toThrow();
    expect(getPayload('not.a.jwt')).toBeNull();
  });

  it('returns the decoded payload for a valid token', () => {
    const token = encodeJwt(makePayload());
    expect(getPayload(token)).not.toBeNull();
    expect(getPayload(token)?.email).toBe('a@b.com');
  });

  it('returns null for an empty string', () => {
    expect(getPayload('')).toBeNull();
  });
});
