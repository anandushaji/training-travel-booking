import { HttpExceptionFilter } from './http-exception.filter';
import { NotFoundException, BadRequestException, ArgumentsHost } from '@nestjs/common';
import { DomainException } from '@travel/shared';

function makeHost(statusFn: jest.Mock, jsonFn: jest.Mock) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status: statusFn,
      }),
      getRequest: () => ({
        headers: { 'x-correlation-id': 'test-corr-id' },
      }),
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let statusFn: jest.Mock;
  let jsonFn: jest.Mock;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  });

  it('maps NotFoundException to 404 with error shape', () => {
    const host = makeHost(statusFn, jsonFn);
    filter.catch(new NotFoundException('Policy not found'), host);

    expect(statusFn).toHaveBeenCalledWith(404);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String),
        message: expect.any(String),
        details: expect.any(Array),
      }),
    );
  });

  it('maps DomainException to its statusCode', () => {
    const host = makeHost(statusFn, jsonFn);
    const domainErr = new DomainException('Policy conflict', 'POLICY_CONFLICT', 409);
    filter.catch(domainErr, host);

    expect(statusFn).toHaveBeenCalledWith(409);
    const body = jsonFn.mock.calls[0]![0];
    expect(body.error).toBe('POLICY_CONFLICT');
  });

  it('returns 400 for BadRequestException', () => {
    const host = makeHost(statusFn, jsonFn);
    filter.catch(new BadRequestException('Validation failed'), host);

    expect(statusFn).toHaveBeenCalledWith(400);
  });

  it('handles HttpException where getResponse() returns a plain string', () => {
    // NestJS allows throwing new HttpException('plain string', 403)
    const { HttpException } = require('@nestjs/common');
    const host = makeHost(statusFn, jsonFn);
    const err = new HttpException('Forbidden resource', 403);
    filter.catch(err, host);

    expect(statusFn).toHaveBeenCalledWith(403);
    const body = jsonFn.mock.calls[0]![0];
    expect(body.message).toBe('Forbidden resource');
  });

  it('returns 500 for unknown errors', () => {
    const host = makeHost(statusFn, jsonFn);
    filter.catch(new Error('Unexpected'), host);

    expect(statusFn).toHaveBeenCalledWith(500);
  });
});
