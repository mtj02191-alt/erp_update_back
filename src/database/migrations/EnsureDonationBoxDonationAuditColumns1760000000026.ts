import { MigrationInterface, QueryRunner } from "typeorm";

export class EnsureDonationBoxDonationAuditColumns1760000000026
  implements MigrationInterface
{
  name = "EnsureDonationBoxDonationAuditColumns1760000000026";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donation_box_donations"
      ADD COLUMN IF NOT EXISTS "created_by" integer,
      ADD COLUMN IF NOT EXISTS "updated_by" integer
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_donation_box_donations_created_by'
        ) THEN
          ALTER TABLE "donation_box_donations"
          ADD CONSTRAINT "FK_donation_box_donations_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_donation_box_donations_updated_by'
        ) THEN
          ALTER TABLE "donation_box_donations"
          ADD CONSTRAINT "FK_donation_box_donations_updated_by"
          FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donation_box_donations"
      DROP CONSTRAINT IF EXISTS "FK_donation_box_donations_updated_by",
      DROP CONSTRAINT IF EXISTS "FK_donation_box_donations_created_by",
      DROP COLUMN IF EXISTS "updated_by",
      DROP COLUMN IF EXISTS "created_by"
    `);
  }
}
