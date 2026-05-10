import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTravelersTable1746144000000 implements MigrationInterface {
  name = 'CreateTravelersTable1746144000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "travelers" (
        "id"            uuid          NOT NULL,
        "employee_id"   varchar(50)   NOT NULL,
        "name"          varchar(255)  NOT NULL,
        "email"         varchar(320)  NOT NULL,
        "department"    varchar(100)  NOT NULL,
        "role"          varchar(20)   NOT NULL,
        "preferences"   jsonb         NOT NULL DEFAULT '{}',
        "deleted_at"    timestamptz,
        "anonymised_at" timestamptz,
        "version"       integer       NOT NULL DEFAULT 0,
        "created_at"    timestamptz   NOT NULL DEFAULT now(),
        "updated_at"    timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_travelers" PRIMARY KEY ("id"),
        CONSTRAINT "uq_travelers_employee_id" UNIQUE ("employee_id"),
        CONSTRAINT "uq_travelers_email" UNIQUE ("email"),
        CONSTRAINT "chk_travelers_role"
          CHECK ("role" IN ('EMPLOYEE', 'MANAGER', 'ADMIN'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_travelers_deleted_at"
        ON "travelers" ("id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_travelers_role"
        ON "travelers" ("role")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_travelers_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_travelers_deleted_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "travelers"`);
  }
}
