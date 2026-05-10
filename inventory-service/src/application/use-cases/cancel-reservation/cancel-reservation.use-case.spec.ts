import { CancelReservationUseCase } from './cancel-reservation.use-case';
import { IFlightReservationRepository } from '../../../domain/repositories/flight-reservation.repository.interface';
import { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import { InventoryEventPublisher } from '../../../infrastructure/kafka/inventory-event.publisher';
import { FlightReservation } from '../../../domain/aggregates/flight-reservation.aggregate';
import { FlightSegment } from '../../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../../domain/value-objects/passenger-details.value-object';
import { ReservationStatus } from '../../../domain/value-objects/reservation-status.value-object';
import { CabinClass } from '../../../domain/value-objects/cabin-class.value-object';
import { DomainException, NotFoundException } from '@travel/shared';

function makeReservation(status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED', amadeusOrderId: string | null = 'amadeus-order-1'): FlightReservation {
  const now = new Date();
  const props = {
    id: 'res-uuid-1',
    offerId: 'offer-1',
    amadeusOrderId,
    segment: new FlightSegment({
      origin: 'LHR', destination: 'JFK',
      departureDate: new Date('2026-07-01T10:00:00Z'),
      arrivalDate: new Date('2026-07-01T13:00:00Z'),
      flightNumber: 'BA117', carrier: 'BA',
    }),
    passenger: new PassengerDetails({ passengerId: 'pax-1', firstName: 'John', lastName: 'Doe' }),
    status: new ReservationStatus(status),
    cabinClass: new CabinClass('ECONOMY'),
    idempotencyKey: 'idem-key-1',
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };
  return new FlightReservation(props);
}

const mockRepo = (reservation: FlightReservation | null): jest.Mocked<IFlightReservationRepository> =>
  ({ findById: jest.fn().mockResolvedValue(reservation), save: jest.fn().mockResolvedValue(undefined), findPendingExpired: jest.fn() } as unknown as jest.Mocked<IFlightReservationRepository>);

const mockAmadeus = (): jest.Mocked<AmadeusHttpClient> =>
  ({ cancelOrder: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<AmadeusHttpClient>);

const mockPublisher = (): jest.Mocked<InventoryEventPublisher> =>
  ({ publish: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<InventoryEventPublisher>);

describe('CancelReservationUseCase', () => {
  it('should cancel PENDING reservation and publish FlightReservationCancelled', async () => {
    const reservation = makeReservation('PENDING');
    const repo = mockRepo(reservation);
    const amadeus = mockAmadeus();
    const publisher = mockPublisher();
    const useCase = new CancelReservationUseCase(repo, amadeus, publisher);

    await useCase.execute({ reservationId: 'res-uuid-1' });

    expect(amadeus.cancelOrder).toHaveBeenCalledWith('amadeus-order-1');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it('should throw DomainException and not call Amadeus when reservation is EXPIRED', async () => {
    const reservation = makeReservation('EXPIRED');
    const repo = mockRepo(reservation);
    const amadeus = mockAmadeus();
    const publisher = mockPublisher();
    const useCase = new CancelReservationUseCase(repo, amadeus, publisher);

    await expect(useCase.execute({ reservationId: 'res-uuid-1' })).rejects.toBeInstanceOf(DomainException);
    expect(amadeus.cancelOrder).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when reservation does not exist', async () => {
    const repo = mockRepo(null);
    const useCase = new CancelReservationUseCase(repo, mockAmadeus(), mockPublisher());
    await expect(useCase.execute({ reservationId: 'not-exist' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
