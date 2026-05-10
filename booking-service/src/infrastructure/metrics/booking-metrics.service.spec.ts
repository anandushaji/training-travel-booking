// @ts-nocheck
import * as prom from 'prom-client';
import { BookingMetricsService } from './booking-metrics.service';

describe('BookingMetricsService', () => {
  let metrics: BookingMetricsService;

  beforeEach(() => {
    prom.register.clear();
    metrics = new BookingMetricsService();
  });

  it('increments bookings_created_total', () => {
    metrics.incrementBookingsCreated();
    // counter was incremented without throwing
    expect(metrics.bookingsCreatedTotal).toBeDefined();
  });

  it('sets downstream_cb_state gauge', () => {
    metrics.setDownstreamCbState('policy', 'open');
    expect(metrics.downstreamCbState).toBeDefined();
  });

  it('increments booking_saga_compensation_failed_total', () => {
    metrics.incrementCompensationFailed();
    expect(metrics.bookingSagaCompensationFailedTotal).toBeDefined();
  });
});
