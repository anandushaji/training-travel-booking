import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePolicyTables1746000000000 implements MigrationInterface {
  name = 'CreatePolicyTables1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS policy_service`);

    await queryRunner.query(`SET search_path TO policy_service`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "travel_policies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "department" character varying(100) NOT NULL,
        "rules" jsonb NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_by" character varying(255) NOT NULL,
        "version" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_travel_policies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_travel_policies_name_department" UNIQUE ("name", "department")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_travel_policies_name" ON "travel_policies" ("name")`);
    await queryRunner.query(`CREATE INDEX "idx_travel_policies_department" ON "travel_policies" ("department")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departmental_budgets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "department" character varying(100) NOT NULL,
        "fiscal_year" integer NOT NULL,
        "total_budget" numeric(15,2) NOT NULL,
        "spent" numeric(15,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL,
        "q1_budget" numeric(15,2),
        "q2_budget" numeric(15,2),
        "q3_budget" numeric(15,2),
        "q4_budget" numeric(15,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departmental_budgets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dept_budgets_dept_year" UNIQUE ("department", "fiscal_year")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_dept_budgets_department" ON "departmental_budgets" ("department")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "policy_violations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "policy_id" uuid,
        "traveler_id" uuid NOT NULL,
        "booking_ref" character varying(255),
        "violations" jsonb NOT NULL,
        "requires_approval" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_policy_violations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policy_violations_policy" FOREIGN KEY ("policy_id")
          REFERENCES "travel_policies"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_policy_violations_policy_id" ON "policy_violations" ("policy_id")`);
    await queryRunner.query(`CREATE INDEX "idx_policy_violations_traveler_id" ON "policy_violations" ("traveler_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET search_path TO policy_service`);
    await queryRunner.query(`DROP TABLE IF EXISTS "policy_violations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departmental_budgets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "travel_policies"`);
  }
}
