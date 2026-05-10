import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentMethodsTable1714600000001 implements MigrationInterface {
  name = 'CreatePaymentMethodsTable1714600000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS payment_service`);

    await queryRunner.query(`
      CREATE TABLE payment_service.payment_methods (
        id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        traveler_id     UUID          NOT NULL,
        stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
        card_brand      VARCHAR(20)   NOT NULL,
        last4           CHAR(4)       NOT NULL,
        expiry_month    SMALLINT      NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
        expiry_year     SMALLINT      NOT NULL,
        is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_payment_methods_traveler_id ON payment_service.payment_methods(traveler_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payment_methods_active ON payment_service.payment_methods(is_active)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS payment_service.idx_payment_methods_active`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS payment_service.idx_payment_methods_traveler_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS payment_service.payment_methods`);
  }
}
