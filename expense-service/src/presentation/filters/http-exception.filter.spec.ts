import { HttpExceptionFilter } from './http-exception.filter';
import { NotFoundException as NestNotFoundException } from '@nestjs/common';
import { NotFoundException, DomainException } from '@travel/shared';
import { ArgumentsHost } from '@nestjs/common';

function makeHost(statusFn: jest.Mock, jsonFn: jest.Mock, correlationId?: string) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusFn, json: jsonFn }),
      getRequest: () => ({
        headers: correlationId ? { 'x-correlation-id': correlationId } : {},
      }),
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  });

  it('maps NotFoundException to 404 shape', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new NestNotFoundException('Receipt not found'), host);
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String), message: expect.any(String) }),
    );
  });

  it('maps DomainException with code and statusCode', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new DomainException('Domain error', 'DOMAIN_ERR', 422), host);
    expect(statusMock).toHaveBeenCalledWith(422);
    const body = jsonMock.mock.calls[0][0];
    expect(body.error).toBe('DOMAIN_ERR');
  });

  it('maps @travel/shared NotFoundException to 404', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new NotFoundException('not found'), host);
    expect(statusMock).toHaveBeenCalledWith(404);
  });

  it('maps generic Error to 500', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new Error('unexpected'), host);
    expect(statusMock).toHaveBeenCalledWith(500);
  });

  it('maps HttpException with plain string response (covers non-object branch)', () => {
    const { HttpException } = require('@nestjs/common');
    const host = makeHost(statusMock, jsonMock);
    // HttpException('string', status) → getResponse() returns 'string'
    filter.catch(new HttpException('plain string error', 418), host);
    expect(statusMock).toHaveBeenCalledWith(418);
    const body = jsonMock.mock.calls[0][0];
    expect(body.message).toBe('plain string error');
  });
});
