import { Injectable } from '@nestjs/common';
import * as prom from 'prom-client';

@Injectable()
export class BookingMetricsService {
  readonly httpRequestsTotal: prom.Counter<string>;
  readonly httpRequestDurationSeconds: prom.Histogram<string>;
  readonly bookingsCreatedTotal: prom.Counter<string>;
  readonly bookingsConfirmedTotal: prom.Counter<string>;
  readonly bookingsCancelledTotal: prom.Counter<string>;
  readonly bookingSagaDurationSeconds: prom.Histogram<string>;
  readonly bookingSagaCompensationFailedTotal: prom.Counter<string>;
  readonly downstreamRetriesTotal: prom.Counter<string>;
  readonly downstreamCbState: prom.Gauge<string>;

  constructor() {
    this.httpRequestsTotal = new prom.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDurationSeconds = new prom.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    });

    this.bookingsCreatedTotal = new prom.Counter({
      name: 'bookings_created_total',
      help: 'Total bookings created',
    });

    this.bookingsConfirmedTotal = new prom.Counter({
      name: 'bookings_confirmed_total',
      help: 'Total bookings confirmed',
    });

    this.bookingsCancelledTotal = new prom.Counter({
      name: 'bookings_cancelled_total',
      help: 'Total bookings cancelled',
    });

    this.bookingSagaDurationSeconds = new prom.Histogram({
      name: 'booking_saga_duration_seconds',
      help: 'Booking saga execution time in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.bookingSagaCompensationFailedTotal = new prom.Counter({
      name: 'booking_saga_compensation_failed_total',
      help: 'Total saga compensation failures',
    });

    this.downstreamRetriesTotal = new prom.Counter({
      name: 'downstream_retries_total',
      help: 'Total retries to downstream services',
      labelNames: ['service'],
    });

    this.downstreamCbState = new prom.Gauge({
      name: 'downstream_cb_state',
      help: 'Downstream service circuit breaker state (1=open/half-open, 0=closed)',
      labelNames: ['service', 'state'],
    });
  }

  incrementBookingsCreated(): void {
    this.bookingsCreatedTotal.inc();
  }

  incrementBookingsConfirmed(): void {
    this.bookingsConfirmedTotal.inc();
  }

  incrementBookingsCancelled(): void {
    this.bookingsCancelledTotal.inc();
  }

  incrementDownstreamRetries(service: string): void {
    this.downstreamRetriesTotal.inc({ service });
  }

  setDownstreamCbState(service: string, state: 'open' | 'half-open' | 'closed'): void {
    this.downstreamCbState.set({ service, state }, state === 'closed' ? 0 : 1);
  }

  incrementCompensationFailed(): void {
    this.bookingSagaCompensationFailedTotal.inc();
  }
}
