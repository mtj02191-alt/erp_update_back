import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetFields1700000000015 implements MigrationInterface {
  name = "AddPasswordResetFields1700000000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "resetToken" character varying,
            ADD COLUMN "resetTokenExpiry" TIMESTAMP
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "resetToken",
            DROP COLUMN "resetTokenExpiry"
        `);
  }
}
