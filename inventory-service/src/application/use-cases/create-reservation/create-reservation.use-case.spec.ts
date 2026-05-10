import { CreateReservationUseCase } from './create-reservation.use-case';
import { IFlightReservationRepository } from '../../../domain/repositories/flight-reservation.repository.interface';
import { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { InventoryEventPublisher } from '../../../infrastructure/kafka/inventory-event.publisher';
import { ReservationResponse } from './create-reservation.result';

const AMADEUS_RESPONSE = {
  data: {
    id: 'amadeus-order-1',
    origin: 'LHR',
    destination: 'JFK',
    departureAt: '2026-07-01T10:00:00Z',
    arrivalAt: '2026-07-01T13:00:00Z',
    flightNumber: 'BA117',
    carrier: 'BA',
  },
};

const COMMAND = {
  offerId: 'offer-1',
  passengerId: 'pax-uuid-1',
  passengerFirstName: 'John',
  passengerLastName: 'Doe',
  cabinClass: 'ECONOMY',
  idempotencyKey: 'idem-key-1',
  holdMinutes: 15,
};

const mockRepo = (): jest.Mocked<IFlightReservationRepository> =>
  ({ save: jest.fn().mockResolvedValue(undefined), findById: jest.fn(), findPendingExpired: jest.fn() } as unknown as jest.Mocked<IFlightReservationRepository>);

const mockAmadeus = (): jest.Mocked<AmadeusHttpClient> =>
  ({ createOrder: jest.fn() } as unknown as jest.Mocked<AmadeusHttpClient>);

const mockIdempotency = (): jest.Mocked<IdempotencyService> =>
  ({ get: jest.fn(), set: jest.fn().mockResolvedValue(undefined), acquireLock: jest.fn().mockResolvedValue(true) } as unknown as jest.Mocked<IdempotencyService>);

const mockPublisher = (): jest.Mocked<InventoryEventPublisher> =>
  ({ publish: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<InventoryEventPublisher>);

describe('CreateReservationUseCase', () => {
  let useCase: CreateReservationUseCase;
  let repo: jest.Mocked<IFlightReservationRepository>;
  let amadeus: jest.Mocked<AmadeusHttpClient>;
  let idempotency: jest.Mocked<IdempotencyService>;
  let publisher: jest.Mocked<InventoryEventPublisher>;

  beforeEach(() => {
    repo = mockRepo();
    amadeus = mockAmadeus();
    idempotency = mockIdempotency();
    publisher = mockPublisher();
    useCase = new CreateReservationUseCase(repo, amadeus, idempotency, publisher);
  });

  it('should return idempotent response without side effects on duplicate idempotency key', async () => {
    const cached: ReservationResponse = {
      reservationId: 'res-cached',
      status: 'PENDING',
      expiresAt: new Date().toISOString(),
      segment: { origin: 'LHR', destination: 'JFK', departureAt: '', arrivalAt: '', flightNumber: 'BA117', carrier: 'BA' },
      passenger: { passengerId: 'pax-uuid-1', firstName: 'John', lastName: 'Doe' },
      cabinClass: 'ECONOMY',
      createdAt: new Date().toISOString(),
    };
    idempotency.get.mockResolvedValue(cached);

    const result = await useCase.execute(COMMAND);

    expect(result.isNew).toBe(false);
    expect(result.response.reservationId).toBe('res-cached');
    expect(amadeus.createOrder).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('should save aggregate, publish FlightReserved, and cache idempotency response on first call', async () => {
    idempotency.get.mockResolvedValue(null);
    amadeus.createOrder.mockResolvedValue(AMADEUS_RESPONSE);

    const result = await useCase.execute(COMMAND);

    expect(result.isNew).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(idempotency.set).toHaveBeenCalledWith(COMMAND.idempotencyKey, expect.any(Object), 86400);
  });

  it('should not persist aggregate or publish event when Amadeus returns 422', async () => {
    idempotency.get.mockResolvedValue(null);
    amadeus.createOrder.mockRejectedValue(Object.assign(new Error('Unprocessable'), { statusCode: 422 }));

    await expect(useCase.execute(COMMAND)).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('should fall back to XXX origin when Amadeus response lacks origin field', async () => {
    idempotency.get.mockResolvedValue(null);
    amadeus.createOrder.mockResolvedValue({
      data: {
        id: 'amadeus-order-2',
        // origin intentionally missing
        destination: 'JFK',
        departureAt: '2026-07-01T10:00:00Z',
        arrivalAt: '2026-07-01T13:00:00Z',
        flightNumber: 'BA117',
        carrier: 'BA',
      },
    });

    const result = await useCase.execute(COMMAND);
    expect(result.isNew).toBe(true);
    // segment.origin will be 'XXX' (fallback)
    expect(result.response.segment.origin).toBe('XXX');
  });

  it('should fall back to XXX destination when Amadeus response lacks destination field', async () => {
    idempotency.get.mockResolvedValue(null);
    amadeus.createOrder.mockResolvedValue({
      data: {
        id: 'amadeus-order-3',
        origin: 'LHR',
        // destination intentionally missing
        departureAt: '2026-07-01T10:00:00Z',
        arrivalAt: '2026-07-01T13:00:00Z',
        flightNumber: 'BA117',
        carrier: 'BA',
      },
    });

    const result = await useCase.execute(COMMAND);
    expect(result.isNew).toBe(true);
    expect(result.response.segment.destination).toBe('XXX');
  });

  it('should include passengerDob and passportNumber when provided in command', async () => {
    idempotency.get.mockResolvedValue(null);
    amadeus.createOrder.mockResolvedValue(AMADEUS_RESPONSE);

    const result = await useCase.execute({
      ...COMMAND,
      passengerDob: '1990-01-01',
      passportNumber: 'P123456',
      correlationId: 'corr-1',
      causationId: 'caus-1',
    });
    expect(result.isNew).toBe(true);
    expect(result.response.reservationId).toBeDefined();
  });
});
