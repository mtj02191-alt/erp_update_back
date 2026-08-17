import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDonationBoxDonationAuditLogs1760000000027
  implements MigrationInterface
{
  name = "CreateDonationBoxDonationAuditLogs1760000000027";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "donation_box_donation_audit_logs" (
        "id" SERIAL NOT NULL,
        "donation_box_donation_id" integer,
        "action" character varying(40) NOT NULL,
        "source" character varying(40) NOT NULL,
        "changes" jsonb NOT NULL DEFAULT '[]',
        "performed_by_id" integer,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_donation_box_donation_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_db_donation_audit_logs_record"
          FOREIGN KEY ("donation_box_donation_id")
          REFERENCES "donation_box_donations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_db_donation_audit_logs_performed_by"
          FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_db_donation_audit_logs_record_id"
      ON "donation_box_donation_audit_logs" ("donation_box_donation_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_db_donation_audit_logs_created_at"
      ON "donation_box_donation_audit_logs" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "donation_box_donation_audit_logs"`,
    );
  }
}
