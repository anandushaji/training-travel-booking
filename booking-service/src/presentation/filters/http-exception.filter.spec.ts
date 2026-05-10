// @ts-nocheck
import { HttpExceptionFilter } from './http-exception.filter';
import { NotFoundException as NestNotFoundException, HttpException } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';

const makeHost = (statusFn: jest.Mock, jsonFn: jest.Mock) => ({
  switchToHttp: () => ({
    getResponse: () => ({ status: statusFn, json: jsonFn }),
    getRequest: () => ({ headers: {} }),
  }),
});

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('maps NotFoundException to 404 shape', () => {
    const statusFn = jest.fn().mockReturnThis();
    const jsonFn = jest.fn();
    const host = makeHost(statusFn, jsonFn) as any;

    filter.catch(new NotFoundException('Booking not found'), host);
    expect(statusFn).toHaveBeenCalledWith(404);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'NOT_FOUND', message: 'Booking not found' }),
    );
  });

  it('maps HttpException to correct shape', () => {
    const statusFn = jest.fn().mockReturnThis();
    const jsonFn = jest.fn();
    const host = makeHost(statusFn, jsonFn) as any;

    filter.catch(new NestNotFoundException('resource missing'), host);
    expect(statusFn).toHaveBeenCalledWith(404);
    const body = jsonFn.mock.calls[0][0];
    expect(body.message).toBeDefined();
  });

  it('maps HttpException with string response to correct message', () => {
    const statusFn = jest.fn().mockReturnThis();
    const jsonFn = jest.fn();
    const host = makeHost(statusFn, jsonFn) as any;

    // HttpException('string', status) → getResponse() returns the raw string
    filter.catch(new HttpException('raw string error', 400), host);

    expect(statusFn).toHaveBeenCalledWith(400);
    const body = jsonFn.mock.calls[0][0];
    expect(body.message).toBe('raw string error');
  });

  it('handles a plain Error with 500 status', () => {
    const statusFn = jest.fn().mockReturnThis();
    const jsonFn = jest.fn();
    const host = makeHost(statusFn, jsonFn) as any;

    filter.catch(new Error('something broke'), host);

    expect(statusFn).toHaveBeenCalledWith(500);
    const body = jsonFn.mock.calls[0][0];
    expect(body.message).toBe('An unexpected error occurred');
  });
});
