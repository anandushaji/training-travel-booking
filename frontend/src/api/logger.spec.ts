import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';
import type { LogPayload } from './logger';

describe('logger', () => {
  it('should emit JSON log with all required fields', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('Test message', { requestId: '123' });

    expect(spy).toHaveBeenCalledOnce();
    const raw = spy.mock.calls[0]?.[0] as string;
    const payload = JSON.parse(raw) as LogPayload;

    expect(payload.timestamp).toBeTruthy();
    expect(payload.level).toBe('debug');
    expect(payload.service).toBe('frontend');
    expect('correlationId' in payload).toBe(true);
    expect(payload.message).toBe('Test message');

    spy.mockRestore();
  });

  it('should use console.warn for warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Warning message');
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('should use console.info for info level', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('Info message');
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
