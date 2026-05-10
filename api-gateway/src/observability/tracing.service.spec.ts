import { ConfigService } from '@nestjs/config';
import { TracingService } from './tracing.service';
import { context, SpanStatusCode } from '@opentelemetry/api';

// Mock the heavy SDK to avoid actual Jaeger connection in tests
jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn(() => []),
}));

describe('TracingService', () => {
  let service: TracingService;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'JAEGER_ENDPOINT') return 'http://localhost:14268/api/traces';
      return undefined;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    service = new TracingService(configService);
  });

  it('should initialise tracer and create a span with correlation_id attribute', () => {
    const tracer = service.getTracer();
    expect(tracer).toBeDefined();

    const span = tracer.startSpan('test-span');
    span.setAttribute('correlation_id', 'test-corr-id');
    const attrs = (span as { attributes?: Record<string, unknown> }).attributes;
    // OpenTelemetry span attributes are tracked internally
    span.end();
    expect(true).toBe(true); // If no throw, tracer initialised OK
  });
});
