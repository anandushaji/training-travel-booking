import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DomainException } from '@travel/shared';

function makeHost(statusFn: jest.Mock, jsonFn: jest.Mock, headers: Record<string, string> = {}): any {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status: statusFn,
        json: jsonFn,
      }),
      getRequest: () => ({
        headers: { 'x-correlation-id': 'test-correlation-id', ...headers },
      }),
    }),
  };
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

  it('should format error response with correlationId and timestamp', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new HttpException('Bad request', HttpStatus.BAD_REQUEST), host);

    expect(statusMock).toHaveBeenCalledWith(400);
    const body = jsonMock.mock.calls[0][0];
    expect(body).toHaveProperty('correlationId', 'test-correlation-id');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
  });

  it('should handle DomainException correctly', () => {
    const host = makeHost(statusMock, jsonMock);
    const domainEx = new DomainException('Payment not allowed', 'PAYMENT_FORBIDDEN', 409);
    filter.catch(domainEx, host);

    expect(statusMock).toHaveBeenCalledWith(409);
    const body = jsonMock.mock.calls[0][0];
    expect(body.error).toBe('PAYMENT_FORBIDDEN');
  });

  it('should return 500 for unknown errors', () => {
    const host = makeHost(statusMock, jsonMock);
    filter.catch(new Error('Unknown'), host);

    expect(statusMock).toHaveBeenCalledWith(500);
  });

  it('should handle HttpException with a string response body', () => {
    const host = makeHost(statusMock, jsonMock);
    // HttpException with a plain string response
    const ex = new HttpException('Plain string error', HttpStatus.UNPROCESSABLE_ENTITY);
    // Override getResponse to return a plain string
    jest.spyOn(ex, 'getResponse').mockReturnValue('plain error string');

    filter.catch(ex, host);

    expect(statusMock).toHaveBeenCalledWith(422);
    const body = jsonMock.mock.calls[0]![0];
    expect(body.message).toBe('plain error string');
  });

  it('should join array messages in HttpException response', () => {
    const host = makeHost(statusMock, jsonMock);
    const ex = new HttpException(
      { message: ['field1 is required', 'field2 must be a string'], error: 'Bad Request', statusCode: 400 },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(ex, host);

    expect(statusMock).toHaveBeenCalledWith(400);
    const body = jsonMock.mock.calls[0]![0];
    expect(body.message).toBe('field1 is required; field2 must be a string');
    expect(body.details).toEqual(['field1 is required', 'field2 must be a string']);
  });

  it('should include DomainException context in details', () => {
    const host = makeHost(statusMock, jsonMock);
    const domainEx = new DomainException('Not allowed', 'FORBIDDEN', 403, { paymentId: 'p-001' });

    filter.catch(domainEx, host);

    expect(statusMock).toHaveBeenCalledWith(403);
    const body = jsonMock.mock.calls[0]![0];
    expect(body.details).toEqual([{ paymentId: 'p-001' }]);
  });

  it('should use "unknown" as correlationId when x-correlation-id header is absent', () => {
    const host = makeHost(statusMock, jsonMock, {});
    // makeHost doesn't include x-correlation-id in headers
    const hostNoCorr = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock, json: jsonMock }),
        getRequest: () => ({ headers: {} }),
      }),
    };

    filter.catch(new Error('Something'), hostNoCorr as any);

    const body = jsonMock.mock.calls[0]![0];
    expect(body.correlationId).toBe('unknown');
  });

  it('should fall back to constructor name when HttpException response object lacks error field', () => {
    const host = makeHost(statusMock, jsonMock);
    // HttpException with object response that has no 'error' key
    const ex = new HttpException({ statusCode: 400 }, HttpStatus.BAD_REQUEST);

    filter.catch(ex, host);

    expect(statusMock).toHaveBeenCalledWith(400);
    const body = jsonMock.mock.calls[0]![0];
    // Should fall back to the exception constructor name
    expect(body.error).toBe('HttpException');
  });

  it('should fall back to exception.message when HttpException response object lacks message field', () => {
    const host = makeHost(statusMock, jsonMock);
    const ex = new HttpException({ statusCode: 400, error: 'Custom' }, HttpStatus.BAD_REQUEST);

    filter.catch(ex, host);

    const body = jsonMock.mock.calls[0]![0];
    expect(body.error).toBe('Custom');
    // message falls back to exception.message since response has no 'message' key
    expect(typeof body.message).toBe('string');
  });
});
