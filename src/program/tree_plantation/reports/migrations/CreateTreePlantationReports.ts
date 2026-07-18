import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTreePlantationReports1700000009999 implements MigrationInterface {
  name = "CreateTreePlantationReports1700000009999";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tree_plantation_reports" (
        "id" SERIAL PRIMARY KEY,
        "report_date" DATE NOT NULL,
        "school_name" VARCHAR(255) NOT NULL,
        "plants" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tree_plantation_reports"');
  }
}
