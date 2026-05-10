import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingTables1700000000000 implements MigrationInterface {
  name = 'CreateBookingTables1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS booking_service`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_service.bookings (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        traveler_id           UUID NOT NULL,
        offer_id              VARCHAR(255) NOT NULL,
        status                VARCHAR(50) NOT NULL,
        itinerary             JSONB NOT NULL,
        policy_validation_id  UUID,
        reservation_id        VARCHAR(255),
        payment_id            UUID,
        total_amount          DECIMAL(10,2) NOT NULL,
        currency              VARCHAR(3) NOT NULL DEFAULT 'USD',
        special_requests      TEXT,
        traveler_name         VARCHAR(255),
        traveler_email        VARCHAR(255),
        confirmed_at          TIMESTAMPTZ,
        cancelled_at          TIMESTAMPTZ,
        cancel_reason         TEXT,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version               INT NOT NULL DEFAULT 1,
        CONSTRAINT chk_status CHECK (
          status IN ('PENDING','RESERVED','PAYMENT_PROCESSING','CONFIRMED','CANCELLED','FAILED')
        )
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bookings_traveler_id ON booking_service.bookings(traveler_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON booking_service.bookings(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON booking_service.bookings(created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_service.booking_sagas (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id   UUID NOT NULL REFERENCES booking_service.bookings(id),
        status       VARCHAR(50) NOT NULL,
        current_step INT NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_saga_status CHECK (
          status IN ('STARTED','IN_PROGRESS','COMPLETED','COMPENSATING','COMPENSATED','COMPENSATED_WITH_ERRORS','FAILED')
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_service.booking_saga_steps (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        saga_id       UUID NOT NULL REFERENCES booking_service.booking_sagas(id),
        step_number   INT NOT NULL,
        step_name     VARCHAR(100) NOT NULL,
        status        VARCHAR(50) NOT NULL,
        started_at    TIMESTAMPTZ,
        completed_at  TIMESTAMPTZ,
        error_message TEXT,
        retry_count   INT NOT NULL DEFAULT 0,
        CONSTRAINT chk_step_status CHECK (
          status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','COMPENSATING','COMPENSATED')
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_service.event_store (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        aggregate_id   UUID NOT NULL,
        aggregate_type VARCHAR(100) NOT NULL,
        event_type     VARCHAR(100) NOT NULL,
        event_data     JSONB NOT NULL,
        event_version  INT NOT NULL,
        occurred_on    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        correlation_id UUID,
        causation_id   UUID
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_store_aggregate ON booking_service.event_store(aggregate_id, event_version)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_store_type ON booking_service.event_store(event_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_store_correlation ON booking_service.event_store(correlation_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_service.booking_read_model (
        id              UUID PRIMARY KEY,
        traveler_id     UUID NOT NULL,
        traveler_name   VARCHAR(255),
        traveler_email  VARCHAR(255),
        status          VARCHAR(50) NOT NULL,
        origin          VARCHAR(3) NOT NULL,
        destination     VARCHAR(3) NOT NULL,
        departure_date  DATE NOT NULL,
        return_date     DATE,
        cabin_class     VARCHAR(50),
        total_amount    DECIMAL(10,2) NOT NULL,
        currency        VARCHAR(3) NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_read_model_traveler ON booking_service.booking_read_model(traveler_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_read_model_status ON booking_service.booking_read_model(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_read_model_dates ON booking_service.booking_read_model(departure_date)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS booking_service.booking_read_model`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_service.event_store`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_service.booking_saga_steps`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_service.booking_sagas`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_service.bookings`);
  }
}
