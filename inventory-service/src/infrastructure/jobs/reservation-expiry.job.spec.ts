import { ReservationExpiryJob } from './reservation-expiry.job';
import { IFlightReservationRepository } from '../../domain/repositories/flight-reservation.repository.interface';
import { InventoryEventPublisher } from '../kafka/inventory-event.publisher';
import { MetricsService } from '../observability/metrics.service';
import { FlightReservation } from '../../domain/aggregates/flight-reservation.aggregate';
import { FlightSegment } from '../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../domain/value-objects/passenger-details.value-object';
import { ReservationStatus } from '../../domain/value-objects/reservation-status.value-object';
import { CabinClass } from '../../domain/value-objects/cabin-class.value-object';

function makeExpiredReservation(id: string): FlightReservation {
  const past = new Date(Date.now() - 5 * 60 * 1000);
  const props = {
    id,
    offerId: 'offer-1',
    amadeusOrderId: null,
    segment: new FlightSegment({
      origin: 'LHR', destination: 'JFK',
      departureDate: new Date('2026-07-01T10:00:00Z'),
      arrivalDate: new Date('2026-07-01T13:00:00Z'),
      flightNumber: 'BA117', carrier: 'BA',
    }),
    passenger: new PassengerDetails({ passengerId: 'pax-1', firstName: 'John', lastName: 'Doe' }),
    status: new ReservationStatus('PENDING'),
    cabinClass: new CabinClass('ECONOMY'),
    idempotencyKey: `idem-${id}`,
    expiresAt: past,
    createdAt: past,
    updatedAt: past,
  };
  return new FlightReservation(props);
}

const mockRepo = (reservations: FlightReservation[]): jest.Mocked<IFlightReservationRepository> =>
  ({
    findPendingExpired: jest.fn().mockResolvedValue(reservations),
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
  } as unknown as jest.Mocked<IFlightReservationRepository>);

const mockPublisher = (): jest.Mocked<InventoryEventPublisher> =>
  ({ publish: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<InventoryEventPublisher>);

const mockMetrics = (): jest.Mocked<MetricsService> =>
  ({ incrementReservationsExpired: jest.fn() } as unknown as jest.Mocked<MetricsService>);

describe('ReservationExpiryJob', () => {
  it('should expire all PENDING expired reservations and publish FlightReservationExpired for each', async () => {
    const r1 = makeExpiredReservation('res-1');
    const r2 = makeExpiredReservation('res-2');
    const repo = mockRepo([r1, r2]);
    const publisher = mockPublisher();
    const metrics = mockMetrics();
    const job = new ReservationExpiryJob(repo, publisher, metrics);

    await job.expireReservations();

    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(publisher.publish).toHaveBeenCalledTimes(2);
    expect(metrics.incrementReservationsExpired).toHaveBeenCalledTimes(2);
  });

  it('should continue processing remaining reservations when Kafka publish fails for one', async () => {
    const r1 = makeExpiredReservation('res-1');
    const r2 = makeExpiredReservation('res-2');
    const repo = mockRepo([r1, r2]);
    const publisher = mockPublisher();
    publisher.publish
      .mockRejectedValueOnce(new Error('Kafka down'))
      .mockResolvedValueOnce(undefined);
    const metrics = mockMetrics();
    const job = new ReservationExpiryJob(repo, publisher, metrics);

    await job.expireReservations();

    // Second reservation should still be published despite first failing
    expect(publisher.publish).toHaveBeenCalledTimes(2);
    expect(metrics.incrementReservationsExpired).toHaveBeenCalledTimes(1); // only r2 succeeds
  });

  it('should be a no-op when no expired reservations exist', async () => {
    const repo = mockRepo([]);
    const publisher = mockPublisher();
    const metrics = mockMetrics();
    const job = new ReservationExpiryJob(repo, publisher, metrics);

    await job.expireReservations();

    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(metrics.incrementReservationsExpired).not.toHaveBeenCalled();
  });
});
