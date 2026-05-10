import { describe, it, expect } from 'vitest';
import { extractCorrelationId, buildQueryString } from './api.utils';

describe('api.utils', () => {
  describe('buildQueryString', () => {
    it('should omit undefined values from query string', () => {
      expect(buildQueryString({ page: 1, limit: undefined })).toBe('?page=1');
    });

    it('should omit null values', () => {
      expect(buildQueryString({ page: 1, filter: null })).toBe('?page=1');
    });

    it('should return empty string when all values are undefined', () => {
      expect(buildQueryString({ page: undefined })).toBe('');
    });

    it('should include multiple non-null values', () => {
      const result = buildQueryString({ page: 1, limit: 10 });
      expect(result).toContain('page=1');
      expect(result).toContain('limit=10');
    });
  });

  describe('extractCorrelationId', () => {
    it('should extract from Headers object', () => {
      const headers = new Headers({ 'x-correlation-id': 'abc-123' });
      expect(extractCorrelationId(headers)).toBe('abc-123');
    });

    it('should extract from plain record', () => {
      expect(extractCorrelationId({ 'x-correlation-id': 'xyz' })).toBe('xyz');
    });

    it('should return null when header missing', () => {
      expect(extractCorrelationId({})).toBeNull();
    });
  });
});
