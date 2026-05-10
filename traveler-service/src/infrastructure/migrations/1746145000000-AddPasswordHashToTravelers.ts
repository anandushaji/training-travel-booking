import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordHashToTravelers1746145000000 implements MigrationInterface {
  name = 'AddPasswordHashToTravelers1746145000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "travelers"
        ADD COLUMN IF NOT EXISTS "password_hash" varchar(255) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "travelers"
        DROP COLUMN IF EXISTS "password_hash"
    `);
  }
}
