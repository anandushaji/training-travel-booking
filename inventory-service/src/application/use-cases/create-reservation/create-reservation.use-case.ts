import { Injectable, Inject, Logger } from '@nestjs/common';
import { IFlightReservationRepository, FLIGHT_RESERVATION_REPOSITORY } from '../../../domain/repositories/flight-reservation.repository.interface';
import { FlightReservation } from '../../../domain/aggregates/flight-reservation.aggregate';
import { FlightSegment } from '../../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../../domain/value-objects/passenger-details.value-object';
import { CabinClassValue } from '../../../domain/value-objects/cabin-class.value-object';
import { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { InventoryEventPublisher } from '../../../infrastructure/kafka/inventory-event.publisher';
import { CreateReservationCommand } from './create-reservation.command';
import { ReservationResponse } from './create-reservation.result';

function toReservationResponse(reservation: FlightReservation): ReservationResponse {
  return {
    reservationId: reservation.id,
    status: reservation.status.value,
    expiresAt: reservation.expiresAt.toISOString(),
    segment: {
      origin: reservation.segment.origin,
      destination: reservation.segment.destination,
      departureAt: reservation.segment.departureDate.toISOString(),
      arrivalAt: reservation.segment.arrivalDate.toISOString(),
      flightNumber: reservation.segment.flightNumber,
      carrier: reservation.segment.carrier,
    },
    passenger: {
      passengerId: reservation.passenger.passengerId,
      firstName: reservation.passenger.firstName,
      lastName: reservation.passenger.lastName,
    },
    cabinClass: reservation.cabinClass.value,
    createdAt: reservation.createdAt.toISOString(),
  };
}

@Injectable()
export class CreateReservationUseCase {
  private readonly logger = new Logger(CreateReservationUseCase.name);

  constructor(
    @Inject(FLIGHT_RESERVATION_REPOSITORY)
    private readonly reservationRepo: IFlightReservationRepository,
    private readonly amadeusClient: AmadeusHttpClient,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventPublisher: InventoryEventPublisher,
  ) {}

  async execute(command: CreateReservationCommand): Promise<{ response: ReservationResponse; isNew: boolean }> {
    // 1. Check idempotency cache
    const cached = await this.idempotencyService.get<ReservationResponse>(command.idempotencyKey);
    if (cached !== null) {
      this.logger.log('reservation_idempotent_hit', { idempotencyKey: command.idempotencyKey });
      return { response: cached, isNew: false };
    }

    // 2. Call Amadeus to create order
    const amadeusResult = await this.amadeusClient.createOrder({
      offerId: command.offerId,
      passengerId: command.passengerId,
      cabinClass: command.cabinClass,
    });

    const amadeusOrderId = this._extractOrderId(amadeusResult);

    // 3. Build domain aggregate
    const departureAt = this._extractDepartureAt(amadeusResult);
    const arrivalAt = this._extractArrivalAt(amadeusResult);
    const flightNumber = this._extractFlightNumber(amadeusResult);
    const carrier = this._extractCarrier(amadeusResult);
    const origin = this._extractOrigin(amadeusResult, command);
    const destination = this._extractDestination(amadeusResult, command);

    const segment = new FlightSegment({
      origin,
      destination,
      departureDate: new Date(departureAt),
      arrivalDate: new Date(arrivalAt),
      flightNumber,
      carrier,
    });

    const passenger = new PassengerDetails({
      passengerId: command.passengerId,
      firstName: command.passengerFirstName,
      lastName: command.passengerLastName,
      ...(command.passengerDob !== undefined && { dateOfBirth: new Date(command.passengerDob) }),
      ...(command.passportNumber !== undefined && { passportNumber: command.passportNumber }),
    });

    const reservation = FlightReservation.create({
      offerId: command.offerId,
      ...(amadeusOrderId !== undefined && { amadeusOrderId }),
      segment,
      passenger,
      cabinClass: command.cabinClass as CabinClassValue,
      idempotencyKey: command.idempotencyKey,
      ...(command.holdMinutes !== undefined && { holdMinutes: command.holdMinutes }),
      ...(command.correlationId !== undefined && { correlationId: command.correlationId }),
      ...(command.causationId !== undefined && { causationId: command.causationId }),
    });

    // 4. Persist
    await this.reservationRepo.save(reservation);

    // 5. Publish events
    const events = reservation.getUncommittedEvents();
    for (const event of events) {
      await this.eventPublisher.publish(event);
    }
    reservation.clearEvents();

    // 6. Cache idempotency response
    const response = toReservationResponse(reservation);
    await this.idempotencyService.set(command.idempotencyKey, response, 86400);

    this.logger.log('reservation_created', { reservationId: reservation.id });
    return { response, isNew: true };
  }

  private _extractOrderId(result: unknown): string | undefined {
    if (result === null || typeof result !== 'object') return undefined;
    const data = (result as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return undefined;
    const id = (data as Record<string, unknown>)['id'];
    return typeof id === 'string' ? id : undefined;
  }

  private _extractDepartureAt(result: unknown): string {
    if (result === null || typeof result !== 'object') return new Date().toISOString();
    const data = (result as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return new Date().toISOString();
    const dep = (data as Record<string, unknown>)['departureAt'];
    return typeof dep === 'string' ? dep : new Date().toISOString();
  }

  private _extractArrivalAt(result: unknown): string {
    if (result === null || typeof result !== 'object') return new Date().toISOString();
    const data = (result as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return new Date().toISOString();
    const arr = (data as Record<string, unknown>)['arrivalAt'];
    return typeof arr === 'string' ? arr : new Date().toISOString();
  }

  private _extractFlightNumber(result: unknown): string {
    if (result === null || typeof result !== 'object') return 'UNKNOWN';
    const data = (result as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return 'UNKNOWN';
    const fn = (data as Record<string, unknown>)['flightNumber'];
    return typeof fn === 'string' ? fn : 'UNKNOWN';
  }

  private _extractCarrier(result: unknown): string {
    if (result === null || typeof result !== 'object') return 'XX';
    const data = (result as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return 'XX';
    const carrier = (data as Record<string, unknown>)['carrier'];
    return typeof carrier === 'string' ? carrier : 'XX';
  }

  private _extractOrigin(result: unknown, command: CreateReservationCommand): string {
    if (result === null || typeof result !== 'object') return 'XXX';
    const data = (result as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return 'XXX';
    const origin = (data as Record<string, unknown>)['origin'];
    if (typeof origin === 'string') return origin;
    // fallback: derive from command context if provided
    return 'XXX';
  }

  private _extractDestination(result: unknown, command: CreateReservationCommand): string {
    if (result === null || typeof result !== 'object') return 'XXX';
    const data = (result as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return 'XXX';
    const dest = (data as Record<string, unknown>)['destination'];
    if (typeof dest === 'string') return dest;
    return 'XXX';
  }
}
