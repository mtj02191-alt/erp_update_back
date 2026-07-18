import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAreaRationReports1700000010000 implements MigrationInterface {
  name = "CreateAreaRationReports1700000010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "area_ration_reports" (
        "id" SERIAL PRIMARY KEY,
        "report_date" DATE NOT NULL,
        "province" VARCHAR(255) NOT NULL,
        "district" VARCHAR(255) NOT NULL,
        "city" VARCHAR(255) NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "area_ration_reports"');
  }
}
