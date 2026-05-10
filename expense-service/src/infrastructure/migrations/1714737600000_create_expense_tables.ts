import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpenseTables1714737600000 implements MigrationInterface {
  name = 'CreateExpenseTables1714737600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receipts" (
        "id"             UUID        NOT NULL,
        "receipt_number" VARCHAR     NOT NULL UNIQUE,
        "booking_id"     VARCHAR     NOT NULL UNIQUE,
        "traveler_id"    VARCHAR     NOT NULL,
        "traveler_name"  VARCHAR     NOT NULL,
        "traveler_email" VARCHAR     NOT NULL,
        "amount"         DECIMAL(12,2) NOT NULL,
        "currency"       CHAR(3)     NOT NULL DEFAULT 'USD',
        "origin"         VARCHAR     NOT NULL,
        "destination"    VARCHAR     NOT NULL,
        "departure_date" DATE        NOT NULL,
        "status"         VARCHAR     NOT NULL DEFAULT 'ACTIVE',
        "generated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "voided_at"      TIMESTAMPTZ,
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_receipts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expenses" (
        "id"           UUID        NOT NULL,
        "booking_id"   VARCHAR     NOT NULL UNIQUE,
        "receipt_id"   UUID        NOT NULL,
        "traveler_id"  VARCHAR     NOT NULL,
        "traveler_name" VARCHAR    NOT NULL,
        "amount"       DECIMAL(12,2) NOT NULL,
        "currency"     CHAR(3)     NOT NULL DEFAULT 'USD',
        "category"     VARCHAR     NOT NULL DEFAULT 'FLIGHT',
        "description"  VARCHAR     NOT NULL DEFAULT 'Travel expense',
        "expense_date" DATE        NOT NULL,
        "status"       VARCHAR     NOT NULL DEFAULT 'ACTIVE',
        "cancelled_at" TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expenses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense_reports" (
        "id"          UUID        NOT NULL,
        "traveler_id" VARCHAR     NOT NULL,
        "fiscal_year" INTEGER     NOT NULL,
        "payload"     JSONB       NOT NULL DEFAULT '{}',
        "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_reports" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_events" (
        "event_id"     VARCHAR     NOT NULL,
        "event_type"   VARCHAR     NOT NULL,
        "processed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_processed_events" PRIMARY KEY ("event_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "receipts"`);
  }
}
