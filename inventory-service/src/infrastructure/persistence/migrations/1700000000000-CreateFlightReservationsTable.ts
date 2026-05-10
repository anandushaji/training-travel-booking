import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlightReservationsTable1700000000000 implements MigrationInterface {
  name = 'CreateFlightReservationsTable1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED')
    `);

    await queryRunner.query(`
      CREATE TABLE flight_reservations (
        id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id              VARCHAR(64) NOT NULL,
        amadeus_order_id      VARCHAR(64),
        passenger_id          UUID        NOT NULL,
        passenger_first_name  VARCHAR(128) NOT NULL,
        passenger_last_name   VARCHAR(128) NOT NULL,
        passenger_dob         DATE,
        passport_number       TEXT,
        origin                CHAR(3)     NOT NULL,
        destination           CHAR(3)     NOT NULL,
        flight_number         VARCHAR(16) NOT NULL,
        carrier               VARCHAR(4)  NOT NULL,
        departure_at          TIMESTAMPTZ NOT NULL,
        arrival_at            TIMESTAMPTZ NOT NULL,
        cabin_class           VARCHAR(20) NOT NULL,
        status                reservation_status NOT NULL DEFAULT 'PENDING',
        idempotency_key       VARCHAR(36) NOT NULL UNIQUE,
        expires_at            TIMESTAMPTZ NOT NULL,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_fr_status_expires ON flight_reservations (status, expires_at)
        WHERE status = 'PENDING'
    `);

    await queryRunner.query(`
      CREATE INDEX idx_fr_passenger ON flight_reservations (passenger_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_fr_idempotency ON flight_reservations (idempotency_key)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fr_idempotency`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fr_passenger`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fr_status_expires`);
    await queryRunner.query(`DROP TABLE IF EXISTS flight_reservations`);
    await queryRunner.query(`DROP TYPE IF EXISTS reservation_status`);
  }
}
