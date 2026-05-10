import { DomainExceptionFilter } from './domain-exception.filter';
import { DomainException } from '@travel/shared';
import { HttpStatus } from '@nestjs/common';

function makeHost(statusFn: jest.Mock, jsonFn: jest.Mock, headers: Record<string, string> = {}) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusFn, json: jsonFn }),
      getRequest: () => ({ headers }),
    }),
  } as never;
}

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    filter = new DomainExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  });

  it('should respond with the exception statusCode and code when statusCode is a valid HttpStatus', () => {
    const exception = new DomainException('Not found', 'NotFound', 404);
    const host = makeHost(statusMock, jsonMock);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'NotFound', message: 'Not found' }),
    );
  });

  it('should fall back to 500 when exception statusCode is not a valid HttpStatus', () => {
    const exception = new DomainException('Oops', 'CUSTOM_CODE', 999);
    const host = makeHost(statusMock, jsonMock);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should include correlationId from X-Correlation-Id header', () => {
    const exception = new DomainException('Conflict', 'CONFLICT', 422);
    const host = makeHost(statusMock, jsonMock, { 'x-correlation-id': 'corr-123' });

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'corr-123' }),
    );
  });

  it('should use empty string as correlationId when header is absent', () => {
    const exception = new DomainException('Error', 'ERR', 422);
    const host = makeHost(statusMock, jsonMock, {});

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: '' }),
    );
  });
});
