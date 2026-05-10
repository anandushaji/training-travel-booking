import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'traveler_id', type: 'uuid' })
  @Index('idx_bookings_traveler_id')
  travelerId!: string;

  @Column({ name: 'offer_id', type: 'varchar', length: 255 })
  offerId!: string;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_bookings_status')
  status!: string;

  @Column({ type: 'jsonb' })
  itinerary!: Record<string, unknown>;

  @Column({ name: 'policy_validation_id', type: 'uuid', nullable: true })
  policyValidationId!: string | null;

  @Column({ name: 'reservation_id', type: 'varchar', length: 255, nullable: true })
  reservationId!: string | null;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests!: string | null;

  @Column({ name: 'traveler_name', type: 'varchar', length: 255, nullable: true })
  travelerName!: string | null;

  @Column({ name: 'traveler_email', type: 'varchar', length: 255, nullable: true })
  travelerEmail!: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason!: string | null;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index('idx_bookings_created_at')
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
