import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('payments')
export class PaymentTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'traveler_id', type: 'uuid' })
  @Index('idx_payments_traveler_id')
  travelerId!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  @Index('idx_payments_booking_id')
  bookingId!: string;

  @Column({ name: 'payment_method_id', type: 'uuid' })
  paymentMethodId!: string;

  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  currency!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'PENDING' })
  @Index('idx_payments_status')
  status!: string;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true })
  @Index('idx_payments_idempotency_key', { unique: true })
  idempotencyKey!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'captured_amount', type: 'numeric', precision: 12, scale: 2, nullable: true })
  capturedAmount!: string | null;

  @Column({ name: 'refunded_amount', type: 'numeric', precision: 12, scale: 2, nullable: true })
  refundedAmount!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
