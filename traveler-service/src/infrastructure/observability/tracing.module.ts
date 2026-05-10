import { Module } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

/**
 * Initialises OpenTelemetry tracing with OTLP HTTP exporter.
 * Automatically instruments HTTP, pg, and KafkaJS.
 * Must be the first module imported in AppModule.
 */
@Module({})
export class TracingModule {
  private static sdk: NodeSDK | null = null;

  static bootstrap(): void {
    if (TracingModule.sdk) return; // already started

    const jaegerEndpoint =
      process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
      'http://localhost:4318/v1/traces';

    TracingModule.sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: 'traveler-service',
      }),
      traceExporter: new OTLPTraceExporter({ url: jaegerEndpoint }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
        }),
      ],
    });

    try {
      TracingModule.sdk.start();
    } catch (err) {
      console.warn('[TracingModule] Failed to start OpenTelemetry SDK:', err);
    }
  }
}
