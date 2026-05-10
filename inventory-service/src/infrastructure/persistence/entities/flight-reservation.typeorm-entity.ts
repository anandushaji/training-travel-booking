import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('flight_reservations')
export class FlightReservationTypeOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'offer_id', type: 'varchar', length: 64 })
  offerId!: string;

  @Column({ name: 'amadeus_order_id', type: 'varchar', length: 64, nullable: true })
  amadeusOrderId!: string | null;

  @Column({ name: 'passenger_id', type: 'uuid' })
  passengerId!: string;

  @Column({ name: 'passenger_first_name', type: 'varchar', length: 128 })
  passengerFirstName!: string;

  @Column({ name: 'passenger_last_name', type: 'varchar', length: 128 })
  passengerLastName!: string;

  @Column({ name: 'passenger_dob', type: 'date', nullable: true })
  passengerDob!: Date | null;

  @Column({ name: 'passport_number', type: 'text', nullable: true })
  passportNumber!: string | null;

  @Column({ name: 'origin', type: 'char', length: 3 })
  origin!: string;

  @Column({ name: 'destination', type: 'char', length: 3 })
  destination!: string;

  @Column({ name: 'flight_number', type: 'varchar', length: 16 })
  flightNumber!: string;

  @Column({ name: 'carrier', type: 'varchar', length: 4 })
  carrier!: string;

  @Column({ name: 'departure_at', type: 'timestamptz' })
  departureAt!: Date;

  @Column({ name: 'arrival_at', type: 'timestamptz' })
  arrivalAt!: Date;

  @Column({ name: 'cabin_class', type: 'varchar', length: 20 })
  cabinClass!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING',
  })
  status!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 36, unique: true })
  idempotencyKey!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
