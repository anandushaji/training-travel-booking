import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('booking_read_model')
export class BookingReadModelEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'traveler_id', type: 'uuid' })
  @Index('idx_read_model_traveler')
  travelerId!: string;

  @Column({ name: 'traveler_name', type: 'varchar', length: 255, nullable: true })
  travelerName!: string | null;

  @Column({ name: 'traveler_email', type: 'varchar', length: 255, nullable: true })
  travelerEmail!: string | null;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_read_model_status')
  status!: string;

  @Column({ type: 'varchar', length: 3 })
  origin!: string;

  @Column({ type: 'varchar', length: 3 })
  destination!: string;

  @Column({ name: 'departure_date', type: 'date' })
  @Index('idx_read_model_dates')
  departureDate!: string;

  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate!: string | null;

  @Column({ name: 'cabin_class', type: 'varchar', length: 50, nullable: true })
  cabinClass!: string | null;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
