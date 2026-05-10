import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1714600000000 implements MigrationInterface {
  name = 'CreatePaymentsTable1714600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS payment_service`);

    await queryRunner.query(`
      CREATE TABLE payment_service.payments (
        id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        traveler_id             UUID          NOT NULL,
        booking_id              UUID          NOT NULL,
        payment_method_id       UUID          NOT NULL,
        amount                  NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        currency                VARCHAR(3)    NOT NULL,
        status                  VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
        stripe_payment_intent_id VARCHAR(255) NULL,
        idempotency_key         VARCHAR(255)  NOT NULL UNIQUE,
        description             TEXT          NULL,
        failure_reason          TEXT          NULL,
        captured_amount         NUMERIC(12,2) NULL,
        refunded_amount         NUMERIC(12,2) NULL,
        created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_payments_traveler_id ON payment_service.payments(traveler_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payments_booking_id ON payment_service.payments(booking_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payments_status ON payment_service.payments(status)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_payments_idempotency_key ON payment_service.payments(idempotency_key)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS payment_service.idx_payments_idempotency_key`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS payment_service.idx_payments_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS payment_service.idx_payments_booking_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS payment_service.idx_payments_traveler_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS payment_service.payments`);
  }
}
