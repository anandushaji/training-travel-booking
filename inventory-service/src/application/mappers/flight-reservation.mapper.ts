import * as crypto from 'crypto';
import { FlightReservation, FlightReservationProps } from '../../domain/aggregates/flight-reservation.aggregate';
import { FlightReservationTypeOrmEntity } from '../../infrastructure/persistence/entities/flight-reservation.typeorm-entity';
import { FlightSegment } from '../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../domain/value-objects/passenger-details.value-object';
import { ReservationStatus } from '../../domain/value-objects/reservation-status.value-object';
import { CabinClass, CabinClassValue } from '../../domain/value-objects/cabin-class.value-object';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string, key: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0]!, 'hex');
  const encryptedText = Buffer.from(parts[1]!, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export class FlightReservationMapper {
  static toDomain(entity: FlightReservationTypeOrmEntity, encryptionKey: string): FlightReservation {
    const segment = new FlightSegment({
      origin: entity.origin.trim(),
      destination: entity.destination.trim(),
      departureDate: entity.departureAt,
      arrivalDate: entity.arrivalAt,
      flightNumber: entity.flightNumber,
      carrier: entity.carrier,
    });

    const passenger = new PassengerDetails({
      passengerId: entity.passengerId,
      firstName: entity.passengerFirstName,
      lastName: entity.passengerLastName,
      ...(entity.passengerDob !== null && { dateOfBirth: entity.passengerDob }),
      ...(entity.passportNumber !== null && {
        passportNumber: decrypt(entity.passportNumber, encryptionKey),
      }),
    });

    const props: FlightReservationProps = {
      id: entity.id,
      offerId: entity.offerId,
      amadeusOrderId: entity.amadeusOrderId,
      segment,
      passenger,
      status: new ReservationStatus(entity.status as ReservationStatus['value']),
      cabinClass: new CabinClass(entity.cabinClass as CabinClassValue),
      idempotencyKey: entity.idempotencyKey,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    const reservation = new FlightReservation(props);
    return reservation;
  }

  static toPersistence(
    reservation: FlightReservation,
    encryptionKey: string,
  ): FlightReservationTypeOrmEntity {
    const entity = new FlightReservationTypeOrmEntity();
    entity.id = reservation.id;
    entity.offerId = reservation.offerId;
    entity.amadeusOrderId = reservation.amadeusOrderId;
    entity.passengerId = reservation.passenger.passengerId;
    entity.passengerFirstName = reservation.passenger.firstName;
    entity.passengerLastName = reservation.passenger.lastName;
    entity.passengerDob = reservation.passenger.dateOfBirth ?? null;
    entity.passportNumber =
      reservation.passenger.passportNumber !== undefined
        ? encrypt(reservation.passenger.passportNumber, encryptionKey)
        : null;
    entity.origin = reservation.segment.origin;
    entity.destination = reservation.segment.destination;
    entity.flightNumber = reservation.segment.flightNumber;
    entity.carrier = reservation.segment.carrier;
    entity.departureAt = reservation.segment.departureDate;
    entity.arrivalAt = reservation.segment.arrivalDate;
    entity.cabinClass = reservation.cabinClass.value;
    entity.status = reservation.status.value;
    entity.idempotencyKey = reservation.idempotencyKey;
    entity.expiresAt = reservation.expiresAt;
    entity.createdAt = reservation.createdAt;
    entity.updatedAt = reservation.updatedAt;
    return entity;
  }

  static updateEntity(
    entity: FlightReservationTypeOrmEntity,
    reservation: FlightReservation,
  ): void {
    entity.status = reservation.status.value;
    entity.amadeusOrderId = reservation.amadeusOrderId;
    entity.updatedAt = reservation.updatedAt;
  }
}
