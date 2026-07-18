import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBankAndTransactionIdToDonations1760000000022 implements MigrationInterface {
  name = "AddBankAndTransactionIdToDonations1760000000022";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "donations"
            ADD COLUMN IF NOT EXISTS "bank" character varying,
            ADD COLUMN IF NOT EXISTS "transaction_id" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "donations"
            DROP COLUMN IF EXISTS "transaction_id",
            DROP COLUMN IF EXISTS "bank"
        `);
  }
}
