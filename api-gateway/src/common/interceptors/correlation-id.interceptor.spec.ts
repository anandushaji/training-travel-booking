import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { CorrelationIdInterceptor } from './correlation-id.interceptor';

function makeContext(headers: Record<string, string | undefined>): {
  context: ExecutionContext;
  responseHeaders: Record<string, string>;
  requestObj: { headers: Record<string, string | undefined>; correlationId?: string };
} {
  const responseHeaders: Record<string, string> = {};
  const requestObj: { headers: Record<string, string | undefined>; correlationId?: string } = { headers };
  const context = {
    switchToHttp: () => ({
      getRequest: () => requestObj,
      getResponse: () => ({
        setHeader: (name: string, value: string) => {
          responseHeaders[name] = value;
        },
      }),
    }),
  } as unknown as ExecutionContext;
  return { context, responseHeaders, requestObj };
}

function makeHandler(): CallHandler {
  return { handle: () => of(null) };
}

describe('CorrelationIdInterceptor', () => {
  const interceptor = new CorrelationIdInterceptor();

  it('should preserve provided X-Correlation-ID and attach to response', (done) => {
    const { context, responseHeaders, requestObj } = makeContext({ 'x-correlation-id': 'test-id-123' });
    interceptor.intercept(context, makeHandler()).subscribe(() => {
      expect(requestObj.correlationId).toBe('test-id-123');
      expect(responseHeaders['X-Correlation-ID']).toBe('test-id-123');
      done();
    });
  });

  it('should generate UUID v4 when X-Correlation-ID header is absent', (done) => {
    const { context, requestObj } = makeContext({});
    interceptor.intercept(context, makeHandler()).subscribe(() => {
      expect(requestObj.correlationId).toBeDefined();
      expect(typeof requestObj.correlationId).toBe('string');
      done();
    });
  });

  it('should generate a value matching UUID v4 regex pattern', (done) => {
    const { context, requestObj } = makeContext({});
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    interceptor.intercept(context, makeHandler()).subscribe(() => {
      expect(requestObj.correlationId).toMatch(uuidRegex);
      done();
    });
  });
});
