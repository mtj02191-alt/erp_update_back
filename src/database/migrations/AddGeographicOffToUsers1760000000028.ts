import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGeographicOffToUsers1760000000028 implements MigrationInterface {
  name = "AddGeographicOffToUsers1760000000028";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "geographic_off" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "geographic_off"
    `);
  }
}
