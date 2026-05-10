import { GetReservationUseCase } from './get-reservation.use-case';
import { IFlightReservationRepository } from '../../../domain/repositories/flight-reservation.repository.interface';
import { NotFoundException } from '@travel/shared';
import { FlightReservation } from '../../../domain/aggregates/flight-reservation.aggregate';
import { FlightSegment } from '../../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../../domain/value-objects/passenger-details.value-object';
import { ReservationStatus } from '../../../domain/value-objects/reservation-status.value-object';
import { CabinClass } from '../../../domain/value-objects/cabin-class.value-object';

function makeReservation(): FlightReservation {
  const now = new Date();
  const future = new Date(now.getTime() + 15 * 60 * 1000);
  const props = {
    id: 'res-uuid-1',
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
    idempotencyKey: 'idem-key-1',
    expiresAt: future,
    createdAt: now,
    updatedAt: now,
  };
  return new FlightReservation(props);
}

const mockRepo = (reservation: FlightReservation | null): jest.Mocked<IFlightReservationRepository> =>
  ({ findById: jest.fn().mockResolvedValue(reservation), save: jest.fn(), findPendingExpired: jest.fn() } as unknown as jest.Mocked<IFlightReservationRepository>);

describe('GetReservationUseCase', () => {
  it('should return ReservationResponse for existing reservation', async () => {
    const reservation = makeReservation();
    const useCase = new GetReservationUseCase(mockRepo(reservation));
    const result = await useCase.execute({ reservationId: 'res-uuid-1' });
    expect(result.reservationId).toBe('res-uuid-1');
    expect(result.status).toBe('PENDING');
    expect(result.segment.origin).toBe('LHR');
    expect(result.passenger.firstName).toBe('John');
  });

  it('should throw NotFoundException when reservation does not exist', async () => {
    const useCase = new GetReservationUseCase(mockRepo(null));
    await expect(useCase.execute({ reservationId: 'not-exist' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
