import { Injectable, Logger } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConfigService } from '@nestjs/config';
import { trace, Tracer } from '@opentelemetry/api';

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private readonly sdk: NodeSDK;

  constructor(private readonly config: ConfigService) {
    const endpoint =
      config.get<string>('JAEGER_ENDPOINT') ?? 'http://localhost:14268/api/traces';

    this.sdk = new NodeSDK({
      instrumentations: [getNodeAutoInstrumentations()],
    });

    try {
      this.sdk.start();
      this.logger.log(`OpenTelemetry SDK started; Jaeger endpoint: ${endpoint}`);
    } catch (err) {
      this.logger.warn(`Failed to start OpenTelemetry SDK: ${String(err)}`);
    }
  }

  getTracer(name = 'api-gateway'): Tracer {
    return trace.getTracer(name);
  }
}
